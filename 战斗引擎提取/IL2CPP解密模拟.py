# 阶段2：DT_INIT 完成后，加载 libil2cpp.so 并执行其 DT_INIT 桩 → SoLibraryStart 解密本体
import struct, sys, os, runpy
from unicorn import UcError
from unicorn.arm64_const import *

本目录 = os.path.dirname(os.path.abspath(__file__))
命名空间 = runpy.run_path(os.path.join(本目录, 'NP自解密模拟.py'))
模拟器 = 命名空间['模拟器']; 基址 = 命名空间['基址']; 栈基址 = 命名空间['栈基址']; 栈大小 = 命名空间['栈大小']
返回地址 = 命名空间['返回地址']; 兼容库ELF = 命名空间['ELF文件']
# runpy 返回的是 globals 副本；钩子函数的真实 globals 要从函数对象取，替换日志才能生效
真实全局表 = 命名空间['中断钩子'].__globals__
# 重新打开日志（emu2 末尾关闭了）
日志 = open(os.path.join(本目录, '阶段2追踪.txt'), 'w', buffering=1)
真实全局表['日志'] = 日志
目标日志 = open(os.path.join(本目录, '目标处理日志.txt'), 'w', buffering=1)
def 读取全局(偏移):
    return struct.unpack('<Q', bytes(模拟器.mem_read(基址 + 偏移, 8)))[0]

标志 = 读取全局(0x1b1020)
真实函数槽 = 读取全局(0x1b2bf8)
print(f'init flag [0x1b1020]={标志:#x}  real SoLibraryStart fn [0x1b2bf8]={真实函数槽:#x}')
# 注意：这两个槽位可能由 SoLibraryStart 内部的懒初始化(0x9c5a0)填充，DT_INIT 只负责解密 NP 自身代码，不强制要求非零

# DT_INIT 末尾 NP 会重加密自身代码；从模幂快照恢复时保留其中的实时NP代码状态
明文文件路径 = os.path.join(本目录, '兼容库明文.bin')
if os.environ.get('续跑模式') != '1' and os.path.exists(明文文件路径):
    明文数据 = open(明文文件路径, 'rb').read()
    模拟器.mem_write(基址, 明文数据)
    print('restored decrypted RX segment:', hex(len(明文数据)))
else:
    print('!! no plaintext capture found')

# NP 的 libc 函数指针表 ctx=[0x1b3070] 在 DT_INIT 后仍为 NULL（建表由 Java 层 native init 触发，未模拟）。
# dispatch 桩对空函数指针优雅返回 0/-1，仅 ctx 本身为 NULL 才崩溃。先给一个有效结构让懒初始化推进。
# 用真实语义桩填充已知偏移，其余置 0（优雅降级）。
上下文 = 命名空间['分配内存'](0x400)
if not 上下文:
    raise RuntimeError('模幂快照缺少有效libc上下文，停止以避免错误初始化')
桩地址映射 = 命名空间['桩地址映射']
# 综合猜测映射（NP libc 函数表），用真实语义桩填充；配合 dispatch 日志按崩溃/参数迭代修正
已知函数映射 = {
    0x10: 'open', 0x18: 'close', 0x20: 'read', 0x28: 'write', 0x30: 'lseek', 0x38: 'fstat',
    0xd8: 'pthread_mutex_lock', 0xe0: 'pthread_mutex_unlock', 0xe8: 'pthread_mutex_trylock',
    0x110: 'pthread_rwlock_unlock', 0x118: 'pthread_rwlock_rdlock',
    0x150: 'mmap', 0x168: 'write', 0x258: 'munmap',
}
for 偏移, 名称 in 已知函数映射.items():
    if 名称 in 桩地址映射:
        模拟器.mem_write(上下文 + 偏移, struct.pack('<Q', 桩地址映射[名称]))
模拟器.mem_write(基址 + 0x1b3070, struct.pack('<Q', 上下文))
print('manual ctx @', hex(上下文), 'filled', len(已知函数映射), 'slots')

# scall 对象的两个槽位是真实的寄存器/向量上下文恢复函数；默认保留，只有旧实验明确请求时才替换为通用桩。
调用包装对象 = 基址 + 0x1b32c8
调用包装分发桩 = 命名空间['桩区基址'] + 0xd000
模拟器.mem_write(调用包装分发桩, struct.pack('<I', 0xd65f03c0))
命名空间['桩名称映射'][调用包装分发桩] = '__scall_dispatch'
if os.environ.get('保留调用包装槽位') != '1':
    for 偏移 in (0x98, 0xa0):
        模拟器.mem_write(调用包装对象 + 偏移, struct.pack('<Q', 调用包装分发桩))
    print('scall obj slots -> dispatch stub', hex(调用包装分发桩))
else:
    print('scall obj slots preserved')

# 通用 scall 分发：LR=调用包装器返回地址，据此判定 syscall 类型
def 处理系统调用(引擎):
    链接寄存器 = 引擎.reg_read(UC_ARM64_REG_LR) - 基址
    x = [引擎.reg_read(r) for r in (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_X3, UC_ARM64_REG_X4, UC_ARM64_REG_X5)]
    if os.environ.get('跟踪系统调用') == '1':
        目标日志.write(f'SCALL lr={链接寄存器:#x} args={[hex(v) for v in x]}\n')
    返回值 = 0
    if 链接寄存器 == 0xa7ec4:  # mmap 包装器 0xa7e1c：标准 mmap(addr,len,prot,flags,fd,off)
        if os.environ.get('跟踪分配') == '1':
            目标日志.write(f'MMAP args={[hex(v) for v in x]} heap={命名空间["堆指针"][0]:#x}\\n')
        返回值 = 分配映射(引擎, x[1])
    elif 链接寄存器 == 0x8ddf4:  # 通用 scall 包装器 0x8dda4：w5=主syscall号,w6=备syscall号
        调用号 = x[5] & 0xffffffff
        返回值 = 执行系统调用(引擎, 调用号, x)
    elif 链接寄存器 == 0x18ad70:  # openat(dirfd,path,flags,mode)：此封装将路径放在 x1
        返回值 = 执行系统调用(引擎, 56, x)
    elif 链接寄存器 == 0x8e110:  # lseek(fd,offset,whence)
        返回值 = 执行系统调用(引擎, 62, x)
    elif 链接寄存器 == 0x873c0:  # read(fd,buf,count)
        返回值 = 执行系统调用(引擎, 63, x)
    elif 链接寄存器 == 0x18ab88:  # close(fd)
        返回值 = 执行系统调用(引擎, 57, x)
    elif 链接寄存器 == 0x924e8:  # munmap(addr,length)
        返回值 = 释放映射(引擎, x[0], x[1])
    else:
        # NP 混淆状态机高频经过未识别包装器，逐次写行缓冲日志会造成持续磁盘IO（曾累积数GB）；仅在显式跟踪时记录
        if os.environ.get('跟踪系统调用') == '1':
            分发日志.write(f'SCALL unknown lr={链接寄存器:#x} x0={x[0]:#x} x1={x[1]:#x} x5={x[5]:#x}\n')
            目标日志.write(f'SCALL UNKNOWN lr={链接寄存器:#x} args={[hex(v) for v in x]}\n')
        返回值 = 0
    引擎.reg_write(UC_ARM64_REG_X0, 返回值 & 0xffffffffffffffff)

映射基址 = 0x9000000000
映射下一地址 = [命名空间.get('快照进程状态', {}).get('映射下一地址', 映射基址)]
def 分配映射(引擎, 大小):
    大小 = (大小 + 0xfff) & ~0xfff
    if 大小 == 0:
        return 0
    地址 = 映射下一地址[0]
    引擎.mem_map(地址, 大小)
    映射下一地址[0] += 大小
    return 地址

def 释放映射(引擎, 地址, 大小):
    if 地址 == 0 or 地址 < 映射基址:
        return -22
    大小 = (大小 + 0xfff) & ~0xfff
    目标日志.write(f'RELEASE MAPPING address={地址:#x} size={大小:#x} lr={引擎.reg_read(UC_ARM64_REG_LR)-基址:#x}\n')
    引擎.mem_unmap(地址, 大小)
    return 0

