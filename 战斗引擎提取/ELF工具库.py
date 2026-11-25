import sys, json, os
from elftools.elf.elffile import ELFFile
from elftools.elf.dynamic import DynamicSection
from capstone import Cs, CS_ARCH_ARM64, CS_MODE_ARM

脚本目录 = os.path.dirname(os.path.abspath(__file__))
根目录 = 脚本目录 + '/'

def 加载ELF(文件名):
    文件 = open(根目录 + 文件名, 'rb')
    return ELFFile(文件), 文件

def 动态段信息(ELF文件):
    结果 = {}
    for 节 in ELF文件.iter_sections():
        if isinstance(节, DynamicSection):
            for 标签 in 节.iter_tags():
                结果.setdefault(标签.entry.d_tag, []).append(标签.entry.d_val)
    return 结果

def 提取符号(ELF文件):
    结果 = []
    for 节 in ELF文件.iter_sections():
        if 节.header.sh_type in ('SHT_DYNSYM', 'SHT_SYMTAB'):
            for 符号 in 节.iter_symbols():
                结果.append(dict(名称=符号.name, 值=符号.entry.st_value, 大小=符号.entry.st_size,
                        信息=符号.entry.st_info.type, 节索引=符号.entry.st_shndx))
    return 结果

def 启动进度心跳(模拟器, IL2CPP基址=None, 映像结束偏移=0, 间隔秒=60, 已写页集=None, 写入摘要=None):
    """用独立守护线程周期采样进度；不安装任何模拟钩子，故对模拟速度零影响。已写页集/写入摘要由阶段2的写入钩子提供，是解密进度的精确指标；缺省时退化为按页首指令特征的粗粒度代理指标。"""
    import threading, time, struct, json
    起始时刻 = time.time()
    心跳路径 = os.path.join(脚本目录, '进度.json')
    已扫页号 = [0]
    已解密页累计 = [0]
    页大小 = 0x1000
    # 无写入钩子时的退路：以"页内首4字节构成合法ARM64指令序言/返回"作粗粒度代理指标，仅用于趋势观察不作正确性判据
    def 疑似已解密(页字节):
        字 = struct.unpack_from('<I', 页字节, 0)[0]
        return 字 == 0xd65f03c0 or (字 & 0xff000000) == 0xa9000000 or (字 & 0x7f000000) == 0x14000000 or (字 & 0xff800000) == 0xd1000000
    def 心跳():
        while True:
            time.sleep(间隔秒)
            经过秒 = time.time() - 起始时刻
            信息 = {'已耗时秒': round(经过秒), '当前PC': None}
            try:
                信息['当前PC'] = hex(模拟器.reg_read(0x11a))  # UC_ARM64_REG_PC
            except Exception:
                pass
            总页 = 映像结束偏移 // 页大小 if 映像结束偏移 else 0
            if 已写页集 is not None and 总页:
                信息.update({'已写页数': len(已写页集), '总页数': 总页, '写入次数': 写入摘要['次数'] if 写入摘要 else None,
                             '最小偏移': hex(写入摘要['最小偏移']) if 写入摘要 else None, '最大偏移': hex(写入摘要['最大偏移']) if 写入摘要 else None})
                print(f"[进度] 已耗时 {经过秒/60:.1f} 分钟 | 已写 {len(已写页集)}/{总页} 页 ({len(已写页集)*100//总页}%) | 写入 {信息['写入次数']:,} 次"
                      + (f" | PC={信息['当前PC']}" if 信息['当前PC'] else ''), flush=True)
            elif IL2CPP基址 is not None and 总页:
                # 增量扫描：每个心跳只扫一批新页并累计，避免每次重扫87MB造成CPU与内存带宽浪费
                起 = 已扫页号[0]
                for 页 in range(起, min(起 + 512, 总页)):
                    try:
                        if 疑似已解密(bytes(模拟器.mem_read(IL2CPP基址 + 页 * 页大小, 4))):
                            已解密页累计[0] += 1
                    except Exception:
                        pass
                已扫页号[0] = min(起 + 512, 总页)
                信息.update({'疑似已解密页': 已解密页累计[0], '已扫描页': 已扫页号[0], '总页数': 总页})
                print(f"[进度] 已耗时 {经过秒/60:.1f} 分钟 | 已扫描 {已扫页号[0]}/{总页} 页 | 疑似已解密 {已解密页累计[0]} 页"
                      + (f" | PC={信息['当前PC']}" if 信息['当前PC'] else ''), flush=True)
            else:
                print(f"[进度] 已耗时 {经过秒/60:.1f} 分钟" + (f" | PC={信息['当前PC']}" if 信息['当前PC'] else ''), flush=True)
            try:
                with open(心跳路径, 'w', encoding='utf-8') as 输出:
                    json.dump(信息, 输出, ensure_ascii=False)
            except OSError:
                pass
    线程 = threading.Thread(target=心跳, daemon=True)
    线程.start()
    return 线程

