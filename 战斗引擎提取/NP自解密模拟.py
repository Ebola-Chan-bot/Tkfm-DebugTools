import json, struct, sys, os
from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UcError
from unicorn.arm64_const import *
from unicorn import UC_HOOK_CODE, UC_HOOK_INTR, UC_HOOK_MEM_UNMAPPED, UC_HOOK_BLOCK
from ELF工具库 import 加载ELF, 动态段信息, 提取符号

脚本目录 = os.path.dirname(os.path.abspath(__file__))

基址 = 0x10000000
栈基址 = 0x20000000
栈大小 = 0x200000
线程本地存储 = 0x30000000
堆基址 = 0x40000000
堆大小 = 0x4000000
桩区基址 = 0x50000000
模拟数据区 = 0x60000000   # 模拟文件内容与结构体数据区
模拟数据区大小 = 0x100000

ELF文件, f = 加载ELF('libcompatible.so')
f.seek(0)
文件数据 = f.read()
d = 动态段信息(ELF文件)

模拟器 = Uc(UC_ARCH_ARM64, UC_MODE_ARM)
for 段 in ELF文件.iter_segments():
    if 段.header.p_type != 'PT_LOAD': continue
    段虚拟地址 = 段.header.p_vaddr; 段内存大小 = 段.header.p_memsz; 段文件大小 = 段.header.p_filesz; 段文件偏移 = 段.header.p_offset
    映射起始 = (基址 + 段虚拟地址) & ~0xfff
    映射结束 = (基址 + 段虚拟地址 + 段内存大小 + 0xfff) & ~0xfff
    try: 模拟器.mem_map(映射起始, 映射结束 - 映射起始)
    except UcError: pass
    模拟器.mem_write(基址 + 段虚拟地址, 文件数据[段文件偏移:段文件偏移+段文件大小])
模拟器.mem_map(栈基址, 栈大小); 模拟器.mem_map(线程本地存储, 0x10000)
模拟器.mem_map(堆基址, 堆大小); 模拟器.mem_map(桩区基址, 0x10000); 模拟器.mem_map(模拟数据区, 模拟数据区大小)
# 假 app_process64 模块内存（NP 会扫描 maps 里的 app_process 区间找 magisk 字符串）：干净零页
模拟器.mem_map(0x7000000000, 0x10000)
模拟器.mem_write(0x7000000000, b'\x00' * 0x10000)
模拟器.mem_write(线程本地存储 + 0x28, struct.pack('<Q', 0xdeadbeefcafe1234))
模拟器.reg_write(UC_ARM64_REG_TPIDR_EL0, 线程本地存储)
模拟器.reg_write(UC_ARM64_REG_SP, 栈基址 + 栈大小 - 0x1000)

# ---- 自解析链接器 ----
符号节 = [s for s in ELF文件.iter_sections() if s.header.sh_type == 'SHT_DYNSYM'][0]
动态符号列表 = list(符号节.iter_symbols())
已定义符号 = {}
for s in 动态符号列表:
    if s.name and s.entry.st_shndx != 'SHN_UNDEF' and isinstance(s.entry.st_shndx, int):
        if s.name not in 已定义符号:
            已定义符号[s.name] = s.entry.st_value

# 从动态段 DT_RELA/DT_JMPREL 解析重定位表：NP 抹除了重定位节头（节级解析结果为空），而动态段是加载器运行的必需数据、无法抹除
重定位表 = {'rela': [], 'jmp': []}
动态标签 = {}
for 段 in ELF文件.iter_segments():
    if 段.header.p_type == 'PT_DYNAMIC':
        for 标签 in 段.iter_tags():
            动态标签.setdefault(标签.entry.d_tag, 标签.entry.d_val)
def 虚拟转文件偏移(地址):
    for 段 in ELF文件.iter_segments():
        if 段.header.p_type == 'PT_LOAD' and 段.header.p_vaddr <= 地址 < 段.header.p_vaddr + 段.header.p_filesz:
            return 地址 - 段.header.p_vaddr + 段.header.p_offset
    raise ValueError(f'虚拟地址 {地址:#x} 不在任何 PT_LOAD 段内')
def 解析重定位表(表地址, 表大小):
    # 每条 Elf64_Rela 24 字节：r_offset(8) + r_info(8, 低32位类型/高32位符号索引) + r_addend(8)
    出 = []
    文件偏移 = 虚拟转文件偏移(表地址)
    for i in range(0, 表大小, 24):
        偏移, 信息, 加数 = struct.unpack_from('<QQq', 文件数据, 文件偏移 + i)
        符号索引 = 信息 >> 32
        符号 = 动态符号列表[符号索引] if 符号索引 else None
        名称 = 符号.name if 符号 else ''
        出.append((偏移, 信息 & 0xffffffff, 符号索引, 加数, 名称))
    return 出
重定位表['rela'] = 解析重定位表(动态标签['DT_RELA'], 动态标签['DT_RELASZ'])
重定位表['jmp'] = 解析重定位表(动态标签['DT_JMPREL'], 动态标签['DT_PLTRELSZ'])
if os.environ.get('跟踪启动') == '1': print(f'STARTUP: relocations loaded rela={len(重定位表["rela"])} jmp={len(重定位表["jmp"])}', flush=True)
桩地址映射 = {}; 桩名称映射 = {}
n = 0
def 获取桩地址(名称):
    global n
    if 名称 not in 桩地址映射:
        地址 = 桩区基址 + n * 16; n += 1
        桩地址映射[名称] = 地址
        桩名称映射[地址] = 名称
        模拟器.mem_write(地址, struct.pack('<I', 0xd65f03c0))
    return 桩地址映射[名称]

def 解析符号(名称, 符号条目):
    if 名称 in 已定义符号:
        return 基址 + 已定义符号[名称]
    if 符号条目 is not None and 符号条目.entry.st_shndx != 'SHN_UNDEF' and isinstance(符号条目.entry.st_shndx, int):
        return 基址 + 符号条目.entry.st_value
    return 获取桩地址(名称 or f'sym{符号条目}')

# 干净环境块：environ 指向 NULL 结尾的字符串指针数组（无 LD_PRELOAD 等可疑项）
环境字符串区 = 模拟数据区 + 0x1000
环境指针数组 = 模拟数据区 + 0x2000
环境变量字符串列表 = [b'PATH=/product/bin:/apex/com.android.runtime/bin:/system/bin', b'ANDROID_ROOT=/system', b'ANDROID_DATA=/data', b'EXTERNAL_STORAGE=/sdcard', b'ANDROID_ART_ROOT=/apex/com.android.art', b'ANDROID_I18N_ROOT=/apex/com.android.i18n', b'ANDROID_TZDATA_ROOT=/apex/com.android.tzdata', b'LOOP_MOUNTED=1']
写入指针 = 环境字符串区; 指针列表 = []
for s in 环境变量字符串列表:
    模拟器.mem_write(写入指针, s + b'\0'); 指针列表.append(写入指针); 写入指针 += len(s) + 1
模拟器.mem_write(环境指针数组, struct.pack(f'<{len(指针列表)+1}Q', *指针列表, 0))
环境变量槽 = 模拟数据区 + 0x3000  # environ 变量本身：GOT 存 &environ，[environ] = 指针数组
模拟器.mem_write(环境变量槽, struct.pack('<Q', 环境指针数组))

内部符号数 = 0; 外部符号数 = 0
for 重定位偏移, 重定位类型, 重定位符号, 重定位加数, 符号名 in 重定位表['rela']:
    if 重定位类型 == 1027:
        模拟器.mem_write(基址 + 重定位偏移, struct.pack('<Q', 基址 + 重定位加数))
    elif 重定位类型 == 257:
        if 重定位符号 == 0:
            模拟器.mem_write(基址 + 重定位偏移, struct.pack('<Q', 基址 + 重定位加数))
        else:
            s = 动态符号列表[重定位符号]
            v = 解析符号(s.name, s)
            if s.name in 已定义符号: 内部符号数 += 1
            else: 外部符号数 += 1
            模拟器.mem_write(基址 + 重定位偏移, struct.pack('<Q', v + 重定位加数))
    elif 重定位类型 == 1025:
        s = 动态符号列表[重定位符号]
        v = 环境变量槽 if s.name == 'environ' else 解析符号(s.name, s)
        模拟器.mem_write(基址 + 重定位偏移, struct.pack('<Q', v))
for 重定位偏移, 重定位类型, 重定位符号, 重定位加数, 符号名 in 重定位表['jmp']:
    if 重定位类型 == 1026:
        s = 动态符号列表[重定位符号]
        v = 环境变量槽 if s.name == 'environ' else 解析符号(s.name, s)
        模拟器.mem_write(基址 + 重定位偏移, struct.pack('<Q', v))
print(f'self-resolved: {内部符号数}+jmp, external stubs: {len(桩地址映射)}', flush=True)