def 执行系统调用(引擎, 调用号, x):
    # 复用 emu2 的 svc 语义：mmap/munmap使用独立虚拟内存区，不侵占NP的malloc堆
    if 调用号 == 222: return 分配映射(引擎, x[1])  # mmap
    if 调用号 == 226:
        if os.environ.get('真实内存权限') == '1':
            引擎.mem_protect(x[0] & ~0xfff, (x[1] + 0xfff) & ~0xfff, x[2])
        return 0  # mprotect
    if 调用号 == 215: return 释放映射(引擎, x[0], x[1])  # munmap
    if 调用号 == 56:  # openat
        p = 命名空间['读取字符串'](x[1]); return 真实全局表['模拟打开'](p)
    if 调用号 == 57:  # close
        命名空间['文件描述符表'].pop(x[0], None); return 0
    if 调用号 == 63:  # read
        文件信息 = 命名空间['文件描述符表'].get(x[0])
        if 文件信息:
            c = 命名空间['文件内容'](文件信息[0]); 数据块 = c[文件信息[1]:文件信息[1]+x[2]]; 文件信息[1] += len(数据块)
            try: 引擎.mem_write(x[1], 数据块)
            except UcError: pass
            if 文件信息[0].endswith('/maps') or 文件信息[0].endswith('/self/maps'):
                目标日志.write(f'MAPS READ fd={x[0]} pos={文件信息[1]} got={len(数据块)} data={数据块[:160]!r}\n')
            if 'global-metadata.dat' in 文件信息[0]:
                目标日志.write(f'METADATA READ fd={x[0]} buffer={x[1]:#x} end={文件信息[1]:#x} got={len(数据块)} head={数据块[:32].hex()} caller={引擎.reg_read(UC_ARM64_REG_LR)-基址:#x}\n')
            return len(数据块)
        return 0
    if 调用号 == 64: return x[2]  # write
    if 调用号 == 172: return 12345  # getpid
    if 调用号 == 178: return 12345  # gettid
    if 调用号 == 217: return 0  # getdents64 空
    if 调用号 == 48:  # faccessat
        p = 命名空间['读取字符串'](x[1]); return 0 if 命名空间['库文件存在'](p) else -2
    if 调用号 == 79:  # fstatat
        p = 命名空间['读取字符串'](x[1])
        try: c = 命名空间['文件内容'](p)
        except FileNotFoundError: return -2  # 路径探测语义：不存在返回 ENOENT；必需库缺失会在 read/lseek 等消费路径直接抛出
        if c: 命名空间['写入文件状态'](x[2], len(c)); return 0
        return -2
    if 调用号 == 62:  # lseek：NP 的 maps 读取器每轮会重新定位到文件头
        文件信息 = 命名空间['文件描述符表'].get(x[0])
        if not 文件信息: return -1
        总长度 = len(命名空间['文件内容'](文件信息[0]))
        if x[2] == 0: 文件信息[1] = x[1]
        elif x[2] == 1: 文件信息[1] += x[1]
        else: 文件信息[1] = 总长度 + x[1]
        return 文件信息[1]
    if 调用号 == 67:  # pread64 不改变文件游标
        文件信息 = 命名空间['文件描述符表'].get(x[0])
        if not 文件信息: return 0
        数据块 = 命名空间['文件内容'](文件信息[0])[x[3]:x[3]+x[2]]
        try: 引擎.mem_write(x[1], 数据块)
        except UcError: pass
        if 文件信息[0].endswith('/maps'):
            目标日志.write(f'MAPS PREAD fd={x[0]} off={x[3]} got={len(数据块)} data={数据块[:160]!r}\n')
        return len(数据块)
    if 调用号 == 117: return 0  # ptrace
    if 调用号 == 167: return 1 if x[0] == 3 else 0  # prctl
    if os.environ.get('跟踪系统调用') == '1':
        分发日志.write(f'SCALL syscall {调用号} unhandled x0={x[0]:#x}\n')
    return 0
真实全局表['处理系统调用'] = 处理系统调用

# dispatch 桩调用日志：记录每个 ctx 偏移的调用参数，用于反推函数语义
from unicorn import UC_HOOK_CODE
分发日志 = open(os.path.join(本目录, '分发日志.txt'), 'w', buffering=1)
分发计数 = [0]
def 分发桩钩子(引擎, 地址, 大小, 用户数据):
    import struct as _s
    w = _s.unpack('<I', bytes(引擎.mem_read(地址, 4)))[0]
    # 仅在 stub 入口（adrp 0x1b3000）记录，避免桩体内每条指令都记
    if (w & 0x9f000000) != 0x90000000: return
    immlo = (w >> 29) & 3; immhi = (w >> 5) & 0x7ffff; imm = (immhi << 2) | immlo
    if imm & 0x100000: imm -= 0x200000
    if (地址 & ~0xfff) + imm * 4096 != 0x1b3000: return
    分发计数[0] += 1
    if 分发计数[0] > 4000: return
    v = 地址 - 基址
    寄存器x0 = 引擎.reg_read(UC_ARM64_REG_X0); 寄存器x1 = 引擎.reg_read(UC_ARM64_REG_X1)
    寄存器x2 = 引擎.reg_read(UC_ARM64_REG_X2); 链接寄存器 = 引擎.reg_read(UC_ARM64_REG_LR)
    偏移 = '?'
    try:
        w3 = _s.unpack_from('<I', bytes(引擎.mem_read(地址 + 8, 4)), 0)[0]
        if (w3 & 0xFFC00000) == 0xF9400000:
            偏移 = hex(((w3 >> 10) & 0xFFF) * 8)
    except Exception: pass
    分发日志.write(f'#{分发计数[0]} stub={v:#x} ctxoff={偏移} x0={寄存器x0:#x} x1={寄存器x1:#x} x2={寄存器x2:#x} lr={链接寄存器-基址:#x}\n')
if os.environ.get('跟踪桩调用') == '1':
    模拟器.hook_add(UC_HOOK_CODE, 分发桩钩子, begin=基址 + 0x107400, end=基址 + 0x107900)

# scall 桩执行追踪：滚动记录最后 300 个块的寄存器，崩溃时转储定位错误跳转
from unicorn import UC_HOOK_BLOCK
from unicorn.arm64_const import (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X8, UC_ARM64_REG_X9,
    UC_ARM64_REG_X16, UC_ARM64_REG_X17, UC_ARM64_REG_X19, UC_ARM64_REG_X20, UC_ARM64_REG_LR, UC_ARM64_REG_PC)
from collections import deque
追踪日志 = open(os.path.join(本目录, '系统调用桩追踪.txt'), 'w', buffering=1)
寄存器环 = deque(maxlen=300)
def 寄存器环钩子(引擎, 地址, 大小, 用户数据):
    r = [引擎.reg_read(x) for x in (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X8, UC_ARM64_REG_X9, UC_ARM64_REG_X16, UC_ARM64_REG_X17, UC_ARM64_REG_X19, UC_ARM64_REG_X20, UC_ARM64_REG_LR)]
    寄存器环.append((地址 - 基址, r))
if os.environ.get('跟踪寄存器环') == '1':
    模拟器.hook_add(UC_HOOK_BLOCK, 寄存器环钩子)
def 转储寄存器环():
    for v, r in 寄存器环:
        追踪日志.write(f'{v:#x}: x0={r[0]:#x} x1={r[1]:#x} x8={r[2]:#x} x9={r[3]:#x} x16={r[4]:#x} x17={r[5]:#x} x19={r[6]:#x} x20={r[7]:#x} lr={r[8]-基址:#x}\n')

# 广域监视：懒初始化期间写入 bss(0x1b0000-0x1c5000) 的代码指针值（找解密器地址）
from unicorn import UC_HOOK_MEM_WRITE
指针写入日志 = open(os.path.join(本目录, '指针写入日志.txt'), 'w', buffering=1)
def BSS指针写入钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
    if 大小 == 8 and 0x10000000 <= 写入值 < 0x101c6000:
        程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC)
        指针写入日志.write(f'[{地址-基址:#x}] = code+{写入值-0x10000000:#x} pc={程序计数器-基址:#x}\n')
if os.environ.get('跟踪状态写入') == '1':
    模拟器.hook_add(UC_HOOK_MEM_WRITE, BSS指针写入钩子, begin=基址 + 0x1b0000, end=基址 + 0x1c5000)

IL2CPP基址 = 0x8000000000
from ELF工具库 import 加载ELF
目标库ELF, f = 加载ELF('libil2cpp.so')
f.seek(0)
文件数据 = f.read()
映像结束偏移 = max(s.header.p_vaddr + s.header.p_memsz for s in 目标库ELF.iter_segments() if s.header.p_type == 'PT_LOAD')
# 连续映射整个镜像（真实 linker 行为），恢复快照已有目标映射时不得重新映射或覆盖其内容
if not any(区域起始 == IL2CPP基址 for 区域起始, 区域结束, 区域权限 in 模拟器.mem_regions()):
    模拟器.mem_map(IL2CPP基址, (映像结束偏移 + 0xfff) & ~0xfff)
    for 段 in 目标库ELF.iter_segments():
        if 段.header.p_type != 'PT_LOAD': continue
        段虚拟地址, 段内存大小, 段文件大小, 段文件偏移 = 段.header.p_vaddr, 段.header.p_memsz, 段.header.p_filesz, 段.header.p_offset
        模拟器.mem_write(IL2CPP基址 + 段虚拟地址, 文件数据[段文件偏移:段文件偏移+段文件大小])