def 反汇编(机器码, 虚拟地址, 最大条数=200, 基地址=0):
    反汇编器 = Cs(CS_ARCH_ARM64, CS_MODE_ARM)
    反汇编器.detail = False
    结果 = []
    for 指令 in 反汇编器.disasm(机器码, 虚拟地址):
        结果.append(f'0x{指令.address:x}: {指令.mnemonic}\t{指令.op_str}')
        if len(结果) >= 最大条数: break
    return 结果

# ---- 子进程守护：Windows 作业对象（Job Object）设为关闭即终止，本进程无论正常退出还是被强杀，内核都会自动终止作业内的全部子进程及其后代，杜绝孤儿模拟进程 ----
def _创建守护作业():
    import ctypes
    from ctypes import wintypes
    class 基本限制信息(ctypes.Structure):
        _fields_ = [('每进程用户时间上限', ctypes.c_int64), ('作业用户时间上限', ctypes.c_int64), ('限制标志', wintypes.DWORD),
                    ('最小工作集', ctypes.c_size_t), ('最大工作集', ctypes.c_size_t), ('活动进程上限', wintypes.DWORD),
                    ('亲和性', ctypes.c_size_t), ('优先级类', wintypes.DWORD), ('调度类', wintypes.DWORD)]
    class IO计数器(ctypes.Structure):
        _fields_ = [(名, ctypes.c_uint64) for 名 in ('读次数', '写次数', '其它次数', '读字节', '写字节', '其它字节')]
    class 扩展限制信息(ctypes.Structure):
        _fields_ = [('基本', 基本限制信息), ('IO', IO计数器), ('进程内存上限', ctypes.c_size_t), ('作业内存上限', ctypes.c_size_t), ('峰值进程内存', ctypes.c_size_t), ('峰值作业内存', ctypes.c_size_t)]
    内核 = ctypes.windll.kernel32
    作业 = 内核.CreateJobObjectW(None, None)
    if not 作业: return None
    信息 = 扩展限制信息()
    信息.基本.限制标志 = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    if not 内核.SetInformationJobObject(作业, 9, ctypes.byref(信息), ctypes.sizeof(信息)):  # 9 = JobObjectExtendedLimitInformation
        内核.CloseHandle(作业)
        return None
    return 作业

def 运行子进程(命令, timeout=None, **关键字参数):
    """subprocess.run 的替代：Windows 下把子进程放入关闭即终止的作业，本进程死亡（含被强杀、超时后自杀）时子进程及其后代随内核自动终止；其它平台退回 subprocess.run。"""
    import subprocess
    if os.name != 'nt':
        return subprocess.run(命令, timeout=timeout, **关键字参数)
    import ctypes
    if 关键字参数.pop('capture_output', False):
        关键字参数['stdout'] = subprocess.PIPE
        关键字参数['stderr'] = subprocess.PIPE
    作业 = _创建守护作业()
    进程 = subprocess.Popen(命令, **关键字参数)
    if 作业:
        ctypes.windll.kernel32.AssignProcessToJobObject(作业, int(进程._handle))
    try:
        标准输出, 标准错误 = 进程.communicate(timeout=timeout)
    except BaseException:
        进程.kill()
        进程.wait()
        raise
    finally:
        if 作业: ctypes.windll.kernel32.CloseHandle(作业)
    return subprocess.CompletedProcess(命令, 进程.returncode, 标准输出, 标准错误)

if __name__ == '__main__':
    文件名 = sys.argv[1] if len(sys.argv) > 1 else 'libcompatible.so'
    ELF文件, 文件 = 加载ELF(文件名)
    动态信息 = 动态段信息(ELF文件)
    print('== dynamic tags ==')
    for 标签名 in sorted(动态信息):
        print(标签名, [hex(值) for 值 in 动态信息[标签名]])
    符号列表 = 提取符号(ELF文件)
    有名字的符号 = [项 for 项 in 符号列表 if 项['名称']]
    print(f'== symbols total {len(符号列表)} named {len(有名字的符号)} ==')
    for 项 in 有名字的符号:
        print(f"{项['名称']} @0x{项['值']:x} size={项['大小']} {项['信息']} shndx={项['节索引']}")
    json.dump(有名字的符号, open(os.path.join(脚本目录, f'{文件名}.符号.json'), 'w'))
    # segments
    print('== segments ==')
    for 段 in ELF文件.iter_segments():
        print(段.header.p_type, hex(段.header.p_offset), hex(段.header.p_vaddr), hex(段.header.p_filesz), hex(段.header.p_memsz), 段.header.p_flags)