# ---- 合成 libc/libm/libdl/liblog：NP 通过 maps+内存解析自建 libc 函数指针表(anti-hook)，必须提供可解析的 ELF ----
# 符号来源分两层：①自动提取——libcompatible.so dynsym 中全部 UNDEF 符号（148 个，即其直接导入）；②语义推断——NP 反 hook 机制动态解析的符号（91 个），由逆向 NP 函数指针表构建逻辑确定，不走重定位
_自动提取未定义符号 = sorted({s.name for s in 动态符号列表 if s.name and s.entry.st_shndx == 'SHN_UNDEF'})
# AAssetManager_open/AAsset_close/_environ/ioctl 不在 compatible 未定义符号里（NP 经 dlsym 动态查找），必须手工登记，缺失会使 NP JNI init 走环境异常分支给 il2cpp DT_INIT 写空桩直接返回
人工筛选符号 = ['AAssetManager_open', 'AAsset_close', '_environ', 'ioctl', 'fork', 'vfork', 'ptrace', 'inotify_init', 'inotify_add_watch', 'epoll_create', 'epoll_ctl', 'epoll_wait', 'socket', 'connect', 'send', 'recv', '__android_log_print', '__android_log_write', '__android_log_buf_write', 'system', 'popen', 'pclose', 'execvp', 'sigaction', 'signal', 'longjmp', 'setjmp', '__system_property_find', '__system_property_read', 'android_get_device_api_level', 'pthread_create', 'pthread_join', 'pthread_detach', 'pthread_mutex_lock', 'pthread_mutex_unlock', 'pthread_once', 'pthread_key_create', 'pthread_getspecific', 'pthread_setspecific', 'pthread_self', 'getenv', 'setenv', 'unsetenv', 'mmap', 'munmap', 'mprotect', 'madvise', 'open', 'openat', 'read', 'write', 'pread64', 'lseek', 'fstat', 'fstatat', 'access', 'faccessat', 'readlink', 'readlinkat', 'getdents64', 'gettid', 'geteuid', 'prctl', 'clone', 'kill', 'tgkill', 'raise', 'gettimeofday', 'sleep', 'usleep', 'futex', 'pipe2', 'uname', 'getpagesize', 'memalign', 'memcpy', 'memmove', 'memset', 'memcmp', 'memchr', 'strlen', 'strcmp', 'strncmp', 'strcpy', 'strncpy', 'strcat', 'strchr', 'strstr', 'strerror', 'atoi', 'atol', 'strtol', 'strtoul', 'snprintf', 'vsnprintf', 'sprintf', 'vsprintf', 'vasprintf', 'fopen', 'qsort', 'mktime', 'getentropy', 'strdup', 'strndup', 'sscanf', 'strrchr', 'strcasecmp', 'strncasecmp', 'bsearch', 'abs', 'labs', 'div', 'ldiv', 'isatty', 'tcgetattr', 'tcsetattr', 'pthread_rwlock_rdlock', 'pthread_rwlock_wrlock', 'pthread_rwlock_unlock', 'pthread_cond_broadcast', 'pthread_cond_timedwait', 'pthread_cond_destroy', 'pthread_mutex_init', 'pthread_mutex_destroy', 'pthread_mutex_trylock', 'pthread_mutexattr_init', 'pthread_mutexattr_destroy', 'pthread_mutexattr_settype', 'pthread_key_delete', '__memcpy_chk', '__memmove_chk', '__strlen_chk', '__open_2', '__read_chk', '__vsnprintf_chk', '__snprintf_chk', '__vsprintf_chk', '__vfprintf_chk', '__fprintf_chk', '__printf_chk', '__strncpy_chk', '__strcpy_chk', 'syscall']
补充符号 = sorted(set(_自动提取未定义符号) | set(人工筛选符号))
for 符号名 in 补充符号:
    if 符号名 not in 桩地址映射 and 符号名 not in 已定义符号:
        获取桩地址(符号名)
模拟库基址表 = {'libc.so': 0x7100000000, 'libm.so': 0x7200000000, 'libdl.so': 0x7300000000, 'liblog.so': 0x7400000000}
模拟库大小 = 0x10000
模拟库字节表 = {}
def 构建模拟库(库基址, 符号名列表):
    映像字节 = bytearray(模拟库大小)
    # ELF 头
    struct.pack_into('<16sHHIQQQIHHHHHH', 映像字节, 0,
        b'\x7fELF\x02\x01\x01\x00' + b'\0'*8, 3, 183, 1, 库基址, 0x40, 0, 0, 64, 56, 3, 64, 0, 0)
    # 程序头：PT_LOAD / PT_DYNAMIC / PT_GNU_STACK
    struct.pack_into('<IIQQQQQQ', 映像字节, 0x40, 1, 5, 0, 库基址, 库基址, 模拟库大小, 模拟库大小, 0x1000)
    struct.pack_into('<IIQQQQQQ', 映像字节, 0x40+56, 2, 6, 0x8000, 库基址+0x8000, 库基址+0x8000, 0x100, 0x100, 8)
    struct.pack_into('<IIQQQQQQ', 映像字节, 0x40+112, 0x6474e551, 6, 0, 0, 0, 0, 0, 16)
    # 字符串表 @0x4000
    字符串表偏移 = 0x4000; 字符串表 = bytearray(b'\0')
    名称偏移列表 = []
    for 符号名 in 符号名列表:
        名称偏移列表.append(len(字符串表)); 字符串表 += 符号名.encode() + b'\0'
    映像字节[字符串表偏移:字符串表偏移+len(字符串表)] = 字符串表
    # 动态符号表 @0x1000（第 0 项为空）
    符号表偏移 = 0x1000
    全部符号名 = [None] + 符号名列表
    for i, 符号名 in enumerate(全部符号名):
        o = 符号表偏移 + i*24
        if i == 0: continue
        if 符号名 in ('environ', '_environ'):
            值 = (环境变量槽 - 库基址) & 0xffffffffffffffff; 信息 = 0x11  # 全局对象
        else:
            桩地址 = 桩地址映射.get(符号名) or 获取桩地址(符号名)
            值 = (桩地址 - 库基址) & 0xffffffffffffffff; 信息 = 0x12  # 全局函数
        struct.pack_into('<IBBHQQ', 映像字节, o, 名称偏移列表[i-1], 信息, 0, 1, 值, 16)
    符号数量 = len(全部符号名)
    # SysV 哈希 @0x200：nbucket=1、nchain=符号数量
    struct.pack_into('<II', 映像字节, 0x200, 1, 符号数量)
    struct.pack_into('<I', 映像字节, 0x208, 1)  # bucket[0] = 符号 1
    for i in range(符号数量):
        下一槽位 = i+1 if 1 <= i < 符号数量-1 else 0
        struct.pack_into('<I', 映像字节, 0x20c + i*4, 下一槽位)
    # 动态段 @0x8000
    动态表项 = [(4, 库基址+0x200), (5, 库基址+字符串表偏移), (6, 库基址+符号表偏移), (10, len(字符串表)), (11, 24), (0, 0)]
    for i, (标签, 值) in enumerate(动态表项):
        struct.pack_into('<QQ', 映像字节, 0x8000 + i*16, 标签, 值)
    return bytes(映像字节)
_库符号名列表 = sorted(set(list(桩地址映射.keys()) + 补充符号))
for 库名, 库基址值 in 模拟库基址表.items():
    模拟器.mem_map(库基址值, 模拟库大小)
    映像成品 = 构建模拟库(库基址值, _库符号名列表)
    模拟器.mem_write(库基址值, 映像成品)
    模拟库字节表[库名] = 映像成品
print('fake libs built:', {k: hex(v) for k, v in 模拟库基址表.items()}, 'syms:', len(_库符号名列表))

# ---- 堆分配器 ----
随机数状态 = [42]
一次性初始化栈 = []
一次性初始化返回地址 = 桩区基址 + 0xe000
动态链接迭代返回地址 = 桩区基址 + 0xe100
模拟器.mem_write(动态链接迭代返回地址, struct.pack('<I', 0xd65f03c0))
桩名称映射[动态链接迭代返回地址] = '__dliter_ret'
动态链接迭代队列 = []
动态链接迭代状态 = {}
_映像结束 = max(s.header.p_vaddr + s.header.p_memsz for s in ELF文件.iter_segments() if s.header.p_type == 'PT_LOAD')
已加载模块 = [(基址, 基址 + _映像结束, '/data/app/lib/arm64/libcompatible.so')]
for _库名, _库基址 in 模拟库基址表.items():
    _库路径 = {'libc.so': '/system/lib64/libc.so', 'libm.so': '/system/lib64/libm.so', 'libdl.so': '/system/lib64/libdl.so', 'liblog.so': '/system/lib64/liblog.so'}[_库名]
    已加载模块.append((_库基址, _库基址 + 模拟库大小, _库路径))
堆指针 = [堆基址]
def 分配内存(大小, 清零=True):
    大小 = (大小 + 15) & ~15
    p = 堆指针[0]; 堆指针[0] += 大小
    if 堆指针[0] > 堆基址 + 堆大小 - 0x1000: raise RuntimeError('heap exhausted')
    if 清零: 模拟器.mem_write(p, b'\0' * 大小)
    return p

# ---- 模拟文件系统 ----
模拟文件表 = {}
下一个文件描述符 = [100]
文件描述符表 = {}   # 文件描述符 -> (路径, 位置)
def 模拟打开(路径):
    文件描述符 = 下一个文件描述符[0]; 下一个文件描述符[0] += 1
    文件描述符表[文件描述符] = [路径, 0]
    try: 日志.write(f'OPEN fd={文件描述符} {路径}\n')
    except (NameError, ValueError): pass
    return 文件描述符
进程状态内容 = b'Name:\tapp\nState:\tR (running)\nTgid:\t12345\nPid:\t12345\nPPid:\t1000\nTracerPid:\t0\nUid:\t10234\t10234\t10234\t10234\nGid:\t10234\nThreads:\t8\n'
进程映射内容 = (f'{基址:08x}-{基址+0x1d0000:08x} r-xp 00000000 fd:00 1234 /data/app/lib/arm64/libcompatible.so\n'
             f'{0x7000000000:08x}-{0x7000001000:08x} r-xp 00000000 fd:00 1235 /system/bin/app_process64\n'
             f'{0x7100000000:08x}-{0x7100010000:08x} r-xp 00000000 fd:00 1240 /system/lib64/libc.so\n'
             f'{0x7200000000:08x}-{0x7200010000:08x} r-xp 00000000 fd:00 1241 /system/lib64/libm.so\n'
             f'{0x7300000000:08x}-{0x7300010000:08x} r-xp 00000000 fd:00 1242 /system/lib64/libdl.so\n'
             f'{0x7400000000:08x}-{0x7400010000:08x} r-xp 00000000 fd:00 1243 /system/lib64/liblog.so\n').encode()