for 段 in 目标库ELF.iter_segments():
    if 段.header.p_type != 'PT_LOAD': continue
    段虚拟地址, 段内存大小, 段文件大小, 段文件偏移 = 段.header.p_vaddr, 段.header.p_memsz, 段.header.p_filesz, 段.header.p_offset
    print(f'il2cpp seg va={段虚拟地址:#x} fsz={段文件大小:#x} msz={段内存大小:#x} flags={段.header.p_flags}')
print(f'il2cpp image end: {映像结束偏移:#x}')

def 读动态标签():
    # 直接从 PT_DYNAMIC 段解析标签：加壳 ELF 的节表不可依赖，程序头表才是稳定入口
    动态段 = next(段 for 段 in 目标库ELF.iter_segments() if 段.header.p_type == 'PT_DYNAMIC')
    标签 = {}
    段数据 = 动态段.data()
    for 偏移 in range(0, len(段数据), 16):
        号, 值 = struct.unpack_from('<QQ', 段数据, 偏移)
        if 号 == 0: break
        标签.setdefault(号, 值)
    return 标签

动态标签 = 读动态标签()
# DT_INIT(12)=NP 解密桩入口：该偏移随游戏构建漂移（0923=0x3134504，2.3.0=0x3134210），必须从动态表读取而非硬编码
目标初始偏移 = 动态标签[12]
代码段起始 = next(段.header.p_vaddr for 段 in 目标库ELF.iter_segments() if 段.header.p_type == 'PT_LOAD' and 段.header.p_flags & 1)

def 解析重定位槽(符号名):
    # 从 DT_JMPREL(23) 重定位表按符号名找 GOT 槽地址；SoLibraryStart 是本库唯一 PLT 重定位，符号名是跨构建稳定锚（0923 槽=0x50cd4c8，2.3.0 槽=0x50cbf20）
    加载段头 = [段.header for 段 in 目标库ELF.iter_segments() if 段.header.p_type == 'PT_LOAD']
    def 文件偏移(虚拟地址):
        for 头 in 加载段头:
            if 头.p_vaddr <= 虚拟地址 < 头.p_vaddr + 头.p_filesz:
                return 头.p_offset + 虚拟地址 - 头.p_vaddr
        raise RuntimeError(f'虚拟地址 {虚拟地址:#x} 不在任何 PT_LOAD 文件区')
    字符串表 = 文件偏移(动态标签[5])
    符号表 = 文件偏移(动态标签[6])
    跳转重定位表 = 文件偏移(动态标签[23])
    for 偏移 in range(0, 动态标签[2], 24):
        槽地址, 信息 = struct.unpack_from('<QQ', 文件数据, 跳转重定位表 + 偏移)
        名偏移 = 字符串表 + struct.unpack_from('<I', 文件数据, 符号表 + (信息 >> 32) * 24)[0]
        if 文件数据[名偏移:文件数据.index(b'\0', 名偏移)].decode() == 符号名:
            return 槽地址
    raise RuntimeError('JMPREL 中未找到符号: ' + 符号名)

# 手填唯一关键 GOT：JMPREL 中 SoLibraryStart 的 JUMP_SLOT 槽 → NP 包装器（槽地址按符号名动态解析，不随构建硬编码）
模拟器.mem_write(IL2CPP基址 + 解析重定位槽('SoLibraryStart'), struct.pack('<Q', 基址 + 0x9c55c))

# maps 加入 libil2cpp（NP 可能按 x0 地址查 maps 定位调用模块）；保留 emu2 的合成 libc 等行
if not any(模块起始 == IL2CPP基址 for 模块起始, 模块结束, 模块路径 in 真实全局表['已加载模块']):
    真实全局表['进程映射内容'] = 真实全局表['进程映射内容'] + (f'{IL2CPP基址:08x}-{IL2CPP基址+映像结束偏移:08x} r-xp 00000000 fd:00 1236 /data/app/lib/arm64/libil2cpp.so\n').encode()
    真实全局表['已加载模块'].append((IL2CPP基址, IL2CPP基址 + 映像结束偏移, '/data/app/lib/arm64/libil2cpp.so'))

模拟器.reg_write(UC_ARM64_REG_SP, 栈基址 + 栈大小 - 0x1000)
模拟器.reg_write(UC_ARM64_REG_LR, 返回地址)
模拟器.reg_write(UC_ARM64_REG_X0, 0)

# ---- 模拟 NP Java 层 native init：构造最小假 JNIEnv，调用 JNI init 0x133ec4 设置密钥/标志 ----
模拟数据区 = 命名空间['模拟数据区']
JNI函数表 = 模拟数据区 + 0x40000      # JNINativeInterface* 函数表（250 项）
JNI桩区 = 模拟数据区 + 0x50000      # 每个 JNI 函数一个 ret 桩
JNI环境 = 模拟数据区 + 0x48000        # JNIEnv*（指向函数表指针）
JNI对象 = 模拟数据区 + 0x49000        # fake jobject
for i in range(250):
    模拟器.mem_write(JNI函数表 + i * 8, struct.pack('<Q', JNI桩区 + i * 4))
    模拟器.mem_write(JNI桩区 + i * 4, struct.pack('<I', 0xd65f03c0))
模拟器.mem_write(JNI环境, struct.pack('<Q', JNI函数表))
JNI日志 = open(os.path.join(本目录, 'JNI调用日志.txt'), 'w', buffering=1)
def 读取内存字符串(引擎, 指针, 上限=256):
    if not 指针: return ''
    try:
        b = bytes(引擎.mem_read(指针, 上限)); e = b.find(b'\0')
        return b[:e if e >= 0 else 上限].decode('latin1')
    except UcError: return f'<unreadable {指针:#x}>'
方法名表 = {}
字段名表 = {}
标识计数 = [0]
def 新建JNI标识(表, 名称):
    标识计数[0] += 1
    标识值 = JNI对象 + 0x800 + 标识计数[0] * 8
    表[标识值] = 名称
    return 标识值

def JNI钩子(引擎, 地址, 大小, 用户数据):
    索引 = (地址 - JNI桩区) // 4
    寄存器x1 = 引擎.reg_read(UC_ARM64_REG_X1); 寄存器x2 = 引擎.reg_read(UC_ARM64_REG_X2)
    寄存器x3 = 引擎.reg_read(UC_ARM64_REG_X3)
    附加信息 = ''
    if 索引 == 6: 附加信息 = f' FindClass({读取内存字符串(引擎, 寄存器x1)!r})'
    elif 索引 in (33, 113):
        附加信息 = f' MethodID({读取内存字符串(引擎, 寄存器x2)!r},{读取内存字符串(引擎, 寄存器x3)!r})'
    elif 索引 in (94, 95, 100):
        附加信息 = f' Field({读取内存字符串(引擎, 寄存器x2)!r},{读取内存字符串(引擎, 寄存器x3)!r})'
    elif 索引 in (34, 35, 36, 114, 115, 116):
        附加信息 = f' CallMethod(id={寄存器x2:#x},name={方法名表.get(寄存器x2, "")!r})'
    elif 索引 == 164: 附加信息 = f' NewStringUTF({读取内存字符串(引擎, 寄存器x1)!r})'
    elif 索引 == 215:
        附加信息 = f' RegisterNatives clazz={寄存器x1:#x} count={寄存器x3}'
        try:
            for k in range(min(寄存器x3, 60)):
                表项 = bytes(引擎.mem_read(寄存器x2 + k * 24, 24))
                名称指针, 签名指针, 函数指针 = struct.unpack('<QQQ', 表项)
                附加信息 += f'\n    [{k}] name={读取内存字符串(引擎, 名称指针)!r} sig={读取内存字符串(引擎, 签名指针)!r} fn={函数指针:#x}'
        except UcError: 附加信息 += ' <table unreadable>'
    JNI日志.write(f'JNI[{索引}] x1={寄存器x1:#x} x2={寄存器x2:#x}{附加信息}\n')
    返回值 = 0
    if 索引 in (33, 113):
        返回值 = 新建JNI标识(方法名表, 读取内存字符串(引擎, 寄存器x2))
    elif 索引 in (94,):
        返回值 = 新建JNI标识(字段名表, 读取内存字符串(引擎, 寄存器x2))
    elif 索引 == 95:
        返回值 = JNI对象 + 0x400 + (寄存器x2 & 0xff)
    elif 索引 == 100:
        返回值 = 0
    elif 索引 in (114, 115, 116):
        名称 = 方法名表.get(寄存器x2, '')
        返回值 = JNI对象 + (0x300 if 名称 == 'currentActivityThread' else 0x500)
    elif 索引 in (34, 35, 36):
        名称 = 方法名表.get(寄存器x2, '')
        返回值 = JNI对象 + (0x400 if 名称 == 'getApplicationInfo' else 0x500)
    elif 索引 in (6, 31, 21, 169, 16, 27): 返回值 = JNI对象 + 0x100 + 索引 * 8
    引擎.reg_write(UC_ARM64_REG_X0, 返回值)