# 库文件由 生成快照.py 从当前 APK 提取后拷贝到脚本自身工作目录（模拟工作区），故直接从脚本目录提供文件内容，与游戏版本/构建无关，不依赖任何固定包名目录
安卓包库目录 = 脚本目录 + '/'
进程挂载内容 = (b'rootfs / rootfs ro,relatime 0 0\n'
    b'/dev/block/bootdevice/by-name/system /system ext4 ro,relatime,data=ordered 0 0\n'
    b'/dev/block/bootdevice/by-name/vendor /vendor ext4 ro,relatime,data=ordered 0 0\n'
    b'tmpfs /apex tmpfs rw,relatime,mode=0755 0 0\n'
    b'/dev/block/bootdevice/by-name/userdata /data ext4 rw,relatime,data=ordered 0 0\n'
    b'/apex/com.android.runtime/lib64/bionic/libc.so /apex/com.android.runtime/lib64/bionic/libc.so ext4 ro,relatime 0 0\n')
真实库缓存 = {}
def 库文件存在(路径):
    文件名 = 路径.rsplit('/', 1)[-1]
    return 文件名 in 模拟库字节表 or os.path.exists(安卓包库目录 + 文件名)
def 文件内容(路径):
    if 'urandom' in 路径 or 路径.endswith('/random'): return os.urandom(0x10000)
    if 'status' in 路径: return 进程状态内容
    if 'maps' in 路径: return 进程映射内容
    if 'mounts' in 路径: return 进程挂载内容
    if 路径.endswith('/cmdline'): return b'com.pinkcore.tkfm\x00'
    # 真实 APK 库文件：NP 解密 libil2cpp 时会自己 open/read 目标 so，必须给真字节
    文件名 = 路径.rsplit('/', 1)[-1]
    if 文件名 in 模拟库字节表: return 模拟库字节表[文件名]
    if 文件名.endswith('.so') or 文件名.endswith('.dat'):
        if 文件名 not in 真实库缓存:
            候选路径 = 安卓包库目录 + 文件名
            if not os.path.exists(候选路径) and 文件名 == 'global-metadata.dat':
                候选路径 = os.path.join(脚本目录, '元数据明文.dat')
            if not os.path.exists(候选路径):
                raise FileNotFoundError(f'库文件缺失: {候选路径} —— 工作目录必须包含 生成快照.py 从当前 APK 提取的库文件；静默返回空字节会让 NP 误判目标库为空并给 il2cpp DT_INIT 写空桩')
            真实库缓存[文件名] = open(候选路径, 'rb').read()
            日志.write(f'FILE serve {路径} -> {len(真实库缓存[文件名])} bytes\n')
        return 真实库缓存[文件名]
    return b''
def 写入文件状态(地址, 大小):
    状态缓冲 = bytearray(128)
    struct.pack_into('<I', 状态缓冲, 16, 0o100644)  # st_mode = 普通文件
    struct.pack_into('<Q', 状态缓冲, 48, 大小)      # st_size
    struct.pack_into('<I', 状态缓冲, 56, 4096)      # st_blksize
    模拟器.mem_write(地址, bytes(状态缓冲))

日志 = open(os.path.join(脚本目录, '阶段1追踪.txt'), 'w', buffering=1)
已停止 = [False]
系统调用日志 = []

def 读取字符串(地址, 最大长度=512):
    try: b = 模拟器.mem_read(地址, 最大长度)
    except UcError: return ''
    i = b.find(b'\0')
    return bytes(b[:i if i >= 0 else 最大长度]).decode('utf8', 'replace')

def 格式化变参(格式模板, 变参指针):
    # AAPCS64 va_list: {stack, gr_top, vr_top, gr_offs(i32), vr_offs(i32)}
    变参结构 = bytes(模拟器.mem_read(变参指针, 24))
    变参栈指针, 通用寄存器顶, 向量寄存器顶 = struct.unpack_from('<QQQ', 变参结构, 0)
    通用寄存器偏移, 向量寄存器偏移 = struct.unpack_from('<ii', 变参结构, 16)
    格式串 = 读取字符串(格式模板, 4096)
    try:
        日志.write(f'FMT @{格式模板-基址:#x}: {格式串!r}\n')
        if 通用寄存器顶: 日志.write(f'  va gr_save: {bytes(模拟器.mem_read(通用寄存器顶, 64)).hex()}\n')
        if 变参栈指针: 日志.write(f'  va stack: {bytes(模拟器.mem_read(变参栈指针, 32)).hex()}\n')
    except (NameError, ValueError, UcError): pass
    输出 = bytearray(); i = 0; 通用寄存器游标 = 通用寄存器顶 + 通用寄存器偏移; 栈游标 = 变参栈指针
    def 取下一个参数():
        nonlocal 通用寄存器游标, 通用寄存器偏移, 栈游标
        if 通用寄存器偏移 < 0:
            v = struct.unpack('<Q', bytes(模拟器.mem_read(通用寄存器游标, 8)))[0]; 通用寄存器游标 += 8; 通用寄存器偏移 += 8
        else:
            v = struct.unpack('<Q', bytes(模拟器.mem_read(栈游标, 8)))[0]; 栈游标 += 8
        return v
    while i < len(格式串):
        c = 格式串[i]
        if c == '%' and i + 1 < len(格式串):
            j = i + 1
            while j < len(格式串) and 格式串[j] in '0123456789.-+ #lhz': j += 1
            转换符 = 格式串[j] if j < len(格式串) else ''
            if 转换符 == 's': 输出 += 读取字符串(取下一个参数(), 1024).encode()
            elif 转换符 in 'duxX': 输出 += str(取下一个参数()).encode()
            elif 转换符 == 'p': 输出 += hex(取下一个参数()).encode()
            elif 转换符 == 'c': 输出 += bytes([取下一个参数() & 0xff])
            elif 转换符 == '%': 输出 += b'%'
            else: 输出 += 格式串[i:j+1].encode()
            i = j + 1
        else:
            输出 += c.encode(); i += 1
    return bytes(输出)

def 处理导入(名称, 引擎):
    x = [引擎.reg_read(r) for r in (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_X3, UC_ARM64_REG_X4, UC_ARM64_REG_X5)]
    返回值 = 0
    if 名称 in ('malloc',): 返回值 = 分配内存(x[0], 清零=False)
    elif 名称 == 'calloc': 返回值 = 分配内存(x[0] * x[1])
    elif 名称 == 'realloc':
        p = 分配内存(x[1], 清零=False)
        if x[0]:
            try: 模拟器.mem_write(p, bytes(模拟器.mem_read(x[0], min(x[1], 0x10000))))
            except UcError: pass
        返回值 = p
    elif 名称 == 'free': 返回值 = 0
    elif 名称 == 'rand':
        随机数状态[0] = (随机数状态[0] * 1103515245 + 12345) & 0x7fffffff
        返回值 = 随机数状态[0]
    elif 名称 == 'srand':
        随机数状态[0] = x[0] & 0x7fffffff; 返回值 = 0
    elif 名称 in ('memcpy', '__memcpy_chk'):
        try: 模拟器.mem_write(x[0], bytes(模拟器.mem_read(x[1], x[2])))
        except UcError as e: 日志.write(f'memcpy FAIL dst={x[0]:#x} src={x[1]:#x} n={x[2]:#x}: {e}\n')
        返回值 = x[0]
    elif 名称 in ('memmove', '__memmove_chk'):
        try:
            b = bytes(模拟器.mem_read(x[1], x[2]))
            模拟器.mem_write(x[0], b)
        except UcError: pass
        返回值 = x[0]
    elif 名称 == 'memset':
        try: 模拟器.mem_write(x[0], bytes([x[1] & 0xff]) * x[2])
        except UcError: pass
        返回值 = x[0]
    elif 名称 == 'memcmp':
        try:
            a = bytes(模拟器.mem_read(x[0], x[2])); b = bytes(模拟器.mem_read(x[1], x[2]))
            返回值 = (a > b) - (a < b)
        except UcError: 返回值 = 0
    elif 名称 in ('strlen', '__strlen_chk'):
        b = 模拟器.mem_read(x[0], 8192); i = b.find(b'\0'); 返回值 = i if i >= 0 else 8192
    elif 名称 in ('strcmp', 'strncmp'):
        a = 读取字符串(x[0]); b = 读取字符串(x[1])
        if 名称 == 'strncmp': a = a[:x[2]]; b = b[:x[2]]
        返回值 = (a > b) - (a < b)
    elif 名称 in ('strcpy', 'strncpy', 'strcat'):
        s = 读取字符串(x[1])
        模拟器.mem_write(x[0], s.encode() + b'\0'); 返回值 = x[0]
    elif 名称 == 'strchr':
        b = 模拟器.mem_read(x[0], 4096); i = b.find(bytes([x[1] & 0xff]))
        返回值 = x[0] + i if i >= 0 else 0
    elif 名称 == 'strstr':
        被搜串 = 读取字符串(x[0], 65536); 搜索单元 = 读取字符串(x[1])
        i = 被搜串.find(搜索单元); 返回值 = x[0] + i if i >= 0 else 0
    elif 名称 == 'getpid': 返回值 = 12345
    elif 名称 == 'gettid': 返回值 = 12345
    elif 名称 == 'getuid': 返回值 = 10234
    elif 名称 == 'geteuid': 返回值 = 10234
    elif 名称 == 'pthread_once':
        # 专用返回蹦床+LIFO栈：init返回到一次性初始化返回地址时弹栈恢复调用者LR，不依赖X0（init返回后X0已被污染）
        控制字, 初始化函数 = x[0], x[1]
        状态 = 0
        if 控制字:
            try: 状态 = int.from_bytes(模拟器.mem_read(控制字, 4), 'little')
            except UcError: 状态 = 2
        if 状态 == 2 or 状态 == 1 or not 初始化函数:
            返回值 = 0
        else:
            模拟器.mem_write(控制字, struct.pack('<I', 1))
            一次性初始化栈.append((控制字, 引擎.reg_read(UC_ARM64_REG_LR)))
            引擎.reg_write(UC_ARM64_REG_PC, 初始化函数)
            引擎.reg_write(UC_ARM64_REG_LR, 一次性初始化返回地址)
            return
    elif 名称 == '__once_ret':
        if 一次性初始化栈:
            控制字, 保存的返回地址 = 一次性初始化栈.pop()
            if 控制字: 模拟器.mem_write(控制字, struct.pack('<I', 2))
            引擎.reg_write(UC_ARM64_REG_LR, 保存的返回地址)
        引擎.reg_write(UC_ARM64_REG_X0, 0)
        return
    elif 名称 in ('pthread_mutex_lock', 'pthread_mutex_unlock', 'pthread_mutex_trylock', 'pthread_mutex_init', 'pthread_mutex_destroy', 'pthread_mutexattr_init', 'pthread_mutexattr_destroy', 'pthread_mutexattr_settype', 'pthread_rwlock_rdlock', 'pthread_rwlock_wrlock', 'pthread_rwlock_unlock', 'pthread_cond_broadcast', 'pthread_cond_destroy', 'pthread_cond_timedwait', 'pthread_key_create', 'pthread_setspecific', 'pthread_self'):
        返回值 = 0 if 名称 != 'pthread_self' else 线程本地存储 + 0x100
        if 名称 == 'pthread_key_create' and x[0]:
            模拟器.mem_write(x[0], struct.pack('<I', 7))
    elif 名称 == 'pthread_getspecific': 返回值 = 0
    elif 名称.startswith('pthread_create'):
        日志.write(f'!! pthread_create called (thread fn={x[2]:#x}) — returning success without running\n')
        if x[0]: 模拟器.mem_write(x[0], struct.pack('<Q', 0x9999))
        返回值 = 0
    elif 名称 == '__errno': 返回值 = 模拟数据区 + 0x100
    elif 名称 == 'dlopen':
        p = 读取字符串(x[0]); 日志.write(f'dlopen({p})\n'); 返回值 = 模拟数据区 + 0x200
    elif 名称 == 'dlsym':
        p = 读取字符串(x[1]); 日志.write(f'dlsym({p})\n')
        返回值 = 已定义符号.get(p, 0)
        if 返回值:
            返回值 = 基址 + 返回值
            日志.write(f'  dlsym internal {p} -> {返回值:#x}\n')
        else:
            返回值 = 获取桩地址('dlsym:' + p)
            日志.write(f'  dlsym external/fallback {p} -> {返回值:#x}\n')
    elif 名称 == 'dladdr':
        # 找包含 x0 地址的模块，填 Dl_info {fname, fbase, sname, saddr}
        目标地址 = x[0]
        所属模块 = None
        for 模块起始, 模块结束, 模块路径 in 已加载模块:
            if 模块起始 <= 目标地址 < 模块结束: 所属模块 = (模块起始, 模块结束, 模块路径); break
        if 所属模块 and x[1]:
            模块起始, 模块结束, 模块路径 = 所属模块
            名称指针 = 分配内存(len(模块路径) + 1); 模拟器.mem_write(名称指针, 模块路径.encode() + b'\0')
            符号名指针 = 0; 符号地址 = 0
            if 模块起始 == 基址:
                最佳匹配 = None
                for 符号名, 符号值 in 已定义符号.items():
                    if 符号值 <= 目标地址 - 基址 and (最佳匹配 is None or 符号值 > 最佳匹配[1]): 最佳匹配 = (符号名, 符号值)
                if 最佳匹配:
                    符号地址 = 基址 + 最佳匹配[1]
                    符号名指针 = 分配内存(len(最佳匹配[0]) + 1); 模拟器.mem_write(符号名指针, 最佳匹配[0].encode() + b'\0')
            模拟器.mem_write(x[1], struct.pack('<QQQQ', 名称指针, 模块起始, 符号名指针, 符号地址))
            返回值 = 1
        else:
            if x[1]: 模拟器.mem_write(x[1], b'\0' * 32)
            返回值 = 0
    elif 名称 == 'dl_iterate_phdr':
        # 真实遍历已加载模块，逐个调用回调；蹦床+队列实现
        回调函数, 回调数据 = x[0], x[1]
        动态链接迭代队列.clear()
        for 模块起始, 模块结束, 模块路径 in 已加载模块:
            信息块 = 分配内存(64)
            名称指针 = 分配内存(len(模块路径) + 1); 模拟器.mem_write(名称指针, 模块路径.encode() + b'\0')
            程序头数量 = struct.unpack_from('<H', bytes(模拟器.mem_read(模块起始 + 0x38, 2)), 0)[0]
            模拟器.mem_write(信息块, struct.pack('<QQQH', 模块起始, 名称指针, 模块起始 + 0x40, 程序头数量) + b'\0' * 40)
            动态链接迭代队列.append(信息块)
        动态链接迭代状态['回调'] = 回调函数; 动态链接迭代状态['回调数据'] = 回调数据
        动态链接迭代状态['调用者返回地址'] = 引擎.reg_read(UC_ARM64_REG_LR)
        动态链接迭代状态['结果'] = 0
        if 动态链接迭代队列:
            信息块 = 动态链接迭代队列.pop(0)
            引擎.reg_write(UC_ARM64_REG_X0, 信息块)
            引擎.reg_write(UC_ARM64_REG_X1, 32)
            引擎.reg_write(UC_ARM64_REG_X2, 回调数据)
            引擎.reg_write(UC_ARM64_REG_PC, 回调函数)
            引擎.reg_write(UC_ARM64_REG_LR, 动态链接迭代返回地址)
            return
        返回值 = 0
    elif 名称 == '__dliter_ret':
        r = 引擎.reg_read(UC_ARM64_REG_X0)
        if r != 0 or not 动态链接迭代队列:
            引擎.reg_write(UC_ARM64_REG_LR, 动态链接迭代状态['调用者返回地址'])
            引擎.reg_write(UC_ARM64_REG_X0, r)
            return
        信息块 = 动态链接迭代队列.pop(0)
        引擎.reg_write(UC_ARM64_REG_X0, 信息块)
        引擎.reg_write(UC_ARM64_REG_X1, 32)
        引擎.reg_write(UC_ARM64_REG_X2, 动态链接迭代状态['回调数据'])
        引擎.reg_write(UC_ARM64_REG_PC, 动态链接迭代状态['回调'])
        引擎.reg_write(UC_ARM64_REG_LR, 动态链接迭代返回地址)
        return
    elif 名称 == 'getenv':
        p = 读取字符串(x[0]); 返回值 = 0
    elif 名称 in ('setenv', 'unsetenv', 'putenv', 'clearenv'): 返回值 = 0
    elif 名称 == 'strerror_r':
        错误消息表 = {61: b'No data available', 2: b'No such file or directory', 13: b'Permission denied', 22: b'Invalid argument', 9: b'Bad file descriptor'}
        s = 错误消息表.get(x[0], b'Unknown error ' + str(x[0]).encode())
        模拟器.mem_write(x[1], s + b'\0'); 返回值 = 0
    elif 名称 == 'strerror':
        错误消息表 = {61: b'No data available', 2: b'No such file or directory', 13: b'Permission denied'}
        s = 错误消息表.get(x[0], b'Unknown error')
        p = 分配内存(len(s) + 1); 模拟器.mem_write(p, s + b'\0'); 返回值 = p
    elif 名称 in ('vsnprintf', '__vsnprintf_chk', 'vsprintf', '__vsprintf_chk'):
        if 名称 == '__vsnprintf_chk': 缓冲区, 格式模板, 变参指针 = x[0], x[4], x[5]
        elif 名称 == 'vsnprintf': 缓冲区, 格式模板, 变参指针 = x[0], x[2], x[3]
        else: 缓冲区, 格式模板, 变参指针 = x[0], x[1], x[2]
        try:
            日志.write(f'vsnprintf caller={引擎.reg_read(UC_ARM64_REG_LR)-基址:#x}\n')
            输出 = 格式化变参(格式模板, 变参指针)
            模拟器.mem_write(缓冲区, 输出 + b'\0'); 返回值 = len(输出)
            日志.write(f'fmt: {输出.decode("utf8", "replace")}\n')
        except (UcError, struct.error) as e:
            日志.write(f'vsnprintf FAIL: {e}\n'); 返回值 = 0
    elif 名称 in ('vfprintf', '__vfprintf_chk'):
        格式模板, 变参指针 = (x[1], x[2]) if 名称 == 'vfprintf' else (x[2], x[3])
        try:
            输出 = 格式化变参(格式模板, 变参指针); 返回值 = len(输出)
            日志.write(f'fprintf: {输出.decode("utf8", "replace")}\n')
        except (UcError, struct.error) as e:
            日志.write(f'vfprintf FAIL: {e}\n'); 返回值 = 0
    elif 名称 == 'vasprintf':
        try:
            日志.write(f'vasprintf caller={引擎.reg_read(UC_ARM64_REG_LR)-基址:#x}\n')
            输出 = 格式化变参(x[1], x[2])
            p = 分配内存(len(输出) + 1); 模拟器.mem_write(p, 输出 + b'\0')
            模拟器.mem_write(x[0], struct.pack('<Q', p)); 返回值 = len(输出)
            日志.write(f'asprintf: {输出.decode("utf8", "replace")}\n')
        except (UcError, struct.error) as e:
            日志.write(f'vasprintf FAIL: {e}\n'); 返回值 = -1
    elif 名称 == 'openlog':
        日志.write(f'openlog ident={读取字符串(x[0])}\n'); 返回值 = 0
    elif 名称 == 'syslog':
        日志.write(f'syslog pri={x[0]} fmt={读取字符串(x[1])}\n'); 返回值 = 0
    elif 名称 in ('snprintf', '__snprintf_chk', 'sprintf'):
        返回值 = 0
    elif 名称 in ('posix_memalign', 'memalign', 'aligned_alloc'):
        if 名称 == 'posix_memalign':
            p = 分配内存(x[2]); 模拟器.mem_write(x[0], struct.pack('<Q', p)); 返回值 = 0
        else:
            返回值 = 分配内存(x[1] if 名称 == 'memalign' else x[1])
    elif 名称 == '__system_property_get':
        p = 读取字符串(x[0])
        属性值表 = {'ro.build.version.sdk': b'33', 'ro.debuggable': b'0', 'ro.secure': b'1', 'ro.build.tags': b'release-keys'}
        v = 属性值表.get(p, b'')
        if x[1]: 模拟器.mem_write(x[1], v + b'\0')
        返回值 = len(v)
    elif 名称 == 'getauxval':
        返回值 = {16: 0x1ff, 3: 基址 + 0x40, 4: 56, 5: 10, 6: 4096}.get(x[0], 0)
    elif 名称 == 'sysconf': 返回值 = 4096
    elif 名称 == 'getentropy':
        try: 模拟器.mem_write(x[0], os.urandom(min(x[1], 256))); 返回值 = 0
        except UcError: 返回值 = -1
    elif 名称 == 'getpagesize': 返回值 = 4096
    elif 名称 in ('open', '__open_2'):
        p = 读取字符串(x[0]); 返回值 = 模拟打开(p)
    elif 名称 == 'openat':
        p = 读取字符串(x[1]); 返回值 = 模拟打开(p)
    elif 名称 == 'close':
        文件描述符表.pop(x[0], None); 返回值 = 0
    elif 名称 in ('read', '__read_chk'):
        文件信息 = 文件描述符表.get(x[0])
        if 文件信息:
            内容字节 = 文件内容(文件信息[0])
            数据块 = 内容字节[文件信息[1]:文件信息[1]+x[2]]
            文件信息[1] += len(数据块)
            try: 模拟器.mem_write(x[1], 数据块)
            except UcError: pass
            返回值 = len(数据块)
        else: 返回值 = 0
    elif 名称 == 'write': 返回值 = x[2]
    elif 名称 in ('fopen', 'fdopen'): 返回值 = 0
    elif 名称 == 'access':
        p = 读取字符串(x[0]); 返回值 = 0 if 库文件存在(p) else -1
    elif 名称 in ('lstat', 'stat'):
        p = 读取字符串(x[0])
        if 库文件存在(p): 写入文件状态(x[1], len(文件内容(p))); 返回值 = 0
        else: 返回值 = -1
    elif 名称 == 'mmap':
        映射大小 = (x[1] + 0xfff) & ~0xfff
        p = 分配内存(映射大小)
        返回值 = p
    elif 名称 == 'mprotect': 返回值 = 0
    elif 名称 == 'madvise': 返回值 = 0
    elif 名称 == 'munmap': 返回值 = 0
    elif 名称 in ('fork', 'vfork'):
        日志.write('!! fork called — returning fake child pid to parent\n'); 返回值 = 23456
    elif 名称 == 'kill':
        日志.write(f'!! kill(pid={x[0]}, sig={x[1]}) — NP DETECTION TRIGGERED?\n'); 返回值 = 0
    elif 名称 in ('exit', '_exit', 'abort'):
        日志.write(f'!! {名称}({x[0]}) — stopping\n'); 已停止[0] = True; 引擎.emu_stop()
    elif 名称 in ('clock_gettime', 'gettimeofday'):
        if x[1]: 模拟器.mem_write(x[1], struct.pack('<QQ', 1700000000, 0))
        返回值 = 0
    elif 名称 == 'clock': 返回值 = 1000000
    elif 名称 == 'time':
        if x[0]: 模拟器.mem_write(x[0], struct.pack('<Q', 1700000000))
        返回值 = 1700000000
    elif 名称 in ('nanosleep', 'usleep', 'sleep'): 返回值 = 0
    elif 名称 == 'prctl': 返回值 = 1 if x[0] == 3 else 0
    elif 名称 == 'syscall':
        日志.write(f'syscall({x[0]})\n'); 返回值 = 0
    elif 名称 == 'pipe':
        if x[0]: 模拟器.mem_write(x[0], struct.pack('<ii', 模拟打开('pipe_r'), 模拟打开('pipe_w')))
        返回值 = 0
    elif 名称 == 'dup2': 返回值 = x[1]
    elif 名称 == 'fcntl': 返回值 = 0
    elif 名称 in ('execl', 'execv', 'execve'):
        日志.write(f'!! {名称} — NP trying to exec\n'); 返回值 = -1
    elif 名称 == 'waitpid': 返回值 = -1
    elif 名称 == 'raise': 引擎.emu_stop()
    elif 名称 in ('__cxa_atexit',): 返回值 = 0
    elif 名称 == 'android_set_abort_message':
        try:
            原始字节 = bytes(模拟器.mem_read(x[0], 256))
            日志.write(f'!! abort message: {读取字符串(x[0])!r} raw={原始字节[:64].hex()}\n')
        except UcError:
            日志.write(f'!! abort message ptr={x[0]:#x} unreadable\n')
        返回值 = 0
    elif 名称 in ('fprintf', 'printf', 'fputc', 'fwrite', 'closelog', 'fflush'): 返回值 = 0
    elif 名称 == 'fgets': 返回值 = 0
    elif 名称 == 'feof': 返回值 = 1
    elif 名称 == 'fileno': 返回值 = 1
    elif 名称 == 'fclose': 返回值 = 0
    elif 名称 in ('atoi', 'atof', 'strtol', 'strtoul'): 返回值 = 0
    elif 名称 == 'qsort': 返回值 = 0
    elif 名称 in ('inflateInit2_', 'inflate', 'inflateEnd'): 返回值 = 0
    elif 名称.startswith('AAsset'): 返回值 = 0
    elif 名称 == 'dlclose': 返回值 = 0
    elif 名称 in ('mkdir',): 返回值 = 0
    elif 名称 in ('memchr',):
        b = 模拟器.mem_read(x[0], x[2]); i = b.find(bytes([x[1] & 0xff]))
        返回值 = x[0] + i if i >= 0 else 0
    elif 名称 == 'mktime': 返回值 = 0
    elif 名称 == '__scall_dispatch':
        处理系统调用(引擎)
        return
    else:
        日志.write(f'UNHANDLED import {名称} x0={x[0]:#x} x1={x[1]:#x}\n')
        返回值 = 0
    引擎.reg_write(UC_ARM64_REG_X0, 返回值 & 0xffffffffffffffff)