模拟器.hook_add(UC_HOOK_CODE, JNI钩子, begin=JNI桩区, end=JNI桩区 + 250 * 4)

信号处理器列表 = []
if os.environ.get('捕获信号') == '1':
    信号日志 = open(os.path.join(本目录, '信号安装日志.txt'), 'w', buffering=1)
    def 信号安装钩子(引擎, 地址, 大小, 用户数据):
        寄存器x0 = 引擎.reg_read(UC_ARM64_REG_X0)
        寄存器x1 = 引擎.reg_read(UC_ARM64_REG_X1)
        链接寄存器 = 引擎.reg_read(UC_ARM64_REG_LR)
        信号处理器列表.append((寄存器x0, 寄存器x1, 链接寄存器))
        信号日志.write(f'ENTER 0x93ef0 old_actions={寄存器x0:#x} handler={寄存器x1:#x} handler_off={寄存器x1-基址:#x} lr={链接寄存器:#x} lr_off={链接寄存器-基址:#x}\n')
    模拟器.hook_add(UC_HOOK_CODE, 信号安装钩子, begin=基址 + 0x93ef0, end=基址 + 0x93ef0)

JNI初始化入口 = 基址 + 0x133ec4
# DT_INIT 未设全局状态表基址 [0x1b2b90]（JNI init 崩溃 str w8,[x9=*[0x1b2b90],#0x254]）。手动 alloc 零表让其推进。
状态表 = 命名空间['分配内存'](0x4000)
模拟器.mem_write(基址 + 0x1b2b90, struct.pack('<Q', 状态表))
模拟器.mem_write(基址 + 0x1b2ba0, struct.pack('<Q', 状态表 + 0x100))
print('manual state table [0x1b2b90] @', hex(状态表), ' [0x1b2ba0]->', hex(状态表 + 0x100))
print('calling NP JNI init @', hex(JNI初始化入口))
模拟器.reg_write(UC_ARM64_REG_SP, 栈基址 + 栈大小 - 0x2000)
模拟器.reg_write(UC_ARM64_REG_LR, 返回地址)
模拟器.reg_write(UC_ARM64_REG_X0, JNI环境)
模拟器.reg_write(UC_ARM64_REG_X1, JNI对象)
模拟器.reg_write(UC_ARM64_REG_X2, 0)
模拟器.reg_write(UC_ARM64_REG_X3, 0)
try:
    if os.environ.get('续跑模式') == '1':
        print('JNI init skipped for post-mod resume')
    else:
        模拟器.emu_start(JNI初始化入口, 返回地址, timeout=int(os.environ.get('模拟超时微秒', '10000000')), count=200_000_000)
        print('JNI init returned OK')
except UcError as e:
    print('JNI init ERROR:', e, 'PC=', hex(模拟器.reg_read(UC_ARM64_REG_PC)))
if os.environ.get('捕获信号') == '1':
    print('captured signal handlers:', [(hex(a), hex(h), hex(链接寄存器)) for a, h, 链接寄存器 in 信号处理器列表])
    信号日志.flush()
    sys.exit(0)
def 容错读取全局(偏移):
    try: return struct.unpack('<Q', bytes(模拟器.mem_read(基址 + 偏移, 8)))[0]
    except UcError: return 0
print('after JNI init: flag[0x1b1020]=', hex(容错读取全局(0x1b1020)), 'real_fn[0x1b2bf8]=', hex(容错读取全局(0x1b2bf8)), 'ctx[0x1b3070]=', hex(容错读取全局(0x1b3070)))
print('  [0x1a8fc0]->', hex(容错读取全局(容错读取全局(0x1a8fc0) - 基址)) if 容错读取全局(0x1a8fc0) else 0, ' [0x1a8e88]flag=', 容错读取全局(0x1a8e88) & 0xff)
# JNI init 中间会清除刚设置的 bit0；真实 native 链在 DT_INIT 之后再调用 0x133ec4，补回该门控位
读取单字节 = lambda 偏移: bytes(模拟器.mem_read(基址 + 偏移, 1))[0]
if 读取单字节(0x1b0ef8) == 0:
    模拟器.mem_write(基址 + 0x1b0ef8, b'\x01')
    print('restored post-init flag [0x1b0ef8]=1')

# ---- 实验：调用主调度器候选 native，观察 RegisterNatives / real_fn ----
if os.environ.get('调度实验') == '1':
    候选列表 = (int(os.environ['调度单个候选'], 16),) if os.environ.get('调度单个候选') else (0x136b68, 0x135648, 0x136188, 0x134cb8, 0x1350cc, 0x1338a4)
    for 候选 in 候选列表:
        原值 = 容错读取全局(0x1b2bf8)
        模拟器.reg_write(UC_ARM64_REG_SP, 栈基址 + 栈大小 - 0x3000)
        模拟器.reg_write(UC_ARM64_REG_LR, 返回地址)
        模拟器.reg_write(UC_ARM64_REG_X0, JNI环境)
        模拟器.reg_write(UC_ARM64_REG_X1, JNI对象)
        模拟器.reg_write(UC_ARM64_REG_X2, JNI对象 + 0x200)
        模拟器.reg_write(UC_ARM64_REG_X3, 0)
        模拟器.reg_write(UC_ARM64_REG_X4, 0)
        模拟器.reg_write(UC_ARM64_REG_X5, 0)
        JNI日志.write(f'\n===== DISPATCH candidate {候选:#x} =====\n')
        try:
            模拟器.emu_start(基址 + 候选, 返回地址, timeout=int(os.environ.get('模拟超时微秒', '10000000')), count=100_000_000)
            print(f'dispatch {候选:#x} returned OK; real_fn={容错读取全局(0x1b2bf8):#x}')
        except UcError as e:
            print(f'dispatch {候选:#x} ERROR {e} PC={模拟器.reg_read(UC_ARM64_REG_PC):#x} real_fn={容错读取全局(0x1b2bf8):#x}')
        if 容错读取全局(0x1b2bf8) != 原值:
            print(f'  *** real_fn CHANGED by {候选:#x}: {原值:#x} -> {容错读取全局(0x1b2bf8):#x} ***')
            break
    if os.environ.get('仅调度实验') == '1':
        print('dispatch-only stopping before target processing')
        sys.exit(0)

# setter 0x92dec 的正常分支安装一组绝对实现地址；当前 DT_INIT 快照未调用该 setter，直接补齐。
实现地址表 = {0x1b2be8: 0x132d24, 0x1b2bf0: 0x10779c, 0x1b2bf8: 0x173b1c,
         0x1b2c00: 0x162d9c, 0x1b2c08: 0x109540}
for 槽位, 偏移 in 实现地址表.items():
    模拟器.mem_write(基址 + 槽位, struct.pack('<Q', 基址 + 偏移))
print('已填充真实实现地址:', {hex(k): hex(v) for k, v in 实现地址表.items()})

# 记录关键控制流门和实现入口；emu2 的 bss/rx 写hook本身报告重加密并终止跟踪，不阻止写入
from unicorn import UC_HOOK_CODE
流程日志 = open(os.path.join(本目录, '真实流程日志.txt'), 'w', buffering=1)
流程偏移表 = [0x133ec4, 0x133f24, 0x13457c, 0x9c5a0, 0x9c570, 0x9c578, 0x9c58c, 0x173b1c,
            0x9cb0c, 0x9c6fc, 0x9c7f0, 0x9cdd4, 0x9ce70]
def 真实流程钩子(引擎, 地址, 大小, 用户数据):
    流程日志.write(f'{地址-基址:#x} x0={引擎.reg_read(UC_ARM64_REG_X0):#x} flag={读取单字节(0x1b0ef8)} ctx={容错读取全局(0x1b3070):#x} real={容错读取全局(0x1b2bf8):#x}\n')
    if 地址 == 基址 + 0x9c578:
        寄存器组 = {f'x{i}': 引擎.reg_read(UC_ARM64_REG_X0 + i) for i in range(31)}
        寄存器组['sp'] = 引擎.reg_read(UC_ARM64_REG_SP)
        流程日志.write('BEFORE REAL ' + repr(寄存器组) + '\n')
        import pickle
        pickle.dump(寄存器组, open(os.path.join(本目录, '真实调用寄存器.pkl'), 'wb'))
    if 地址 == 基址 + 0x9c58c:
        print('real function returned; il2cpp desc head=', bytes(模拟器.mem_read(IL2CPP基址 + (目标初始偏移 & ~0xfff), 32)).hex())
        print('libil2cpp code head=', bytes(模拟器.mem_read(IL2CPP基址 + 代码段起始, 32)).hex())
if os.environ.get('跟踪真实流程') == '1':
    for 偏移 in 流程偏移表:
        模拟器.hook_add(UC_HOOK_CODE, 真实流程钩子, begin=基址 + 偏移, end=基址 + 偏移)