def 代码钩子(引擎, 地址, 大小, 用户数据):
    if 桩区基址 <= 地址 < 桩区基址 + 0x10000:
        名称 = 桩名称映射.get(地址, '?')
        处理导入(名称, 引擎)
def 中断钩子(引擎, 中断号, 用户数据):
    处理系统调用(引擎)

def 处理系统调用(引擎):
    系统调用号 = 引擎.reg_read(UC_ARM64_REG_X8)
    x = [引擎.reg_read(r) for r in (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_X3, UC_ARM64_REG_X4, UC_ARM64_REG_X5)]
    系统调用日志.append((系统调用号, x[0]))
    返回值 = 0
    # arm64 系统调用号
    if 系统调用号 == 222:  # mmap
        返回值 = 分配内存((x[1] + 0xfff) & ~0xfff)
    elif 系统调用号 == 226: 返回值 = 0  # mprotect
    elif 系统调用号 == 215: 返回值 = 0  # munmap
    elif 系统调用号 == 56:  # openat
        返回值 = 模拟打开(读取字符串(x[1]))
    elif 系统调用号 == 57:  # close
        文件描述符表.pop(x[0], None); 返回值 = 0
    elif 系统调用号 == 63:  # read
        文件信息 = 文件描述符表.get(x[0])
        if 文件信息:
            内容字节 = 文件内容(文件信息[0]); 数据块 = 内容字节[文件信息[1]:文件信息[1]+x[2]]; 文件信息[1] += len(数据块)
            try: 模拟器.mem_write(x[1], 数据块)
            except UcError: pass
            返回值 = len(数据块)
        else: 返回值 = 0
    elif 系统调用号 == 64: 返回值 = x[2]  # write
    elif 系统调用号 == 172: 返回值 = 12345  # getpid
    elif 系统调用号 == 178: 返回值 = 12345  # gettid
    elif 系统调用号 == 174: 返回值 = 10234  # getuid
    elif 系统调用号 == 220:  # clone
        日志.write('!! svc clone — parent path\n'); 返回值 = 23457
    elif 系统调用号 == 129: 返回值 = 0  # kill
    elif 系统调用号 == 93 or 系统调用号 == 94:
        日志.write(f'!! svc exit({x[0]})\n'); 已停止[0] = True; 引擎.emu_stop()
    elif 系统调用号 == 278:  # getentropy
        try: 模拟器.mem_write(x[0], os.urandom(min(x[1], 256))); 返回值 = 0
        except UcError: 返回值 = -1
    elif 系统调用号 == 160: 返回值 = 0  # uname -> fill?
    elif 系统调用号 == 167: 返回值 = 1 if x[0] == 3 else 0  # prctl: PR_GET_DUMPABLE=1
    elif 系统调用号 == 113:  # clock_gettime
        if x[1]: 模拟器.mem_write(x[1], struct.pack('<QQ', 1700000000, 0))
        返回值 = 0
    elif 系统调用号 == 101: 返回值 = 0  # nanosleep
    elif 系统调用号 == 59:  # pipe2
        if x[0]: 模拟器.mem_write(x[0], struct.pack('<ii', 模拟打开('pipe_r'), 模拟打开('pipe_w')))
        返回值 = 0
    elif 系统调用号 == 134: 返回值 = 0  # rt_sigaction
    elif 系统调用号 == 135: 返回值 = 0  # rt_sigprocmask
    elif 系统调用号 == 178 or 系统调用号 == 179: 返回值 = 0
    elif 系统调用号 == 48:  # faccessat
        p = 读取字符串(x[1])
        返回值 = 0 if 库文件存在(p) else -2
    elif 系统调用号 == 79:  # fstatat/newfstatat
        p = 读取字符串(x[1])
        try: c = 文件内容(p)
        except FileNotFoundError: c = b''  # 路径探测语义：不存在返回 ENOENT；必需库缺失会在 read/lseek 等消费路径直接抛出
        if c: 写入文件状态(x[2], len(c)); 返回值 = 0
        else: 返回值 = -2
    elif 系统调用号 == 80:  # fstat
        文件信息 = 文件描述符表.get(x[0])
        if 文件信息:
            写入文件状态(x[1], len(文件内容(文件信息[0]))); 返回值 = 0
        else: 返回值 = -2
    elif 系统调用号 == 29: 返回值 = 0  # ioctl
    elif 系统调用号 == 233: 返回值 = 0  # madvise
    elif 系统调用号 == 131: 返回值 = 0  # tgkill
    elif 系统调用号 == 260: 返回值 = -1  # wait4
    elif 系统调用号 == 117: 返回值 = 0  # ptrace
    elif 系统调用号 == 169: 返回值 = 0  # gettimeofday
    elif 系统调用号 == 96: 返回值 = 0  # set_tid_address
    elif 系统调用号 == 98: 返回值 = 0  # futex
    elif 系统调用号 == 99: 返回值 = 0  # set_robust_list
    elif 系统调用号 == 78:  # readlinkat
        s = b'/system/bin/app_process64'
        try: 模拟器.mem_write(x[2], s); 返回值 = len(s)
        except UcError: 返回值 = -1
    elif 系统调用号 == 61: 返回值 = 0  # getdents64 -> 空目录
    elif 系统调用号 == 62:  # lseek
        文件信息 = 文件描述符表.get(x[0])
        if 文件信息:
            文件总长 = len(文件内容(文件信息[0]))
            if x[2] == 0: 文件信息[1] = x[1]
            elif x[2] == 1: 文件信息[1] += x[1]
            else: 文件信息[1] = 文件总长 + x[1]
            返回值 = 文件信息[1]
        else: 返回值 = -1
    elif 系统调用号 == 67:  # pread64
        文件信息 = 文件描述符表.get(x[0])
        if 文件信息:
            数据块 = 文件内容(文件信息[0])[x[3]:x[3]+x[2]]
            try: 模拟器.mem_write(x[1], 数据块)
            except UcError: pass
            返回值 = len(数据块)
        else: 返回值 = 0
    elif 系统调用号 == 172+1: 返回值 = 0
    else:
        日志.write(f'SVC {系统调用号} x0={x[0]:#x} unhandled -> 0\n')
    日志.write(f'SVC {系统调用号} x0={x[0]:#x} -> {返回值:#x}\n')
    引擎.reg_write(UC_ARM64_REG_X0, 返回值 & 0xffffffffffffffff)

崩溃信息 = [None]
def 未映射钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
    程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC)
    日志.write(f'UNMAPPED access={访问类型} addr={地址:#x} size={大小} pc={程序计数器:#x} (vaddr {程序计数器-基址:#x})\n')
    崩溃信息[0] = (访问类型, 地址, 程序计数器)
    return False
模拟器.hook_add(UC_HOOK_CODE, 代码钩子, begin=桩区基址, end=桩区基址 + 0x10000)
模拟器.hook_add(UC_HOOK_INTR, 中断钩子)
模拟器.hook_add(UC_HOOK_MEM_UNMAPPED, 未映射钩子)
基本块计数 = [0]
from collections import deque
基本块环形记录 = deque(maxlen=3000)
def 基本块钩子(引擎, 地址, 大小, 用户数据):
    基本块计数[0] += 1
    基本块环形记录.append(地址)
    if 基本块计数[0] % 2_000_000 == 0:
        日志.write(f'BLOCK {基本块计数[0]} pc={地址:#x} vaddr={地址-基址:#x}\n')
    if 基本块计数[0] == 4_000_001:
        链接寄存器 = 引擎.reg_read(UC_ARM64_REG_LR)
        寄存器x0 = 引擎.reg_read(UC_ARM64_REG_X0); 寄存器x1 = 引擎.reg_read(UC_ARM64_REG_X1); 寄存器x2 = 引擎.reg_read(UC_ARM64_REG_X2)
        栈指针 = 引擎.reg_read(UC_ARM64_REG_SP)
        日志.write(f'DUMP pc={地址:#x} lr={链接寄存器:#x} (vaddr {链接寄存器-基址:#x}) x0={寄存器x0:#x} x1={寄存器x1:#x} x2={寄存器x2:#x} sp={栈指针:#x}\n')
        try:
            调用者代码 = bytes(引擎.mem_read(链接寄存器 - 32, 64))
            日志.write('caller code: ' + 调用者代码.hex() + '\n')
        except UcError: pass
if os.environ.get('跟踪基本块') == '1':
    模拟器.hook_add(UC_HOOK_BLOCK, 基本块钩子)

# 捕获 shadow 未完整恢复的区域：PC 首次进入时从活内存dump正确明文
已转储区域 = set()
def 实时转储钩子(引擎, 地址, 大小, 用户数据):
    v = 地址 - 基址
    for 区域 in (0x151000, 0x152000, 0x153000, 0x154000, 0x155000, 0x156000, 0x157000):
        if 区域 <= v < 区域 + 0x1000 and 区域 not in 已转储区域:
            已转储区域.add(区域)
            try:
                转储字节 = bytes(引擎.mem_read(基址 + 区域, 0x1000))
                open(os.path.join(脚本目录, f'实时页_{区域:x}.bin'), 'wb').write(转储字节)
                日志.write(f'LIVE DUMP region {区域:#x}\n')
            except UcError: pass
if os.environ.get('捕获初始化页') == '1':
    模拟器.hook_add(UC_HOOK_BLOCK, 实时转储钩子)

# 追踪字符串解密：0x138f64 入口记录描述符，0x1394e0(取cstr)入口转储解密结果
字符串解密计数 = [0]
def 字符串解密钩子(引擎, 地址, 大小, 用户数据):
    v = 地址 - 基址
    对象指针 = 引擎.reg_read(UC_ARM64_REG_X0); 描述符指针 = 引擎.reg_read(UC_ARM64_REG_X1)
    if v == 0x138f64:
        字符串解密计数[0] += 1
        if 字符串解密计数[0] <= 80:
            try: 描述符字节 = bytes(引擎.mem_read(描述符指针, 24)).hex()
            except UcError: 描述符字节 = '?'
            日志.write(f'STRDEC#{字符串解密计数[0]} obj={对象指针:#x} desc@{描述符指针:#x}={描述符字节}\n')
    elif v == 0x1394e0:
        if 字符串解密计数[0] <= 80:
            try:
                解密字节 = bytes(引擎.mem_read(对象指针 + 0x204, 48))
                原始字节 = bytes(引擎.mem_read(对象指针, 8))
                日志.write(f'  GETCSTR obj={对象指针:#x} raw={原始字节.hex()} dec@204={解密字节.hex()} ascii={解密字节[:32]!r}\n')
            except UcError: 日志.write(f'  GETCSTR obj={对象指针:#x} unreadable\n')
if os.environ.get('跟踪字符串解密') == '1':
    模拟器.hook_add(UC_HOOK_CODE, 字符串解密钩子, begin=基址 + 0x138f64, end=基址 + 0x138f64)
    模拟器.hook_add(UC_HOOK_CODE, 字符串解密钩子, begin=基址 + 0x1394e0, end=基址 + 0x1394e0)

def 转储回溯(引擎, 标签):
    栈指针 = 引擎.reg_read(UC_ARM64_REG_SP); 帧指针 = 引擎.reg_read(UC_ARM64_REG_X29)
    链接寄存器 = 引擎.reg_read(UC_ARM64_REG_LR)
    日志.write(f'{标签} LR={链接寄存器:#x} (vaddr {链接寄存器-基址:#x}) FP={帧指针:#x}\n')
    try:
        栈上字列表 = struct.unpack('<48Q', bytes(引擎.mem_read(栈指针, 48 * 8)))
        命中列表 = [f'{w:#x}(v{w-基址:#x})' for w in 栈上字列表 if 基址 <= w < 基址 + 0x1c6000]
        日志.write(f'{标签} stack code refs: {" ".join(命中列表[:24])}\n')
    except UcError: pass
    # FP 链
    for _ in range(12):
        if not (栈基址 <= 帧指针 < 栈基址 + 栈大小): break
        try:
            上一帧, 帧返回地址 = struct.unpack('<QQ', bytes(引擎.mem_read(帧指针, 16)))
        except UcError: break
        日志.write(f'{标签} frame fp={帧指针:#x} ret={帧返回地址:#x} (vaddr {帧返回地址-基址:#x})\n')
        帧指针 = 上一帧

def 抛出钩子(引擎, 地址, 大小, 用户数据):
    异常对象指针 = 引擎.reg_read(UC_ARM64_REG_X0); 类型信息指针 = 引擎.reg_read(UC_ARM64_REG_X1)
    类型名 = '?'
    try:
        类型名指针 = struct.unpack('<Q', bytes(引擎.mem_read(类型信息指针 + 8, 8)))[0]
        类型名 = 读取字符串(类型名指针, 256)
    except UcError: pass
    异常描述 = ''
    try:
        描述指针 = struct.unpack('<Q', bytes(引擎.mem_read(异常对象指针 + 8, 8)))[0]
        异常描述 = 读取字符串(描述指针, 512)
    except UcError: pass
    日志.write(f'!! __cxa_throw obj={异常对象指针:#x} type={类型名} what={异常描述!r}\n')
    转储回溯(引擎, 'THROW')
def 终止钩子(引擎, 地址, 大小, 用户数据):
    日志.write('!! std::terminate entered\n')
    转储回溯(引擎, 'TERM')