if os.environ.get('跟踪上下文构造') == '1':
    def 上下文构造钩子(引擎, 地址, 大小, 用户数据):
        if 地址 == 基址 + 0x1074a8:
            目标日志.write('CONTEXT CONSTRUCT ENTER x0=' + hex(引擎.reg_read(UC_ARM64_REG_X0)) + ' LR=' + hex(引擎.reg_read(UC_ARM64_REG_LR)-基址) + '\n')
        else:
            目标日志.write('CONTEXT CONSTRUCT RETURN PC=' + hex(地址-基址) + ' LR=' + hex(引擎.reg_read(UC_ARM64_REG_LR)-基址) + ' ctx=' + bytes(引擎.mem_read(基址+0x1b3070, 0x180)).hex() + '\n')
            print('CONTEXT CONSTRUCT RETURN', hex(地址-基址), flush=True)
    模拟器.hook_add(UC_HOOK_CODE, 上下文构造钩子, begin=基址 + 0x1074a8, end=基址 + 0x1074a8)
    for 偏移 in (0x8f2e8, 0x8f32c, 0x8f378):
        模拟器.hook_add(UC_HOOK_CODE, 上下文构造钩子, begin=基址 + 偏移, end=基址 + 偏移)
if os.environ.get('跟踪状态机') == '1':
    def 状态机钩子(引擎, 地址, 大小, 用户数据):
        栈指针 = 引擎.reg_read(UC_ARM64_REG_SP)
        帧指针 = 引擎.reg_read(UC_ARM64_REG_X29)
        链接寄存器 = 引擎.reg_read(UC_ARM64_REG_LR)
        print('STATE MACHINE', hex(地址-基址), 'LR', hex(链接寄存器-基址), 'FP', hex(帧指针), 'SP', hex(栈指针), flush=True)
        try:
            print('STATE STACK', bytes(引擎.mem_read(栈指针, 0x120)).hex(), flush=True)
        except UcError:
            pass
        if 地址 == 基址 + 0x172b34:
            print('HANDLER PARAMS', hex(引擎.reg_read(UC_ARM64_REG_X0)), hex(引擎.reg_read(UC_ARM64_REG_X1)), flush=True)
            引擎.emu_stop()
    for 偏移 in (0x172000, 0x172b34):
        模拟器.hook_add(UC_HOOK_CODE, 状态机钩子, begin=基址 + 偏移, end=基址 + 偏移)
if os.environ.get('跟踪索引初始化') == '1':
    def 索引初始化钩子(引擎, 地址, 大小, 用户数据):
        print('INDEX INIT', hex(地址-基址), 'x0', hex(引擎.reg_read(UC_ARM64_REG_X0)), 'LR', hex(引擎.reg_read(UC_ARM64_REG_LR)-基址), 'index', bytes(引擎.mem_read(基址 + 0x1aecfc, 8)).hex(), flush=True)
    模拟器.hook_add(UC_HOOK_CODE, 索引初始化钩子, begin=基址 + 0x149d88, end=基址 + 0x149d88)
    模拟器.hook_add(UC_HOOK_CODE, 索引初始化钩子, begin=基址 + 0x149e2c, end=基址 + 0x149e2c)
    模拟器.hook_add(UC_HOOK_CODE, 索引初始化钩子, begin=基址 + 0x14b3f4, end=基址 + 0x14b3f4)
if os.environ.get('跟踪初始化入口') == '1':
    def 阶段2初始化入口钩子(引擎, 地址, 大小, 用户数据):
        print('INIT ENTRY PHASE2', hex(地址-基址), 'x0', hex(引擎.reg_read(UC_ARM64_REG_X0)), 'LR', hex(引擎.reg_read(UC_ARM64_REG_LR)-基址), 'SP', hex(引擎.reg_read(UC_ARM64_REG_SP)), flush=True)
        if 地址 == 基址 + 0x149d74 and os.environ.get('停止初始化入口') == '1':
            引擎.emu_stop()
    模拟器.hook_add(UC_HOOK_CODE, 阶段2初始化入口钩子, begin=基址 + 0x149d74, end=基址 + 0x149d74)
    for _偏移 in (0x9c5a0, 0x9ce54, 0x98a3c, 0x174ab8, 0x9a810, 0x9a8e8, 0x9db38):
        模拟器.hook_add(UC_HOOK_CODE, 阶段2初始化入口钩子, begin=基址 + _偏移, end=基址 + _偏移)

# 捕获密钥派生/OpenSSL 解析函数的间接调用及其输入输出；不改写正常逻辑
if os.environ.get('跟踪加密') == '1':
    加密日志 = open(os.path.join(本目录, '加密追踪日志.txt'), 'w', buffering=1)
    def 加密钩子(引擎, 地址, 大小, 用户数据):
        v = 地址 - 基址
        寄存器组 = [引擎.reg_read(UC_ARM64_REG_X0 + i) for i in range(4)]
        加密日志.write(f'ENTER {v:#x} args={[hex(x) for x in 寄存器组]} lr={引擎.reg_read(UC_ARM64_REG_LR)-基址:#x}\n')
        if v == 0x109f78:
            数据 = bytes(引擎.mem_read(基址 + 0x1aed20, 0x150))
            加密日志.write('  embedded=' + 数据.hex() + '\n')
        if v == 0x109acc:
            try: 加密日志.write('  path=' + bytes(引擎.mem_read(寄存器组[1], 256)).split(b'\0')[0].hex() + '\n')
            except UcError: pass
    for 偏移 in (0x109acc, 0x109f78):
        模拟器.hook_add(UC_HOOK_CODE, 加密钩子, begin=基址 + 偏移, end=基址 + 偏移)
    def 加密返回钩子(引擎, 地址, 大小, 用户数据):
        寄存器x0 = 引擎.reg_read(UC_ARM64_REG_X0)
        加密日志.write(f'CRYPTO RET pc={地址-基址:#x} x0={寄存器x0:#x}\n')
    for 偏移 in (0x109f04, 0x10a3f4):
        模拟器.hook_add(UC_HOOK_CODE, 加密返回钩子, begin=基址 + 偏移, end=基址 + 偏移)

# 在主实现的实际调用者中记录关键解析函数返回值；同时记录目标库被写入的范围
def 目标函数钩子(引擎, 地址, 大小, 用户数据):
    x = [引擎.reg_read(UC_ARM64_REG_X0 + i) for i in range(4)]
    目标日志.write(f'CALL {地址-基址:#x} args={[hex(v) for v in x]} lr={引擎.reg_read(UC_ARM64_REG_LR)-基址:#x}\n')
if os.environ.get('捕获内存故障') == '1':
    from unicorn import UC_HOOK_MEM_PROT, UC_HOOK_MEM_READ_UNMAPPED, UC_HOOK_MEM_WRITE_UNMAPPED, UC_HOOK_MEM_FETCH_UNMAPPED
    def 内存故障钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
        程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC)
        print('MEMORY FAULT', 'access', 访问类型, 'address', hex(地址), 'size', 大小, 'pc', hex(程序计数器), 'lr', hex(引擎.reg_read(UC_ARM64_REG_LR)))
        目标日志.write(f'MEMORY FAULT access={访问类型} address={地址:#x} size={大小} pc={程序计数器-基址:#x} lr={引擎.reg_read(UC_ARM64_REG_LR)-基址:#x}\n')
        引擎.emu_stop()
        return False
    模拟器.hook_add(UC_HOOK_MEM_PROT | UC_HOOK_MEM_READ_UNMAPPED | UC_HOOK_MEM_WRITE_UNMAPPED | UC_HOOK_MEM_FETCH_UNMAPPED, 内存故障钩子)
if os.environ.get('跟踪目标调用') == '1':
    for 偏移 in (0x9659c, 0x162898, 0x173aa4, 0x1748a0, 0x174934, 0x138a1c, 0x138ca0, 0x137918, 0x137954, 0x137968):
        模拟器.hook_add(UC_HOOK_CODE, 目标函数钩子, begin=基址 + 偏移, end=基址 + 偏移)
目标写入摘要 = {'次数': 0, '最小偏移': 映像结束偏移, '最大偏移': 0, '调用点': {}}
def 目标写入钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
    if IL2CPP基址 <= 地址 < IL2CPP基址 + 映像结束偏移:
        偏移 = 地址 - IL2CPP基址
        目标写入摘要['次数'] += 1
        目标写入摘要['最小偏移'] = min(目标写入摘要['最小偏移'], 偏移)
        目标写入摘要['最大偏移'] = max(目标写入摘要['最大偏移'], 偏移 + 大小)
        程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC) - 基址
        键 = hex(程序计数器)
        目标写入摘要['调用点'][键] = 目标写入摘要['调用点'].get(键, 0) + 1
        if os.environ.get('跟踪目标写入') == '1':
            目标日志.write(f'IL2CPP WRITE addr={偏移:#x} size={大小} value={写入值:#x} pc={程序计数器:#x}\n')
if os.environ.get('跟踪目标写入') == '1' or os.environ.get('汇总目标写入') == '1':
    模拟器.hook_add(UC_HOOK_MEM_WRITE, 目标写入钩子, begin=IL2CPP基址, end=IL2CPP基址 + 映像结束偏移)

# 实际打开目标库后补文件读取日志，pread/read 不可混用游标语义
原始模拟打开 = 命名空间['模拟打开']
def 带跟踪的模拟打开(路径):
    文件描述符 = 原始模拟打开(路径)
    目标日志.write(f'FILE OPEN fd={文件描述符} path={路径}\n')
    return 文件描述符
真实全局表['模拟打开'] = 带跟踪的模拟打开

# 只记录 0x9659c 完成时的返回值和调用现场，识别模块定位失败的具体原因
# 影子快照可能漏掉局部代码的首次写入；进入目标函数前保存真实执行字节供后续分析/恢复
def 函数捕获钩子(引擎, 地址, 大小, 用户数据):
    区域字节 = bytes(引擎.mem_read(基址 + 0xfcf10, 0x100))
    open(os.path.join(本目录, '解密函数现场.bin'), 'wb').write(区域字节)
    目标日志.write('FCFN LIVE=' + 区域字节.hex() + '\n')
    print('captured fcfn live:', 区域字节[0xb0:0xd0].hex())
    引擎.hook_del(函数捕获钩子引用)
函数捕获钩子引用 = 模拟器.hook_add(UC_HOOK_CODE, 函数捕获钩子, begin=基址 + 0xfcf10, end=基址 + 0xfcf10)

if os.environ.get('捕获目标陷阱') == '1':
    import pickle
    def 目标陷阱钩子(引擎, 地址, 大小, 用户数据):
        寄存器组 = {f'x{i}': 引擎.reg_read(UC_ARM64_REG_X0 + i) for i in range(31)}
        寄存器组['sp'] = 引擎.reg_read(UC_ARM64_REG_SP)
        寄存器组['pc'] = 引擎.reg_read(UC_ARM64_REG_PC)
        寄存器组['lr'] = 引擎.reg_read(UC_ARM64_REG_LR)
        结果 = {'寄存器组': 寄存器组, '代码': bytes(引擎.mem_read(地址 - 128, 384))}
        for 寄存器名 in ('x0', 'x1', 'x2', 'x8', 'x19', 'x20', 'sp'):
            try:
                结果[寄存器名] = bytes(引擎.mem_read(寄存器组[寄存器名], 0x100))
            except UcError:
                结果[寄存器名] = None
        with open(os.path.join(本目录, '目标陷阱现场.pkl'), 'wb') as 输出文件:
            pickle.dump(结果, 输出文件)
        print('target trap captured:', hex(地址))
        引擎.emu_stop()
    模拟器.hook_add(UC_HOOK_CODE, 目标陷阱钩子, begin=基址 + 0x160af4, end=基址 + 0x160af4)

if os.environ.get('跟踪目标调度') == '1':
    from unicorn import UC_HOOK_MEM_FETCH_UNMAPPED
    调度计数 = [0]
    调度上限 = int(os.environ.get('调度上限', '512'))
    def 目标调度钩子(引擎, 地址, 大小, 用户数据):
        if 调度计数[0] >= 调度上限:
            引擎.emu_stop()
            return
        调度计数[0] += 1
        寄存器值 = [引擎.reg_read(reg) for reg in (UC_ARM64_REG_X8, UC_ARM64_REG_X11, UC_ARM64_REG_X19, UC_ARM64_REG_X20, UC_ARM64_REG_X25, UC_ARM64_REG_LR)]
        目标日志.write(f'DISPATCH STATE pc={地址-基址:#x} x8={寄存器值[0]:#x} x11={寄存器值[1]:#x} x19={寄存器值[2]:#x} x20={寄存器值[3]:#x} x25={寄存器值[4]:#x} lr={寄存器值[5]:#x}\n')
    迭代计数 = [0]
    上次迭代值 = [None]
    def 调度迭代钩子(引擎, 地址, 大小, 用户数据):
        迭代值 = 引擎.reg_read(UC_ARM64_REG_X8)
        目标地址 = 引擎.reg_read(UC_ARM64_REG_X23)
        迭代计数[0] += 1
        if 迭代值 != 上次迭代值[0] or 迭代计数[0] % 256 == 0:
            上次迭代值[0] = 迭代值
            if 目标地址 <= IL2CPP基址 + 映像结束偏移:
                目标日志.write(f'DISPATCH ITERATION count={迭代计数[0]} index={迭代值:#x} target={目标地址-IL2CPP基址:#x}\n')
    模拟器.hook_add(UC_HOOK_CODE, 调度迭代钩子, begin=基址 + 0x160cf4, end=基址 + 0x160cf4)
    def 无效取指钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
        程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC)
        寄存器组 = {f'x{i}': 引擎.reg_read(UC_ARM64_REG_X0 + i) for i in range(31)}
        寄存器组.update(pc=程序计数器, sp=引擎.reg_read(UC_ARM64_REG_SP), lr=引擎.reg_read(UC_ARM64_REG_LR), 故障地址=地址, 访问类型=访问类型)
        import pickle
        with open(os.path.join(本目录, '目标非法访问现场.pkl'), 'wb') as 输出文件:
            pickle.dump(寄存器组, 输出文件)
        print('TARGET INVALID FETCH', hex(地址), 'PC', hex(程序计数器), 'LR', hex(寄存器组['lr']))
        引擎.emu_stop()
        return False
    模拟器.hook_add(UC_HOOK_BLOCK, 目标调度钩子, begin=基址 + 0x160af4, end=基址 + 0x161100)
    模拟器.hook_add(UC_HOOK_MEM_FETCH_UNMAPPED, 无效取指钩子)

if os.environ.get('捕获内容帧') == '1':
    import pickle
    def 内容帧钩子(引擎, 地址, 大小, 用户数据):
        栈指针 = 引擎.reg_read(UC_ARM64_REG_SP)
        帧指针 = 引擎.reg_read(UC_ARM64_REG_X29)
        结果 = {
            'sp': 栈指针,
            'fp': 帧指针,
            '栈数据': bytes(引擎.mem_read(栈指针, 0xa60)),
            '对象数据': bytes(引擎.mem_read(引擎.reg_read(UC_ARM64_REG_X0), 0xb98)),
            '密钥': bytes(引擎.mem_read(帧指针 - 0x40, 0x10)),
            'pc': 地址,
        }
        with open(os.path.join(本目录, '内容帧现场.pkl'), 'wb') as 输出文件:
            pickle.dump(结果, 输出文件)
        print('content frame captured sp=', hex(栈指针), 'fp=', hex(帧指针), 'key=', 结果['密钥'].hex())
        引擎.emu_stop()
    模拟器.hook_add(UC_HOOK_CODE, 内容帧钩子, begin=基址 + 0x1602c0, end=基址 + 0x1602c0)

if os.environ.get('捕获异或密钥') == '1':
    import pickle
    def 异或密钥钩子(引擎, 地址, 大小, 用户数据):
        栈指针 = 引擎.reg_read(UC_ARM64_REG_SP)
        帧指针 = 引擎.reg_read(UC_ARM64_REG_X29)
        密钥 = bytes(引擎.mem_read(帧指针 - 0x40, 0x10))
        栈数据 = bytes(引擎.mem_read(栈指针, 0x1c0))
        索引 = struct.unpack_from('<i', 栈数据, 0x174)[0]
        上限 = struct.unpack_from('<i', 栈数据, 0x114)[0]
        源地址 = struct.unpack_from('<Q', 栈数据, 0x168)[0]
        目标地址 = struct.unpack_from('<Q', 栈数据, 0x180)[0]
        def 采样(指针):
            try:
                return bytes(引擎.mem_read(指针 + 索引 * 8, 8))
            except UcError:
                return None
        结果 = {
            'sp': 栈指针,
            '栈数据': 栈数据,
            '密钥': 密钥,
            '索引': 索引,
            '上限': 上限,
            '源地址': 源地址,
            '目标地址': 目标地址,
            '源采样': 采样(源地址),
            '目标采样': 采样(目标地址),
            '寄存器组': {f'x{i}': 引擎.reg_read(UC_ARM64_REG_X0 + i) for i in range(31)},
        }
        with open(os.path.join(本目录, '异或密钥现场.pkl'), 'wb') as 输出文件:
            pickle.dump(结果, 输出文件)
        print('XOR frame captured key=', 密钥.hex(), 'index=', 索引, 'limit=', 上限, 'source=', hex(源地址), 'dest=', hex(目标地址))
        引擎.emu_stop()
    模拟器.hook_add(UC_HOOK_CODE, 异或密钥钩子, begin=基址 + 0x160f14, end=基址 + 0x160f14)