模拟器.hook_add(UC_HOOK_CODE, 抛出钩子, begin=基址 + 0xda270, end=基址 + 0xda270)
模拟器.hook_add(UC_HOOK_CODE, 终止钩子, begin=基址 + 0xdad30, end=基址 + 0xdad30)

from unicorn import UC_HOOK_MEM_WRITE
if os.environ.get('跟踪模块索引') == '1':
    def 模块索引钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
        程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC)
        print(f'MODULE INDEX WRITE value={写入值:#x} size={大小} pc={程序计数器-基址:#x} lr={引擎.reg_read(UC_ARM64_REG_LR)-基址:#x}', flush=True)
        if 写入值 != 0xffff and os.environ.get('停止模块索引') == '1':
            引擎.emu_stop()
    模拟器.hook_add(UC_HOOK_MEM_WRITE, 模块索引钩子, begin=基址 + 0x1aecfc, end=基址 + 0x1aecfc + 3)

if os.environ.get('跟踪初始化指针') == '1':
    def 初始化指针钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
        程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC)
        链接寄存器 = 引擎.reg_read(UC_ARM64_REG_LR)
        print('INIT POINTER WRITE', hex(地址), 'size', 大小, 'value', hex(写入值), 'PC', hex(程序计数器-基址), 'LR', hex(链接寄存器-基址), 'x0', hex(引擎.reg_read(UC_ARM64_REG_X0)), 'x1', hex(引擎.reg_read(UC_ARM64_REG_X1)), 'x2', hex(引擎.reg_read(UC_ARM64_REG_X2)), flush=True)
        if 写入值 == 基址 + 0x149d74 and os.environ.get('停止初始化指针') == '1':
            print('INIT POINTER CONTEXT', {名称: hex(引擎.reg_read(寄存器)) for 名称, 寄存器 in [('x8', UC_ARM64_REG_X8), ('x9', UC_ARM64_REG_X9), ('x19', UC_ARM64_REG_X19), ('x23', UC_ARM64_REG_X23), ('sp', UC_ARM64_REG_SP), ('fp', UC_ARM64_REG_X29)]}, flush=True)
            帧 = 引擎.reg_read(UC_ARM64_REG_X29)
            for _层级 in range(12):
                try:
                    上一帧, 帧返回地址 = struct.unpack('<QQ', bytes(引擎.mem_read(帧, 16)))
                    print('INIT STACK FRAME', _层级, 'fp', hex(帧), 'next', hex(上一帧), 'LR', hex(帧返回地址), 'LR_OFFSET', hex(帧返回地址-基址), flush=True)
                    if 上一帧 <= 帧:
                        break
                    帧 = 上一帧
                except UcError:
                    break
            with open(os.path.join(脚本目录, '初始化表处理器现场.bin'), 'wb') as 输出:
                输出.write(引擎.mem_read(基址 + 0x152000, 0x1000))
            已停止[0] = True
            引擎.emu_stop()
    模拟器.hook_add(UC_HOOK_MEM_WRITE, 初始化指针钩子, begin=0x40004f90, end=0x40004f90)

# 监视 mutex 区域(0x107000-0x108000)的写入：判断 DT_INIT 是否解密过该区域、是否随后重加密
区域写入计数 = [0]
def 区域写入钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
    区域写入计数[0] += 1
    n = 区域写入计数[0]
    if n <= 100 or n % 5000 == 0:
        程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC)
        日志.write(f'RW#{n} pc={程序计数器-基址:#x} addr={地址-基址:#x} size={大小} val={写入值:#x}\n')
    if 地址 <= 基址 + 0x1074a8 < 地址 + 大小 or 地址 == 基址 + 0x1074a8:
        区域快照 = bytes(引擎.mem_read(基址 + 0x107000, 0x1000))
        open(os.path.join(脚本目录, f'区域107_{n:06d}.bin'), 'wb').write(区域快照)
        程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC); 链接寄存器 = 引擎.reg_read(UC_ARM64_REG_LR)
        日志.write(f'RW snapshot at write#{n} pc={程序计数器-基址:#x} lr={链接寄存器-基址:#x} entry bytes={区域快照[0x4a8:0x4b8].hex()}\n')
if os.environ.get('跟踪区域写入') == '1':
    模拟器.hook_add(UC_HOOK_MEM_WRITE, 区域写入钩子, begin=基址 + 0x107000, end=基址 + 0x108000)

# 全代码段写监视：累积每个8字节槽的首次写入值(=解密结果)成影子明文镜像；任何槽第二次写入时另存即时快照
代码段结束偏移 = 0x1a0950
槽写入计数 = bytearray(代码段结束偏移 // 8 + 1)
影子明文 = bytearray(文件数据[:代码段结束偏移])
明文已捕获 = [False]
def 代码段写入钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
    偏移 = 地址 - 基址
    if 偏移 < 0 or 偏移 >= 代码段结束偏移: return
    槽位 = 偏移 >> 3
    首次写入 = 槽写入计数[槽位] == 0
    if 槽写入计数[槽位] < 255: 槽写入计数[槽位] += 1
    if 首次写入:
        写入字节 = (写入值 & ((1 << (大小 * 8)) - 1)).to_bytes(大小, 'little')
        影子明文[偏移:偏移+大小] = 写入字节
    elif 槽写入计数[槽位] == 2 and not 明文已捕获[0]:
        明文已捕获[0] = True
        程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC); 链接寄存器 = 引擎.reg_read(UC_ARM64_REG_LR)
        日志.write(f'REENC POINT at second write to {偏移:#x} pc={程序计数器-基址:#x} lr={链接寄存器-基址:#x}\n')
        转储回溯(引擎, 'REENC')
        即时快照 = bytes(引擎.mem_read(基址, 代码段结束偏移))
        open(os.path.join(脚本目录, '兼容库重加密点.bin'), 'wb').write(即时快照)
if os.environ.get('捕获代码写入') == '1' or not os.environ.get('跳过初始化') == '1':
    模拟器.hook_add(UC_HOOK_MEM_WRITE, 代码段写入钩子, begin=基址, end=基址 + 代码段结束偏移)

# 监视 NP 上下文指针槽的写入（libc函数表 ctx / 懒初始化标志 / 真实函数指针）
def 上下文写入钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
    程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC)
    日志.write(f'CTX WRITE [{地址-基址:#x}] = {写入值:#x} pc={程序计数器-基址:#x}\n')
if os.environ.get('跟踪状态写入') == '1':
    for 槽位 in (0x1b3070, 0x1b1020, 0x1b2bf8, 0x1b2b90, 0x1b2b98, 0x1b0f70, 0x1aecf0, 0x1b0ef0, 0x1b0ef8):
        模拟器.hook_add(UC_HOOK_MEM_WRITE, 上下文写入钩子, begin=基址 + 槽位, end=基址 + 槽位 + 8)
if os.environ.get('跟踪初始化上下文') == '1':
    def 初始化上下文钩子(引擎, 地址, 大小, 用户数据):
        print('INIT CONTEXT ENTER', hex(地址-基址), 'x0', hex(引擎.reg_read(UC_ARM64_REG_X0)), 'LR', hex(引擎.reg_read(UC_ARM64_REG_LR)-基址), flush=True)
    模拟器.hook_add(UC_HOOK_CODE, 初始化上下文钩子, begin=基址 + 0x8f1dc, end=基址 + 0x8f1dc)
    模拟器.hook_add(UC_HOOK_CODE, 初始化上下文钩子, begin=基址 + 0x8f00c, end=基址 + 0x8f00c)
    模拟器.hook_add(UC_HOOK_MEM_WRITE, 上下文写入钩子, begin=基址 + 0x1b3088, end=基址 + 0x1b3088 + 8)
if os.environ.get('跟踪初始化入口') == '1':
    def 初始化入口钩子(引擎, 地址, 大小, 用户数据):
        print('INIT ENTRY ENTER', hex(地址-基址), 'x0', hex(引擎.reg_read(UC_ARM64_REG_X0)), 'LR', hex(引擎.reg_read(UC_ARM64_REG_LR)-基址), 'SP', hex(引擎.reg_read(UC_ARM64_REG_SP)), flush=True)
        if os.environ.get('停止初始化入口') == '1':
            已停止[0] = True
            引擎.emu_stop()
    模拟器.hook_add(UC_HOOK_CODE, 初始化入口钩子, begin=基址 + 0x149d74, end=基址 + 0x149d74)
if os.environ.get('跟踪初始化注册') == '1':
    def 初始化注册钩子(引擎, 地址, 大小, 用户数据):
        print('INIT REGISTRATION ENTER', hex(地址-基址), 'x0', hex(引擎.reg_read(UC_ARM64_REG_X0)), 'x1', hex(引擎.reg_read(UC_ARM64_REG_X1)), 'LR', hex(引擎.reg_read(UC_ARM64_REG_LR)-基址), flush=True)
    def 初始化注册写入钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
        print('INIT REGISTRATION WRITE', hex(地址-基址), 'size', 大小, 'value', hex(写入值), 'PC', hex(引擎.reg_read(UC_ARM64_REG_PC)-基址), 'LR', hex(引擎.reg_read(UC_ARM64_REG_LR)-基址), flush=True)
    for _偏移 in (0x149d88, 0x149e2c, 0x14b3f4, 0x92454):
        模拟器.hook_add(UC_HOOK_CODE, 初始化注册钩子, begin=基址 + _偏移, end=基址 + _偏移)
    模拟器.hook_add(UC_HOOK_MEM_WRITE, 初始化注册写入钩子, begin=基址 + 0x1b32c0, end=基址 + 0x1b32c0)
    模拟器.hook_add(UC_HOOK_MEM_WRITE, 初始化注册写入钩子, begin=基址 + 0x1b30c0, end=基址 + 0x1b30c0 + 0x400)
# 宽域监视状态表区，捕捉覆盖 0x1b2bf8 的宽存储（str q/stp/memcpy）
def 状态区宽写入钩子(引擎, 访问类型, 地址, 大小, 写入值, 用户数据):
    程序计数器 = 引擎.reg_read(UC_ARM64_REG_PC)
    日志.write(f'BSS WRITE [{地址-基址:#x}] size={大小} val={写入值:#x} pc={程序计数器-基址:#x}\n')