if os.environ.get('捕获已执行页') == '1':
    from pathlib import Path
    捕获目录 = Path(本目录) / '已执行页捕获'
    捕获目录.mkdir(exist_ok=True)
    已捕获页集合 = set()
    def 已执行页钩子(引擎, 地址, 大小, 用户数据):
        页 = 地址 & ~0xfff
        if 页 in 已捕获页集合:
            return
        已捕获页集合.add(页)
        try:
            页内容 = bytes(引擎.mem_read(页, 0x1000))
            (捕获目录 / f'{页:x}.bin').write_bytes(页内容)
            print('EXECUTED PAGE', hex(页), flush=True)
        except UcError:
            已捕获页集合.discard(页)
    模拟器.hook_add(UC_HOOK_BLOCK, 已执行页钩子, begin=IL2CPP基址, end=IL2CPP基址 + 映像结束偏移)

# 与前半段0xfcf80-0xfcf98完全同构：平方结果的隐藏返回对象是sp+8，模数是x20；陷阱前一条伪指令已破坏x1，必须恢复真实模数指针。
模幂计数 = [0]
def 读取大整数(引擎, 指针):
    字数 = struct.unpack('<I', bytes(引擎.mem_read(指针, 4)))[0]
    数据指针 = struct.unpack('<Q', bytes(引擎.mem_read(指针 + 8, 8)))[0]
    数值 = 0
    if 字数 and 字数 < 0x10000:
        原始字节 = bytes(引擎.mem_read(数据指针, 字数 * 4))
        数值 = int.from_bytes(原始字节, 'little')
    return 字数, 数值
def 模幂陷阱钩子(引擎, 地址, 大小, 用户数据):
    源对象 = 引擎.reg_read(UC_ARM64_REG_X0)
    模数 = 引擎.reg_read(UC_ARM64_REG_X20)
    模幂计数[0] += 1
    if 模幂计数[0] <= 8 and os.environ.get('跟踪大整数') == '1':
        目标日志.write(f'MOD ENTER #{模幂计数[0]} square={读取大整数(引擎, 源对象)} modulus={读取大整数(引擎, 模数)}\n')
    引擎.reg_write(UC_ARM64_REG_X1, 模数)
    引擎.reg_write(UC_ARM64_REG_LR, 基址 + 0xfcfe0)
    引擎.reg_write(UC_ARM64_REG_PC, 基址 + 0x82c58)
def 模幂返回钩子(引擎, 地址, 大小, 用户数据):
    if 模幂计数[0] <= 8 and os.environ.get('跟踪大整数') == '1':
        目标日志.write(f'MOD RESULT #{模幂计数[0]} dest={读取大整数(引擎, 引擎.reg_read(UC_ARM64_REG_SP) + 8)} x22={读取大整数(引擎, 引擎.reg_read(UC_ARM64_REG_X22))}\n')
模拟器.hook_add(UC_HOOK_CODE, 模幂陷阱钩子, begin=基址 + 0xfcfdc, end=基址 + 0xfcfdc)
模拟器.hook_add(UC_HOOK_CODE, 模幂返回钩子, begin=基址 + 0xfcfe0, end=基址 + 0xfcfe0)
扩容计数 = [0]
def 扩容陷阱钩子(引擎, 地址, 大小, 用户数据):
    请求字节数 = 引擎.reg_read(UC_ARM64_REG_X20) & 0xffffffff
    引擎.reg_write(UC_ARM64_REG_X21, 请求字节数)
    引擎.reg_write(UC_ARM64_REG_PC, 基址 + 0xfc690)
    扩容计数[0] += 1
    if 扩容计数[0] <= 4 and os.environ.get('跟踪大整数') == '1':
        目标日志.write(f'BYTE VECTOR RESIZE #{扩容计数[0]} bytes={请求字节数}\n')
模拟器.hook_add(UC_HOOK_CODE, 扩容陷阱钩子, begin=基址 + 0xfc68c, end=基址 + 0xfc68c)

if os.environ.get('捕获复制故障') == '1':
    def 复制故障钩子(引擎, 地址, 大小, 用户数据):
        寄存器组 = {f'x{i}': 引擎.reg_read(UC_ARM64_REG_X0 + i) for i in range(22)}
        print('COPY FAULT regs', {k: hex(v) for k,v in 寄存器组.items()})
        for 寄存器名 in ('x0', 'x1', 'x8', 'x19', 'x20'):
            指针 = 寄存器组[寄存器名]
            try: print(寄存器名, bytes(引擎.mem_read(指针, 32)).hex())
            except UcError: print(寄存器名, 'unmapped')
        引擎.emu_stop()
    模拟器.hook_add(UC_HOOK_CODE, 复制故障钩子, begin=基址 + 0x824ec, end=基址 + 0x824ec)

if os.environ.get('映射复制') == '1':
    def 映射复制钩子(引擎, 地址, 大小, 用户数据):
        源对象 = 引擎.reg_read(UC_ARM64_REG_X0)
        目标对象 = 引擎.reg_read(UC_ARM64_REG_X8)
        n = struct.unpack('<I', bytes(引擎.mem_read(源对象, 4)))[0]
        if n > 0x10000:
            raise RuntimeError(f'invalid copy limb count {n:#x}')
        源数据指针 = struct.unpack('<Q', bytes(引擎.mem_read(源对象 + 8, 8)))[0] if n else 0
        目标数据指针 = 命名空间['分配内存'](n * 4) if n else 0
        if n:
            引擎.mem_write(目标数据指针, bytes(引擎.mem_read(源数据指针, n * 4)))
        引擎.mem_write(目标对象, struct.pack('<IQ', n, 目标数据指针))
        引擎.reg_write(UC_ARM64_REG_PC, 基址 + 0xfcfe0)
        目标日志.write(f'MAP copy-object source={源对象:#x} dest={目标对象:#x} n={n}\n')
        引擎.hook_del(映射复制钩子引用)
    映射复制钩子引用 = 模拟器.hook_add(UC_HOOK_CODE, 映射复制钩子, begin=基址 + 0xfcfdc, end=基址 + 0xfcfdc)

if os.environ.get('映射FCF') == '1':
    def FCF映射钩子(引擎, 地址, 大小, 用户数据):
        引擎.reg_write(UC_ARM64_REG_LR, 基址 + 0xfcfe0)
        引擎.reg_write(UC_ARM64_REG_PC, 基址 + 0x8349c)
        目标日志.write('MAP fcf->0x8349c as BL, LR=0xfcfe0\n')
        引擎.hook_del(FCF映射钩子引用)
    FCF映射钩子引用 = 模拟器.hook_add(UC_HOOK_CODE, FCF映射钩子, begin=基址 + 0xfcfdc, end=基址 + 0xfcfdc)

if os.environ.get('捕获故障') == '1':
    import json
    def 故障捕获钩子(引擎, 地址, 大小, 用户数据):
        寄存器组 = {f'x{i}': 引擎.reg_read(UC_ARM64_REG_X0 + i) for i in range(31)}
        寄存器组['sp'] = 引擎.reg_read(UC_ARM64_REG_SP)
        寄存器组['pc'] = 引擎.reg_read(UC_ARM64_REG_PC)
        寄存器组['lr'] = 引擎.reg_read(UC_ARM64_REG_LR)
        结果 = {'寄存器组': {k: hex(v) for k, v in 寄存器组.items()}, '内存数据': {}}
        for 寄存器名, 地址值 in 寄存器组.items():
            if 寄存器名 in ('sp', 'x19', 'x29', 'x0', 'x8', 'x11', 'x30'):
                try:
                    结果['内存数据'][寄存器名] = bytes(引擎.mem_read(地址值, 0x100)).hex()
                except UcError:
                    结果['内存数据'][寄存器名] = None
        open(os.path.join(本目录, '故障现场.json'), 'w').write(json.dumps(结果, indent=2))
        print('fault context captured; stopping without SVC substitution')
        引擎.emu_stop()
    模拟器.hook_add(UC_HOOK_CODE, 故障捕获钩子, begin=基址 + 0xfcfdc, end=基址 + 0xfcfdc)