if os.environ.get('跟踪状态写入') == '1':
    模拟器.hook_add(UC_HOOK_MEM_WRITE, 状态区宽写入钩子, begin=基址 + 0x1b2b00, end=基址 + 0x1b2c00)

返回地址 = 桩区基址 + 0xf000
模拟器.mem_write(返回地址, struct.pack('<I', 0xd65f03c0))
模拟器.mem_write(一次性初始化返回地址, struct.pack('<I', 0xd65f03c0))
桩名称映射[一次性初始化返回地址] = '__once_ret'
初始化入口 = 基址 + d['DT_INIT'][0]
print('DT_INIT @', hex(初始化入口), 'vaddr', hex(d['DT_INIT'][0]), flush=True)
跳过初始化 = os.environ.get('跳过初始化') == '1'
if 跳过初始化:
    import pickle
    _前缀 = os.environ.get('快照前缀') or ('模幂快照' if os.environ.get('续跑模式') == '1' else '阶段1快照')
    if os.environ.get('跟踪启动') == '1': print('STARTUP: restoring context', _前缀, flush=True)
    _上下文 = pickle.load(open(os.path.join(脚本目录, f'{_前缀}_上下文.pkl'), 'rb'))
    模拟器.context_restore(_上下文)
    _进程状态 = pickle.load(open(os.path.join(脚本目录, f'{_前缀}_进程状态.pkl'), 'rb'))
    快照进程状态 = _进程状态
    堆指针[0] = _进程状态['堆指针']; 下一个文件描述符[0] = _进程状态['下一个文件描述符']; 文件描述符表.update(_进程状态['文件描述符表']); 随机数状态[0] = _进程状态['随机数状态']
    已停止[0] = False
    # unicorn2 context 不含内存：显式恢复 DT_INIT 建立的全部内存状态；新快照可能包含原脚本尚未创建的il2cpp映射
    for _地址, _大小, _字节 in pickle.load(open(os.path.join(脚本目录, f'{_前缀}_内存.pkl'), 'rb')):
        if os.environ.get('续跑模式') == '1':
            _已有区域 = next(((a, b) for a, b, _ in 模拟器.mem_regions() if a <= _地址 and b >= _地址 + _大小 - 1), None)
            if _已有区域 is None:
                模拟器.mem_map(_地址, (_大小 + 0xfff) & ~0xfff)
                if os.environ.get('跟踪启动') == '1': print('STARTUP: mapped snapshot region', hex(_地址), hex(_大小), flush=True)
        模拟器.mem_write(_地址, _字节)
        if os.environ.get('跟踪启动') == '1': print('STARTUP: restored region', hex(_地址), hex(_大小), flush=True)
    print('SKIP_INIT: context + memory restored, heap used', hex(堆指针[0] - 堆基址), 'snapshot', _前缀, flush=True)
else:
    if os.environ.get('跟踪DT_AES') == '1':
        _aes日志 = open(os.path.join(脚本目录, 'AES调用日志.txt'), 'w', buffering=1)
        _aes计数 = [0]
        _aes钩子引用 = [None]
        def dt_aes钩子(引擎, 地址, 大小, 用户数据):
            if _aes计数[0] >= 40:
                引擎.hook_del(_aes钩子引用[0])
                return
            _aes计数[0] += 1
            x = [引擎.reg_read(UC_ARM64_REG_X0 + i) for i in range(5)]
            _aes日志.write(f'AES#{_aes计数[0]} args={[hex(v) for v in x]} lr={引擎.reg_read(UC_ARM64_REG_LR)-基址:#x}\n')
            try:
                _aes日志.write('  key/in=' + bytes(引擎.mem_read(x[1], 32)).hex() + '\n')
                _aes日志.write('  out-before=' + bytes(引擎.mem_read(x[2], 32)).hex() + '\n')
            except UcError:
                pass
        _aes钩子引用[0] = 模拟器.hook_add(UC_HOOK_CODE, dt_aes钩子, begin=基址 + 0x137968, end=基址 + 0x137968)
    if os.environ.get('捕获信号') == '1':
        _信号日志 = open(os.path.join(脚本目录, '信号安装日志_初始化.txt'), 'w', buffering=1)
        def dt信号钩子(引擎, 地址, 大小, 用户数据):
            旧动作地址 = 引擎.reg_read(UC_ARM64_REG_X0); 处理器地址 = 引擎.reg_read(UC_ARM64_REG_X1); 链接寄存器 = 引擎.reg_read(UC_ARM64_REG_LR)
            _信号日志.write(f'ENTER 0x93ef0 old_actions={旧动作地址:#x} handler={处理器地址:#x} handler_off={处理器地址-基址:#x} lr={链接寄存器:#x} lr_off={链接寄存器-基址:#x}\n')
            已停止[0] = True
            引擎.emu_stop()
        模拟器.hook_add(UC_HOOK_CODE, dt信号钩子, begin=基址 + 0x93ef0, end=基址 + 0x93ef0)
    模拟器.reg_write(UC_ARM64_REG_LR, 返回地址)
    try:
        模拟器.emu_start(初始化入口, 返回地址, timeout=int(os.environ.get('模拟超时微秒', '10000000')), count=2_000_000_000)
        print('init returned OK' if not 已停止[0] else 'init stopped early')
    except UcError as e:
        程序计数器 = 模拟器.reg_read(UC_ARM64_REG_PC)
        print('EMU ERROR:', e, 'PC=', hex(程序计数器), 'vaddr=', hex(程序计数器 - 基址))
print('blocks:', 基本块计数[0])
print('svc calls:', len(系统调用日志), 'heap used:', hex(堆指针[0] - 堆基址))
print('final PC:', hex(模拟器.reg_read(UC_ARM64_REG_PC)), 'LR:', hex(模拟器.reg_read(UC_ARM64_REG_LR)))
if os.environ.get('停止初始化指针') == '1' and 已停止[0]:
    日志.close()
    print('init pointer capture stopped without snapshot overwrite', flush=True)
    sys.exit(0)
日志.close()
import pickle
if not 跳过初始化 and os.environ.get('捕获信号') != '1':
    # 保存内存快照供后续分析
    with open(os.path.join(脚本目录, '阶段1状态.pkl'), 'wb') as 状态文件:
        pickle.dump({'堆指针': 堆指针[0], '已停止': 已停止[0], '崩溃信息': 崩溃信息[0]}, 状态文件)
    映像结束 = max(s.header.p_vaddr + s.header.p_memsz for s in ELF文件.iter_segments() if s.header.p_type == 'PT_LOAD')
    映像字节 = bytearray(映像结束)
    for s in ELF文件.iter_segments():
        if s.header.p_type != 'PT_LOAD': continue
        段虚拟地址, 段内存大小 = s.header.p_vaddr, s.header.p_memsz
        映像字节[段虚拟地址:段虚拟地址+段内存大小] = bytes(模拟器.mem_read(基址 + 段虚拟地址, 段内存大小))
    open(os.path.join(脚本目录, '兼容库内存.bin'), 'wb').write(bytes(映像字节))
    print('memory snapshot saved, size', hex(映像结束))
    open(os.path.join(脚本目录, '兼容库明文.bin'), 'wb').write(bytes(影子明文))
    已写槽数 = sum(1 for c in 槽写入计数 if c)
    print('shadow plaintext saved; slots written:', 已写槽数, 'double-written:', sum(1 for c in 槽写入计数 if c >= 2))
    # 尾部执行路径转储（用影子明文反汇编）
    from capstone import Cs, CS_ARCH_ARM64, CS_MODE_ARM
    _反汇编器 = Cs(CS_ARCH_ARM64, CS_MODE_ARM)
    with open(os.path.join(脚本目录, '尾部块反汇编.txt'), 'w') as 尾部转储文件:
        for 地址 in list(基本块环形记录)[-400:]:
            v = 地址 - 基址
            if not (0 <= v < 代码段结束偏移):
                尾部转储文件.write(f'{地址:#x} (outside image)\n'); continue
            指令 = next(_反汇编器.disasm(bytes(影子明文[v:v+4]), v), None)
            if 指令: 尾部转储文件.write(f'{v:#x}: {指令.mnemonic} {指令.op_str}\n')
            else: 尾部转储文件.write(f'{v:#x}: <undecodable> {影子明文[v:v+4].hex()}\n')
    print('tail blocks dumped')
    try:
        上下文 = 模拟器.context_save()
        pickle.dump(上下文, open(os.path.join(脚本目录, '阶段1快照_上下文.pkl'), 'wb'))
        pickle.dump({'堆指针': 堆指针[0], '下一个文件描述符': 下一个文件描述符[0], '文件描述符表': dict(文件描述符表), '随机数状态': 随机数状态[0]},
                    open(os.path.join(脚本目录, '阶段1快照_进程状态.pkl'), 'wb'))
        # 保存全部内存区域（unicorn2 context 不含内存），堆基址裁剪到已用、栈基址只存顶部
        # mem_regions 返回 (begin, end, perms)，end 为末字节地址
        _区域列表 = []
        for _r in 模拟器.mem_regions():
            _a, _e, _p = _r
            _s = _e - _a + 1
            if _a == 堆基址: _s = min(_s, (堆指针[0] - 堆基址 + 0xfff) & ~0xfff)
            elif _a == 栈基址: _a = 栈基址 + 栈大小 - 0x20000; _s = 0x20000
            elif _a == 线程本地存储: _s = 0x1000
            _区域列表.append((_a, _s, bytes(模拟器.mem_read(_a, _s))))
        pickle.dump(_区域列表, open(os.path.join(脚本目录, '阶段1快照_内存.pkl'), 'wb'))
        print('unicorn context + pystate + memory saved')
    except Exception as e:
        print('context save failed:', e)