if os.environ.get('跟踪定位') == '1':
    定位现场 = {}
    def 定位入口钩子(引擎, 地址, 大小, 用户数据):
        定位现场.clear()
        for i, 寄存器 in enumerate((UC_ARM64_REG_X29, UC_ARM64_REG_X30, UC_ARM64_REG_SP)):
            定位现场[i] = 引擎.reg_read(寄存器)
        目标日志.write(f'LOCATE ENTER sp={定位现场[2]:#x} fp={定位现场[0]:#x}\n')
        上下文 = struct.unpack('<Q', bytes(引擎.mem_read(基址 + 0x1b0f70, 8)))[0]
        目标日志.write(f'  ctx={上下文:#x} data=' + bytes(引擎.mem_read(上下文, 0x2d0)).hex() + '\n')
        目标日志.write('  maps=' + 真实全局表['进程映射内容'].decode('utf-8', 'replace') + '\n')
    def 定位返回钩子(引擎, 地址, 大小, 用户数据):
        栈指针 = 引擎.reg_read(UC_ARM64_REG_SP)
        目标日志.write(f'LOCATE RET pc={地址-基址:#x} x0={引擎.reg_read(UC_ARM64_REG_X0):#x} sp={栈指针:#x}\n')
        try:
            目标日志.write('  frame=' + bytes(引擎.mem_read(栈指针, 0x80)).hex() + '\n')
        except UcError:
            pass
    模拟器.hook_add(UC_HOOK_CODE, 定位入口钩子, begin=基址 + 0x9659c, end=基址 + 0x9659c)
    for 偏移 in (0x173bd8, 0x174838, 0x96f14):
        模拟器.hook_add(UC_HOOK_CODE, 定位返回钩子, begin=基址 + 偏移, end=基址 + 偏移)
    # 记录 maps 行解析的实际输入及解析结果
    def 映射扫描钩子(引擎, 地址, 大小, 用户数据):
        寄存器x0 = 引擎.reg_read(UC_ARM64_REG_X0); 寄存器x1 = 引擎.reg_read(UC_ARM64_REG_X1)
        目标日志.write(f'MAPS SCAN in={命名空间["读取字符串"](寄存器x0, 256)!r} fmt={命名空间["读取字符串"](寄存器x1, 128)!r}\n')
    模拟器.hook_add(UC_HOOK_CODE, 映射扫描钩子, begin=基址 + 0x814c0, end=基址 + 0x814c0)
    def 映射读取钩子(引擎, 地址, 大小, 用户数据):
        寄存器x19 = 引擎.reg_read(UC_ARM64_REG_X19)
        try:
            数据 = bytes(引擎.mem_read(寄存器x19, 0x30))
            目标日志.write(f'MAPS READER pc={地址-基址:#x} fdinfo={数据.hex()} path={命名空间["读取字符串"](寄存器x19 + 0x24, 160)!r}\n')
        except UcError: pass
    for 偏移 in (0x1904cc, 0x19050c, 0x1905bc, 0x1906b8):
        模拟器.hook_add(UC_HOOK_CODE, 映射读取钩子, begin=基址 + 偏移, end=基址 + 偏移)

print('SNAPSHOT AND PROBES READY', flush=True)
目标初始化入口 = IL2CPP基址 + 目标初始偏移
print('il2cpp DT_INIT @', hex(目标初始化入口), flush=True)
from ELF工具库 import 启动进度心跳
启动进度心跳(模拟器, IL2CPP基址, 映像结束偏移, int(os.environ.get('进度间隔秒', '60')))
模拟器.reg_write(UC_ARM64_REG_SP, 栈基址 + 栈大小 - 0x1000)
模拟器.reg_write(UC_ARM64_REG_LR, 返回地址)
模拟器.reg_write(UC_ARM64_REG_X0, 0)
try:
    模拟器.emu_start(目标初始化入口, 返回地址, timeout=int(os.environ.get('模拟超时微秒', '10000000')), count=int(os.environ.get('指令上限', '200000000')))
    if 模拟器.reg_read(UC_ARM64_REG_PC) == 返回地址:
        print('il2cpp init reached return stub')
    elif 命名空间['已停止'][0]:
        print('il2cpp init stopped early')
    else:
        print('il2cpp init reached execution limit or timeout')
except UcError as e:
    程序计数器 = 模拟器.reg_read(UC_ARM64_REG_PC)
    print('EMU ERROR:', e, 'PC=', hex(程序计数器))
    # 崩溃诊断：关键全局对象与 ctx 状态
    def 诊断读取(偏移):
        try: return struct.unpack('<Q', bytes(模拟器.mem_read(基址 + 偏移, 8)))[0]
        except UcError: return None
    print('  [0x1a8ed8]=', hex(诊断读取(0x1a8ed8) or 0), ' [0x1a8e28]=', hex(诊断读取(0x1a8e28) or 0))
    对象指针 = 诊断读取(0x1a8ed8)
    if 对象指针 and 基址 <= 对象指针 < 基址 + 0x1c6000:
        o = 对象指针 - 基址
        print('  obj@', hex(o), '+0x98=', hex(诊断读取(o + 0x98) or 0), '+0xa0=', hex(诊断读取(o + 0xa0) or 0))
        print('  obj head:', bytes(模拟器.mem_read(对象指针, 32)).hex())
    print('  ctx[0x1b3070]=', hex(诊断读取(0x1b3070) or 0), ' flag[0x1b1020]=', hex(诊断读取(0x1b1020) or 0), ' real_fn[0x1b2bf8]=', hex(诊断读取(0x1b2bf8) or 0))
    # 垃圾 PC 的字节来源
    垃圾字节 = 程序计数器.to_bytes(8, 'little')
    影子明文 = open(os.path.join(本目录, '兼容库明文.bin'), 'rb').read()
    命中位置 = 影子明文.find(垃圾字节)
    print('  garbage PC bytes found in shadow at:', hex(命中位置) if 命中位置 >= 0 else 'not found')
    转储寄存器环()
# 转储 phase2 后的 compatible 内存
try:
    兼容层内存映像 = bytes(模拟器.mem_read(基址, 0x1c6000))
    open(os.path.join(本目录, '兼容库阶段2内存.bin'), 'wb').write(兼容层内存映像)
except UcError: pass
print('final PC:', hex(模拟器.reg_read(UC_ARM64_REG_PC)), 'LR:', hex(模拟器.reg_read(UC_ARM64_REG_LR)))
print('blocks:', 命名空间['基本块计数'][0], 'svc:', len(命名空间['系统调用日志']), 'heap:', hex(命名空间['堆指针'][0] - 命名空间['堆基址']))
日志.close()
# 在模拟结束时保存完整内存快照
import pickle
try:
    内存区域列表 = []
    for 区域起始, 区域结束, 区域权限 in 模拟器.mem_regions():
        区域大小 = 区域结束 - 区域起始 + 1
        if 区域起始 == 命名空间['堆基址']:
            区域大小 = min(区域大小, (命名空间['堆指针'][0] - 命名空间['堆基址'] + 0xfff) & ~0xfff)
        elif 区域起始 == 命名空间['栈基址']:
            区域起始 = 命名空间['栈基址'] + 命名空间['栈大小'] - 0x20000
            区域大小 = 0x20000
        内存区域列表.append((区域起始, 区域大小, bytes(模拟器.mem_read(区域起始, 区域大小))))
    pickle.dump(内存区域列表, open(os.path.join(本目录, '模幂快照_内存.pkl'), 'wb'), protocol=pickle.HIGHEST_PROTOCOL)
    print('memory snapshot saved')
except Exception as e:
    print(f'memory snapshot save failed: {e}')
# 转储 il2cpp 解密后内存
映像缓冲 = bytearray(映像结束偏移)
for 段 in 目标库ELF.iter_segments():
    if 段.header.p_type != 'PT_LOAD': continue
    段虚拟地址, 段内存大小 = 段.header.p_vaddr, 段.header.p_memsz
    映像缓冲[段虚拟地址:段虚拟地址+段内存大小] = bytes(模拟器.mem_read(IL2CPP基址 + 段虚拟地址, 段内存大小))
open(os.path.join(本目录, '目标库解密内存.bin'), 'wb').write(bytes(映像缓冲))
print('il2cpp memory dumped:', hex(映像结束偏移))
import json
with open(os.path.join(本目录, '目标写入统计.json'), 'w') as 输出文件:
    json.dump(目标写入摘要, 输出文件, indent=2)
print('target write summary:', 目标写入摘要)
print('loaded file cache:', list(命名空间['真实库缓存'].keys()))
已用堆大小 = 命名空间['堆指针'][0] - 命名空间['堆基址']
堆数据 = bytes(模拟器.mem_read(命名空间['堆基址'], 已用堆大小))
魔术码 = bytes.fromhex('af1bb1fa')
元数据偏移表 = []
位置 = 堆数据.find(魔术码)
while 位置 >= 0 and len(元数据偏移表) < 16:
    元数据偏移表.append(位置)
    位置 = 堆数据.find(魔术码, 位置 + 1)
print('metadata magic in heap:', [hex(x) for x in 元数据偏移表])
for 位置 in 元数据偏移表:
    可用数据 = 堆数据[位置:位置 + 0xbcdd9c]
    if len(可用数据) >= 0x100:
        open(os.path.join(本目录, f'元数据堆片段_{位置:x}.bin'), 'wb').write(可用数据)
        print('metadata heap candidate saved at', hex(位置))