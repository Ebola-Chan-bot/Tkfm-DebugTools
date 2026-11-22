import json, struct, sys, os
from unicorn import Uc, UC_ARCH_ARM64, UC_MODE_ARM, UcError
from unicorn.arm64_const import *
from unicorn import UC_HOOK_CODE, UC_HOOK_INTR, UC_HOOK_MEM_UNMAPPED, UC_HOOK_BLOCK
from np_lib import load, dyninfo, symbols

BASE = 0x10000000
STACK = 0x20000000
STACK_SZ = 0x200000
TLS = 0x30000000
HEAP = 0x40000000
HEAP_SZ = 0x4000000
STUB = 0x50000000
FAKE = 0x60000000   # fake file contents / structs
FAKE_SZ = 0x100000

elf, f = load('libcompatible.so')
f.seek(0)
data = f.read()
d = dyninfo(elf)

mu = Uc(UC_ARCH_ARM64, UC_MODE_ARM)
for seg in elf.iter_segments():
    if seg.header.p_type != 'PT_LOAD': continue
    va = seg.header.p_vaddr; ms = seg.header.p_memsz; fsz = seg.header.p_filesz; off = seg.header.p_offset
    start = (BASE + va) & ~0xfff
    end = (BASE + va + ms + 0xfff) & ~0xfff
    try: mu.mem_map(start, end - start)
    except UcError: pass
    mu.mem_write(BASE + va, data[off:off+fsz])
mu.mem_map(STACK, STACK_SZ); mu.mem_map(TLS, 0x10000)
mu.mem_map(HEAP, HEAP_SZ); mu.mem_map(STUB, 0x10000); mu.mem_map(FAKE, FAKE_SZ)
# 假 app_process64 模块内存（NP 会扫描 maps 里的 app_process 区间找 magisk 字符串）：干净零页
mu.mem_map(0x7000000000, 0x10000)
mu.mem_write(0x7000000000, b'\x00' * 0x10000)
mu.mem_write(TLS + 0x28, struct.pack('<Q', 0xdeadbeefcafe1234))
mu.reg_write(UC_ARM64_REG_TPIDR_EL0, TLS)
mu.reg_write(UC_ARM64_REG_SP, STACK + STACK_SZ - 0x1000)

# ---- self-resolving linker ----
symsec = [s for s in elf.iter_sections() if s.header.sh_type == 'SHT_DYNSYM'][0]
symidx = list(symsec.iter_symbols())
defined = {}
for s in symidx:
    if s.name and s.entry.st_shndx != 'SHN_UNDEF' and isinstance(s.entry.st_shndx, int):
        if s.name not in defined:
            defined[s.name] = s.entry.st_value

relocs = json.load(open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/compatible_relocs.json'))
if os.environ.get('TRACE_STARTUP') == '1': print('STARTUP: relocations loaded', flush=True)
stub_by_name = {}; import_names = {}
n = 0
def stub_for(name):
    global n
    if name not in stub_by_name:
        addr = STUB + n * 16; n += 1
        stub_by_name[name] = addr
        import_names[addr] = name
        mu.mem_write(addr, struct.pack('<I', 0xd65f03c0))
    return stub_by_name[name]

def resolve(name, sym):
    if name in defined:
        return BASE + defined[name]
    if sym is not None and sym.entry.st_shndx != 'SHN_UNDEF' and isinstance(sym.entry.st_shndx, int):
        return BASE + sym.entry.st_value
    return stub_for(name or f'sym{sym}')

# 干净环境块：environ 指向 NULL 结尾的字符串指针数组（无 LD_PRELOAD 等可疑项）
ENV_STR = FAKE + 0x1000
ENV_ARR = FAKE + 0x2000
env_strings = [b'PATH=/product/bin:/apex/com.android.runtime/bin:/system/bin', b'ANDROID_ROOT=/system', b'ANDROID_DATA=/data', b'EXTERNAL_STORAGE=/sdcard', b'ANDROID_ART_ROOT=/apex/com.android.art', b'ANDROID_I18N_ROOT=/apex/com.android.i18n', b'ANDROID_TZDATA_ROOT=/apex/com.android.tzdata', b'LOOP_MOUNTED=1']
ep = ENV_STR; ptrs = []
for s in env_strings:
    mu.mem_write(ep, s + b'\0'); ptrs.append(ep); ep += len(s) + 1
mu.mem_write(ENV_ARR, struct.pack(f'<{len(ptrs)+1}Q', *ptrs, 0))
ENV_VAR = FAKE + 0x3000  # environ 变量本身：GOT 存 &environ，[environ] = 指针数组
mu.mem_write(ENV_VAR, struct.pack('<Q', ENV_ARR))

selfn = 0; extn = 0
for r_offset, r_type, r_sym, r_addend, name in relocs['rela']:
    if r_type == 1027:
        mu.mem_write(BASE + r_offset, struct.pack('<Q', BASE + r_addend))
    elif r_type == 257:
        if r_sym == 0:
            mu.mem_write(BASE + r_offset, struct.pack('<Q', BASE + r_addend))
        else:
            s = symidx[r_sym]
            v = resolve(s.name, s)
            if s.name in defined: selfn += 1
            else: extn += 1
            mu.mem_write(BASE + r_offset, struct.pack('<Q', v + r_addend))
    elif r_type == 1025:
        s = symidx[r_sym]
        v = ENV_VAR if s.name == 'environ' else resolve(s.name, s)
        mu.mem_write(BASE + r_offset, struct.pack('<Q', v))
for r_offset, r_type, r_sym, r_addend, name in relocs['jmp']:
    if r_type == 1026:
        s = symidx[r_sym]
        v = ENV_VAR if s.name == 'environ' else resolve(s.name, s)
        mu.mem_write(BASE + r_offset, struct.pack('<Q', v))
print(f'self-resolved: {selfn}+jmp, external stubs: {len(stub_by_name)}', flush=True)

# ---- 合成 libc/libm/libdl/liblog：NP 通过 maps+内存解析自建 libc 函数指针表(anti-hook)，必须提供可解析的 ELF ----
EXTRA_SYMS = ['fork', 'vfork', 'ptrace', 'syscall', 'inotify_init', 'inotify_add_watch', 'epoll_create', 'epoll_ctl', 'epoll_wait', 'socket', 'connect', 'send', 'recv', '__android_log_print', '__android_log_write', '__android_log_buf_write', 'system', 'popen', 'pclose', 'execvp', 'wait4', 'sigaction', 'signal', 'longjmp', 'setjmp', 'getauxval', '__system_property_get', '__system_property_find', '__system_property_read', 'android_get_device_api_level', 'dl_iterate_phdr', 'dladdr', 'dlopen', 'dlsym', 'dlclose', 'pthread_create', 'pthread_join', 'pthread_detach', 'pthread_mutex_lock', 'pthread_mutex_unlock', 'pthread_once', 'pthread_key_create', 'pthread_getspecific', 'pthread_setspecific', 'pthread_self', 'getenv', 'setenv', 'unsetenv', 'mmap', 'munmap', 'mprotect', 'madvise', 'open', 'openat', 'close', 'read', 'write', 'pread64', 'lseek', 'fstat', 'fstatat', 'stat', 'lstat', 'access', 'faccessat', 'readlink', 'readlinkat', 'getdents64', 'getpid', 'gettid', 'getuid', 'geteuid', 'prctl', 'clone', 'kill', 'tgkill', 'exit', '_exit', 'abort', 'raise', 'clock_gettime', 'gettimeofday', 'time', 'nanosleep', 'usleep', 'sleep', 'futex', 'pipe', 'pipe2', 'dup2', 'fcntl', 'ioctl', 'uname', 'sysconf', 'getpagesize', 'malloc', 'calloc', 'realloc', 'free', 'posix_memalign', 'memalign', 'memcpy', 'memmove', 'memset', 'memcmp', 'memchr', 'strlen', 'strcmp', 'strncmp', 'strcpy', 'strncpy', 'strcat', 'strchr', 'strstr', 'strerror', 'strerror_r', 'atoi', 'atol', 'strtol', 'strtoul', 'snprintf', 'vsnprintf', 'sprintf', 'vsprintf', 'printf', 'fprintf', 'vfprintf', 'vasprintf', 'fopen', 'fdopen', 'fclose', 'fgets', 'feof', 'fileno', 'fflush', 'fwrite', 'fputc', 'qsort', 'mktime', 'rand', 'srand', 'getentropy', 'openlog', 'syslog', 'closelog', '__errno', 'environ', '_environ', '__cxa_atexit', '__cxa_finalize', 'android_set_abort_message', 'inflateInit2_', 'inflate', 'inflateEnd', 'AAssetManager_open', 'AAsset_read', 'AAsset_close', 'AAsset_getLength', 'mkdir', 'strdup', 'strndup', 'sscanf', 'strrchr', 'strcasecmp', 'strncasecmp', 'bsearch', 'abs', 'labs', 'div', 'ldiv', 'strtod', 'atof', 'isatty', 'tcgetattr', 'tcsetattr', 'pthread_rwlock_rdlock', 'pthread_rwlock_wrlock', 'pthread_rwlock_unlock', 'pthread_cond_broadcast', 'pthread_cond_timedwait', 'pthread_cond_destroy', 'pthread_mutex_init', 'pthread_mutex_destroy', 'pthread_mutex_trylock', 'pthread_mutexattr_init', 'pthread_mutexattr_destroy', 'pthread_mutexattr_settype', 'pthread_key_delete', '__memcpy_chk', '__memmove_chk', '__strlen_chk', '__open_2', '__read_chk', '__vsnprintf_chk', '__snprintf_chk', '__vsprintf_chk', '__vfprintf_chk', '__fprintf_chk', '__printf_chk', '__strncpy_chk', '__strcpy_chk', 'syscall']
for nm in EXTRA_SYMS:
    if nm not in stub_by_name and nm not in defined:
        stub_for(nm)
FAKE_LIB_BASES = {'libc.so': 0x7100000000, 'libm.so': 0x7200000000, 'libdl.so': 0x7300000000, 'liblog.so': 0x7400000000}
FAKE_LIB_SZ = 0x10000
fake_lib_bytes = {}
def build_fake_lib(base, names):
    img = bytearray(FAKE_LIB_SZ)
    # ELF header
    struct.pack_into('<16sHHIQQQIHHHHHH', img, 0,
        b'\x7fELF\x02\x01\x01\x00' + b'\0'*8, 3, 183, 1, base, 0x40, 0, 0, 64, 56, 3, 64, 0, 0)
    # phdrs: PT_LOAD / PT_DYNAMIC / PT_GNU_STACK
    struct.pack_into('<IIQQQQQQ', img, 0x40, 1, 5, 0, base, base, FAKE_LIB_SZ, FAKE_LIB_SZ, 0x1000)
    struct.pack_into('<IIQQQQQQ', img, 0x40+56, 2, 6, 0x8000, base+0x8000, base+0x8000, 0x100, 0x100, 8)
    struct.pack_into('<IIQQQQQQ', img, 0x40+112, 0x6474e551, 6, 0, 0, 0, 0, 0, 16)
    # strtab @0x4000
    stroff = 0x4000; strtab = bytearray(b'\0')
    name_offs = []
    for nm in names:
        name_offs.append(len(strtab)); strtab += nm.encode() + b'\0'
    img[stroff:stroff+len(strtab)] = strtab
    # dynsym @0x1000 (slot 0 = null)
    symoff = 0x1000
    all_names = [None] + names
    for i, nm in enumerate(all_names):
        o = symoff + i*24
        if i == 0: continue
        if nm in ('environ', '_environ'):
            val = (ENV_VAR - base) & 0xffffffffffffffff; info = 0x11  # GLOBAL OBJECT
        else:
            sa = stub_by_name.get(nm) or stub_for(nm)
            val = (sa - base) & 0xffffffffffffffff; info = 0x12  # GLOBAL FUNC
        struct.pack_into('<IBBHQQ', img, o, name_offs[i-1], info, 0, 1, val, 16)
    nsyms = len(all_names)
    # SysV hash @0x200: nbucket=1, nchain=nsyms
    struct.pack_into('<II', img, 0x200, 1, nsyms)
    struct.pack_into('<I', img, 0x208, 1)  # bucket[0] = sym 1
    for i in range(nsyms):
        nxt = i+1 if 1 <= i < nsyms-1 else 0
        struct.pack_into('<I', img, 0x20c + i*4, nxt)
    # dynamic @0x8000
    dyn = [(4, base+0x200), (5, base+stroff), (6, base+symoff), (10, len(strtab)), (11, 24), (0, 0)]
    for i, (tag, val) in enumerate(dyn):
        struct.pack_into('<QQ', img, 0x8000 + i*16, tag, val)
    return bytes(img)
_lib_names = sorted(set(list(stub_by_name.keys()) + EXTRA_SYMS))
for libname, lb in FAKE_LIB_BASES.items():
    mu.mem_map(lb, FAKE_LIB_SZ)
    imgb = build_fake_lib(lb, _lib_names)
    mu.mem_write(lb, imgb)
    fake_lib_bytes[libname] = imgb
print('fake libs built:', {k: hex(v) for k, v in FAKE_LIB_BASES.items()}, 'syms:', len(_lib_names))

# ---- heap bump allocator ----
rand_state = [42]
once_stack = []
ONCE_RET = STUB + 0xe000
DLITER_RET = STUB + 0xe100
mu.mem_write(DLITER_RET, struct.pack('<I', 0xd65f03c0))
import_names[DLITER_RET] = '__dliter_ret'
dliter_queue = []
dliter_state = {}
_img_end_c = max(s.header.p_vaddr + s.header.p_memsz for s in elf.iter_segments() if s.header.p_type == 'PT_LOAD')
loaded_modules = [(BASE, BASE + _img_end_c, '/data/app/lib/arm64/libcompatible.so')]
for _ln, _lb in FAKE_LIB_BASES.items():
    _p = {'libc.so': '/system/lib64/libc.so', 'libm.so': '/system/lib64/libm.so', 'libdl.so': '/system/lib64/libdl.so', 'liblog.so': '/system/lib64/liblog.so'}[_ln]
    loaded_modules.append((_lb, _lb + FAKE_LIB_SZ, _p))
heap_ptr = [HEAP]
def alloc(sz, zero=True):
    if globals().get('trace_allocations'):
        allocation_log.write(f'ALLOC size={sz:#x} ptr={heap_ptr[0]:#x} pc={mu.reg_read(UC_ARM64_REG_PC)-BASE:#x} lr={mu.reg_read(UC_ARM64_REG_LR)-BASE:#x}\n')
    sz = (sz + 15) & ~15
    p = heap_ptr[0]; heap_ptr[0] += sz
    if heap_ptr[0] > HEAP + HEAP_SZ - 0x1000: raise RuntimeError('heap exhausted')
    if zero: mu.mem_write(p, b'\0' * sz)
    return p

# ---- fake filesystem ----
fake_files = {}
fd_next = [100]
fd_map = {}   # fd -> (name, pos)
def fake_open(path):
    fd = fd_next[0]; fd_next[0] += 1
    fd_map[fd] = [path, 0]
    try: log.write(f'OPEN fd={fd} {path}\n')
    except (NameError, ValueError): pass
    return fd
PROC_STATUS = b'Name:\tapp\nState:\tR (running)\nTgid:\t12345\nPid:\t12345\nPPid:\t1000\nTracerPid:\t0\nUid:\t10234\t10234\t10234\t10234\nGid:\t10234\nThreads:\t8\n'
PROC_MAPS = (f'{BASE:08x}-{BASE+0x1d0000:08x} r-xp 00000000 fd:00 1234 /data/app/lib/arm64/libcompatible.so\n'
             f'{0x7000000000:08x}-{0x7000001000:08x} r-xp 00000000 fd:00 1235 /system/bin/app_process64\n'
             f'{0x7100000000:08x}-{0x7100010000:08x} r-xp 00000000 fd:00 1240 /system/lib64/libc.so\n'
             f'{0x7200000000:08x}-{0x7200010000:08x} r-xp 00000000 fd:00 1241 /system/lib64/libm.so\n'
             f'{0x7300000000:08x}-{0x7300010000:08x} r-xp 00000000 fd:00 1242 /system/lib64/libdl.so\n'
             f'{0x7400000000:08x}-{0x7400010000:08x} r-xp 00000000 fd:00 1243 /system/lib64/liblog.so\n').encode()
APK_LIB = 'D:/天下布魔/0923_63_1_TenkafuMADiablosHarem/lib/arm64-v8a/'
PROC_MOUNTS = (b'rootfs / rootfs ro,relatime 0 0\n'
    b'/dev/block/bootdevice/by-name/system /system ext4 ro,relatime,data=ordered 0 0\n'
    b'/dev/block/bootdevice/by-name/vendor /vendor ext4 ro,relatime,data=ordered 0 0\n'
    b'tmpfs /apex tmpfs rw,relatime,mode=0755 0 0\n'
    b'/dev/block/bootdevice/by-name/userdata /data ext4 rw,relatime,data=ordered 0 0\n'
    b'/apex/com.android.runtime/lib64/bionic/libc.so /apex/com.android.runtime/lib64/bionic/libc.so ext4 ro,relatime 0 0\n')
real_cache = {}
def lib_exists(path):
    base = path.rsplit('/', 1)[-1]
    return base in fake_lib_bytes or os.path.exists(APK_LIB + base)
def file_content(path):
    if 'urandom' in path or path.endswith('/random'): return os.urandom(0x10000)
    if 'status' in path: return PROC_STATUS
    if 'maps' in path: return PROC_MAPS
    if 'mounts' in path: return PROC_MOUNTS
    if path.endswith('/cmdline'): return b'com.pinkcore.tkfm\x00'
    # 真实 APK 库文件：NP 解密 libil2cpp 时会自己 open/read 目标 so，必须给真字节
    base = path.rsplit('/', 1)[-1]
    if base in fake_lib_bytes: return fake_lib_bytes[base]
    if base.endswith('.so') or base.endswith('.dat'):
        if base not in real_cache:
            cand = APK_LIB + base
            if not os.path.exists(cand) and base == 'global-metadata.dat':
                cand = 'D:/天下布魔/0923_63_1_TenkafuMADiablosHarem/assets/bin/Data/Managed/Metadata/global-metadata.dat'
            real_cache[base] = open(cand, 'rb').read() if os.path.exists(cand) else b''
            log.write(f'FILE serve {path} -> {len(real_cache[base])} bytes\n')
        return real_cache[base]
    return b''
def write_stat(addr, size):
    buf = bytearray(128)
    struct.pack_into('<I', buf, 16, 0o100644)  # st_mode = regular file
    struct.pack_into('<Q', buf, 48, size)      # st_size
    struct.pack_into('<I', buf, 56, 4096)      # st_blksize
    mu.mem_write(addr, bytes(buf))

log = open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/emu2_trace.txt', 'w', buffering=1)
stopped = [False]
svc_log = []

def read_cstr(addr, maxlen=512):
    try: b = mu.mem_read(addr, maxlen)
    except UcError: return ''
    i = b.find(b'\0')
    return bytes(b[:i if i >= 0 else maxlen]).decode('utf8', 'replace')

def fmt_va(fmt, ap):
    # AAPCS64 va_list: {stack, gr_top, vr_top, gr_offs(i32), vr_offs(i32)}
    va = bytes(mu.mem_read(ap, 24))
    stack, gr_top, vr_top = struct.unpack_from('<QQQ', va, 0)
    gr_offs, vr_offs = struct.unpack_from('<ii', va, 16)
    fmt_s = read_cstr(fmt, 4096)
    try:
        log.write(f'FMT @{fmt-BASE:#x}: {fmt_s!r}\n')
        if gr_top: log.write(f'  va gr_save: {bytes(mu.mem_read(gr_top, 64)).hex()}\n')
        if stack: log.write(f'  va stack: {bytes(mu.mem_read(stack, 32)).hex()}\n')
    except (NameError, ValueError, UcError): pass
    out = bytearray(); i = 0; gr = gr_top + gr_offs; stk = stack
    def next_arg():
        nonlocal gr, gr_offs, stk
        if gr_offs < 0:
            v = struct.unpack('<Q', bytes(mu.mem_read(gr, 8)))[0]; gr += 8; gr_offs += 8
        else:
            v = struct.unpack('<Q', bytes(mu.mem_read(stk, 8)))[0]; stk += 8
        return v
    while i < len(fmt_s):
        c = fmt_s[i]
        if c == '%' and i + 1 < len(fmt_s):
            j = i + 1
            while j < len(fmt_s) and fmt_s[j] in '0123456789.-+ #lhz': j += 1
            spec = fmt_s[j] if j < len(fmt_s) else ''
            if spec == 's': out += read_cstr(next_arg(), 1024).encode()
            elif spec in 'duxX': out += str(next_arg()).encode()
            elif spec == 'p': out += hex(next_arg()).encode()
            elif spec == 'c': out += bytes([next_arg() & 0xff])
            elif spec == '%': out += b'%'
            else: out += fmt_s[i:j+1].encode()
            i = j + 1
        else:
            out += c.encode(); i += 1
    return bytes(out)

def handle_import(name, uc):
    x = [uc.reg_read(r) for r in (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_X3, UC_ARM64_REG_X4, UC_ARM64_REG_X5)]
    ret = 0
    if name in ('malloc',): ret = alloc(x[0], zero=False)
    elif name == 'calloc': ret = alloc(x[0] * x[1])
    elif name == 'realloc':
        p = alloc(x[1], zero=False)
        if x[0]:
            try: mu.mem_write(p, bytes(mu.mem_read(x[0], min(x[1], 0x10000))))
            except UcError: pass
        ret = p
    elif name == 'free': ret = 0
    elif name == 'rand':
        rand_state[0] = (rand_state[0] * 1103515245 + 12345) & 0x7fffffff
        ret = rand_state[0]
    elif name == 'srand':
        rand_state[0] = x[0] & 0x7fffffff; ret = 0
    elif name in ('memcpy', '__memcpy_chk'):
        try: mu.mem_write(x[0], bytes(mu.mem_read(x[1], x[2])))
        except UcError as e: log.write(f'memcpy FAIL dst={x[0]:#x} src={x[1]:#x} n={x[2]:#x}: {e}\n')
        ret = x[0]
    elif name in ('memmove', '__memmove_chk'):
        try:
            b = bytes(mu.mem_read(x[1], x[2]))
            mu.mem_write(x[0], b)
        except UcError: pass
        ret = x[0]
    elif name == 'memset':
        try: mu.mem_write(x[0], bytes([x[1] & 0xff]) * x[2])
        except UcError: pass
        ret = x[0]
    elif name == 'memcmp':
        try:
            a = bytes(mu.mem_read(x[0], x[2])); b = bytes(mu.mem_read(x[1], x[2]))
            ret = (a > b) - (a < b)
        except UcError: ret = 0
    elif name in ('strlen', '__strlen_chk'):
        b = mu.mem_read(x[0], 8192); i = b.find(b'\0'); ret = i if i >= 0 else 8192
    elif name in ('strcmp', 'strncmp'):
        a = read_cstr(x[0]); b = read_cstr(x[1])
        if name == 'strncmp': a = a[:x[2]]; b = b[:x[2]]
        ret = (a > b) - (a < b)
    elif name in ('strcpy', 'strncpy', 'strcat'):
        s = read_cstr(x[1])
        mu.mem_write(x[0], s.encode() + b'\0'); ret = x[0]
    elif name == 'strchr':
        b = mu.mem_read(x[0], 4096); i = b.find(bytes([x[1] & 0xff]))
        ret = x[0] + i if i >= 0 else 0
    elif name == 'strstr':
        hay = read_cstr(x[0], 65536); nd = read_cstr(x[1])
        i = hay.find(nd); ret = x[0] + i if i >= 0 else 0
    elif name == 'getpid': ret = 12345
    elif name == 'gettid': ret = 12345
    elif name == 'getuid': ret = 10234
    elif name == 'geteuid': ret = 10234
    elif name == 'pthread_once':
        # 专用返回蹦床+LIFO栈：init返回到ONCE_RET时弹栈恢复调用者LR，不依赖X0（init返回后X0已被污染）
        ctl, init_fn = x[0], x[1]
        state = 0
        if ctl:
            try: state = int.from_bytes(mu.mem_read(ctl, 4), 'little')
            except UcError: state = 2
        if state == 2 or state == 1 or not init_fn:
            ret = 0
        else:
            mu.mem_write(ctl, struct.pack('<I', 1))
            once_stack.append((ctl, uc.reg_read(UC_ARM64_REG_LR)))
            uc.reg_write(UC_ARM64_REG_PC, init_fn)
            uc.reg_write(UC_ARM64_REG_LR, ONCE_RET)
            return
    elif name == '__once_ret':
        if once_stack:
            ctl, saved_lr = once_stack.pop()
            if ctl: mu.mem_write(ctl, struct.pack('<I', 2))
            uc.reg_write(UC_ARM64_REG_LR, saved_lr)
        uc.reg_write(UC_ARM64_REG_X0, 0)
        return
    elif name in ('pthread_mutex_lock', 'pthread_mutex_unlock', 'pthread_mutex_trylock', 'pthread_mutex_init', 'pthread_mutex_destroy', 'pthread_mutexattr_init', 'pthread_mutexattr_destroy', 'pthread_mutexattr_settype', 'pthread_rwlock_rdlock', 'pthread_rwlock_wrlock', 'pthread_rwlock_unlock', 'pthread_cond_broadcast', 'pthread_cond_destroy', 'pthread_cond_timedwait', 'pthread_key_create', 'pthread_setspecific', 'pthread_self'):
        ret = 0 if name != 'pthread_self' else TLS + 0x100
        if name == 'pthread_key_create' and x[0]:
            mu.mem_write(x[0], struct.pack('<I', 7))
    elif name == 'pthread_getspecific': ret = 0
    elif name.startswith('pthread_create'):
        log.write(f'!! pthread_create called (thread fn={x[2]:#x}) — returning success without running\n')
        if x[0]: mu.mem_write(x[0], struct.pack('<Q', 0x9999))
        ret = 0
    elif name == '__errno': ret = FAKE + 0x100
    elif name == 'dlopen':
        p = read_cstr(x[0]); log.write(f'dlopen({p})\n'); ret = FAKE + 0x200
    elif name == 'dlsym':
        p = read_cstr(x[1]); log.write(f'dlsym({p})\n')
        ret = defined.get(p, 0)
        if ret:
            ret = BASE + ret
            log.write(f'  dlsym internal {p} -> {ret:#x}\n')
        else:
            ret = stub_for('dlsym:' + p)
            log.write(f'  dlsym external/fallback {p} -> {ret:#x}\n')
    elif name == 'dladdr':
        # 找包含 x0 地址的模块，填 Dl_info {fname, fbase, sname, saddr}
        addr = x[0]
        mod = None
        for mb, me, mp in loaded_modules:
            if mb <= addr < me: mod = (mb, me, mp); break
        if mod and x[1]:
            mb, me, mp = mod
            np_ = alloc(len(mp) + 1); mu.mem_write(np_, mp.encode() + b'\0')
            sname = 0; saddr = 0
            if mb == BASE:
                best = None
                for nm, vv in defined.items():
                    if vv <= addr - BASE and (best is None or vv > best[1]): best = (nm, vv)
                if best:
                    saddr = BASE + best[1]
                    sname = alloc(len(best[0]) + 1); mu.mem_write(sname, best[0].encode() + b'\0')
            mu.mem_write(x[1], struct.pack('<QQQQ', np_, mb, sname, saddr))
            ret = 1
        else:
            if x[1]: mu.mem_write(x[1], b'\0' * 32)
            ret = 0
    elif name == 'dl_iterate_phdr':
        # 真实遍历已加载模块，逐个调用回调；蹦床+队列实现
        cb, data = x[0], x[1]
        dliter_queue.clear()
        for mb, me, mp in loaded_modules:
            info = alloc(64)
            np_ = alloc(len(mp) + 1); mu.mem_write(np_, mp.encode() + b'\0')
            phnum = struct.unpack_from('<H', bytes(mu.mem_read(mb + 0x38, 2)), 0)[0]
            mu.mem_write(info, struct.pack('<QQQH', mb, np_, mb + 0x40, phnum) + b'\0' * 40)
            dliter_queue.append(info)
        dliter_state['cb'] = cb; dliter_state['data'] = data
        dliter_state['caller_lr'] = uc.reg_read(UC_ARM64_REG_LR)
        dliter_state['result'] = 0
        if dliter_queue:
            info = dliter_queue.pop(0)
            uc.reg_write(UC_ARM64_REG_X0, info)
            uc.reg_write(UC_ARM64_REG_X1, 32)
            uc.reg_write(UC_ARM64_REG_X2, data)
            uc.reg_write(UC_ARM64_REG_PC, cb)
            uc.reg_write(UC_ARM64_REG_LR, DLITER_RET)
            return
        ret = 0
    elif name == '__dliter_ret':
        r = uc.reg_read(UC_ARM64_REG_X0)
        if r != 0 or not dliter_queue:
            uc.reg_write(UC_ARM64_REG_LR, dliter_state['caller_lr'])
            uc.reg_write(UC_ARM64_REG_X0, r)
            return
        info = dliter_queue.pop(0)
        uc.reg_write(UC_ARM64_REG_X0, info)
        uc.reg_write(UC_ARM64_REG_X1, 32)
        uc.reg_write(UC_ARM64_REG_X2, dliter_state['data'])
        uc.reg_write(UC_ARM64_REG_PC, dliter_state['cb'])
        uc.reg_write(UC_ARM64_REG_LR, DLITER_RET)
        return
    elif name == 'getenv':
        p = read_cstr(x[0]); ret = 0
    elif name in ('setenv', 'unsetenv', 'putenv', 'clearenv'): ret = 0
    elif name == 'strerror_r':
        msgs = {61: b'No data available', 2: b'No such file or directory', 13: b'Permission denied', 22: b'Invalid argument', 9: b'Bad file descriptor'}
        s = msgs.get(x[0], b'Unknown error ' + str(x[0]).encode())
        mu.mem_write(x[1], s + b'\0'); ret = 0
    elif name == 'strerror':
        msgs = {61: b'No data available', 2: b'No such file or directory', 13: b'Permission denied'}
        s = msgs.get(x[0], b'Unknown error')
        p = alloc(len(s) + 1); mu.mem_write(p, s + b'\0'); ret = p
    elif name in ('vsnprintf', '__vsnprintf_chk', 'vsprintf', '__vsprintf_chk'):
        if name == '__vsnprintf_chk': buf, fmt, ap = x[0], x[4], x[5]
        elif name == 'vsnprintf': buf, fmt, ap = x[0], x[2], x[3]
        else: buf, fmt, ap = x[0], x[1], x[2]
        try:
            log.write(f'vsnprintf caller={uc.reg_read(UC_ARM64_REG_LR)-BASE:#x}\n')
            out = fmt_va(fmt, ap)
            mu.mem_write(buf, out + b'\0'); ret = len(out)
            log.write(f'fmt: {out.decode("utf8", "replace")}\n')
        except (UcError, struct.error) as e:
            log.write(f'vsnprintf FAIL: {e}\n'); ret = 0
    elif name in ('vfprintf', '__vfprintf_chk'):
        fmt, ap = (x[1], x[2]) if name == 'vfprintf' else (x[2], x[3])
        try:
            out = fmt_va(fmt, ap); ret = len(out)
            log.write(f'fprintf: {out.decode("utf8", "replace")}\n')
        except (UcError, struct.error) as e:
            log.write(f'vfprintf FAIL: {e}\n'); ret = 0
    elif name == 'vasprintf':
        try:
            log.write(f'vasprintf caller={uc.reg_read(UC_ARM64_REG_LR)-BASE:#x}\n')
            out = fmt_va(x[1], x[2])
            p = alloc(len(out) + 1); mu.mem_write(p, out + b'\0')
            mu.mem_write(x[0], struct.pack('<Q', p)); ret = len(out)
            log.write(f'asprintf: {out.decode("utf8", "replace")}\n')
        except (UcError, struct.error) as e:
            log.write(f'vasprintf FAIL: {e}\n'); ret = -1
    elif name == 'openlog':
        log.write(f'openlog ident={read_cstr(x[0])}\n'); ret = 0
    elif name == 'syslog':
        log.write(f'syslog pri={x[0]} fmt={read_cstr(x[1])}\n'); ret = 0
    elif name in ('snprintf', '__snprintf_chk', 'sprintf'):
        ret = 0
    elif name in ('posix_memalign', 'memalign', 'aligned_alloc'):
        if name == 'posix_memalign':
            p = alloc(x[2]); mu.mem_write(x[0], struct.pack('<Q', p)); ret = 0
        else:
            ret = alloc(x[1] if name == 'memalign' else x[1])
    elif name == '__system_property_get':
        p = read_cstr(x[0])
        vals = {'ro.build.version.sdk': b'33', 'ro.debuggable': b'0', 'ro.secure': b'1', 'ro.build.tags': b'release-keys'}
        v = vals.get(p, b'')
        if x[1]: mu.mem_write(x[1], v + b'\0')
        ret = len(v)
    elif name == 'getauxval':
        ret = {16: 0x1ff, 3: BASE + 0x40, 4: 56, 5: 10, 6: 4096}.get(x[0], 0)
    elif name == 'sysconf': ret = 4096
    elif name == 'getentropy':
        try: mu.mem_write(x[0], os.urandom(min(x[1], 256))); ret = 0
        except UcError: ret = -1
    elif name == 'getpagesize': ret = 4096
    elif name in ('open', '__open_2'):
        p = read_cstr(x[0]); ret = fake_open(p)
    elif name == 'openat':
        p = read_cstr(x[1]); ret = fake_open(p)
    elif name == 'close':
        fd_map.pop(x[0], None); ret = 0
    elif name in ('read', '__read_chk'):
        info = fd_map.get(x[0])
        if info:
            content = file_content(info[0])
            chunk = content[info[1]:info[1]+x[2]]
            info[1] += len(chunk)
            try: mu.mem_write(x[1], chunk)
            except UcError: pass
            ret = len(chunk)
        else: ret = 0
    elif name == 'write': ret = x[2]
    elif name in ('fopen', 'fdopen'): ret = 0
    elif name == 'access':
        p = read_cstr(x[0]); ret = 0 if lib_exists(p) else -1
    elif name in ('lstat', 'stat'):
        p = read_cstr(x[0])
        if lib_exists(p): write_stat(x[1], len(file_content(p))); ret = 0
        else: ret = -1
    elif name == 'mmap':
        sz = (x[1] + 0xfff) & ~0xfff
        p = alloc(sz)
        ret = p
    elif name == 'mprotect': ret = 0
    elif name == 'madvise': ret = 0
    elif name == 'munmap': ret = 0
    elif name in ('fork', 'vfork'):
        log.write('!! fork called — returning fake child pid to parent\n'); ret = 23456
    elif name == 'kill':
        log.write(f'!! kill(pid={x[0]}, sig={x[1]}) — NP DETECTION TRIGGERED?\n'); ret = 0
    elif name in ('exit', '_exit', 'abort'):
        log.write(f'!! {name}({x[0]}) — stopping\n'); stopped[0] = True; uc.emu_stop()
    elif name in ('clock_gettime', 'gettimeofday'):
        if x[1]: mu.mem_write(x[1], struct.pack('<QQ', 1700000000, 0))
        ret = 0
    elif name == 'clock': ret = 1000000
    elif name == 'time':
        if x[0]: mu.mem_write(x[0], struct.pack('<Q', 1700000000))
        ret = 1700000000
    elif name in ('nanosleep', 'usleep', 'sleep'): ret = 0
    elif name == 'prctl': ret = 1 if x[0] == 3 else 0
    elif name == 'syscall':
        log.write(f'syscall({x[0]})\n'); ret = 0
    elif name == 'pipe':
        if x[0]: mu.mem_write(x[0], struct.pack('<ii', fake_open('pipe_r'), fake_open('pipe_w')))
        ret = 0
    elif name == 'dup2': ret = x[1]
    elif name == 'fcntl': ret = 0
    elif name in ('execl', 'execv', 'execve'):
        log.write(f'!! {name} — NP trying to exec\n'); ret = -1
    elif name == 'waitpid': ret = -1
    elif name == 'raise': uc.emu_stop()
    elif name in ('__cxa_atexit',): ret = 0
    elif name == 'android_set_abort_message':
        try:
            raw = bytes(mu.mem_read(x[0], 256))
            log.write(f'!! abort message: {read_cstr(x[0])!r} raw={raw[:64].hex()}\n')
        except UcError:
            log.write(f'!! abort message ptr={x[0]:#x} unreadable\n')
        ret = 0
    elif name in ('fprintf', 'printf', 'fputc', 'fwrite', 'closelog', 'fflush'): ret = 0
    elif name == 'fgets': ret = 0
    elif name == 'feof': ret = 1
    elif name == 'fileno': ret = 1
    elif name == 'fclose': ret = 0
    elif name in ('atoi', 'atof', 'strtol', 'strtoul'): ret = 0
    elif name == 'qsort': ret = 0
    elif name in ('inflateInit2_', 'inflate', 'inflateEnd'): ret = 0
    elif name.startswith('AAsset'): ret = 0
    elif name == 'dlclose': ret = 0
    elif name in ('mkdir',): ret = 0
    elif name in ('memchr',):
        b = mu.mem_read(x[0], x[2]); i = b.find(bytes([x[1] & 0xff]))
        ret = x[0] + i if i >= 0 else 0
    elif name == 'mktime': ret = 0
    elif name == '__scall_dispatch':
        handle_scall(uc)
        return
    else:
        log.write(f'UNHANDLED import {name} x0={x[0]:#x} x1={x[1]:#x}\n')
        ret = 0
    uc.reg_write(UC_ARM64_REG_X0, ret & 0xffffffffffffffff)

def hook_code(uc, addr, size, user):
    if STUB <= addr < STUB + 0x10000:
        name = import_names.get(addr, '?')
        handle_import(name, uc)
def hook_intr(uc, intno, user):
    x8 = uc.reg_read(UC_ARM64_REG_X8)
    x = [uc.reg_read(r) for r in (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_X3, UC_ARM64_REG_X4, UC_ARM64_REG_X5)]
    if globals().get('capture_private_intr'):
        pc = uc.reg_read(UC_ARM64_REG_PC)
        word = struct.unpack('<I', bytes(uc.mem_read(pc, 4)))[0]
        if word != 0xd4000001:
            regs = {f'x{i}': uc.reg_read(UC_ARM64_REG_X0 + i) for i in range(31)}
            regs['sp'] = uc.reg_read(UC_ARM64_REG_SP)
            regs['pc'] = pc
            regs['lr'] = uc.reg_read(UC_ARM64_REG_LR)
            import pickle
            with open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/private_interrupt.pkl', 'wb') as out:
                pickle.dump({'intno': intno, 'word': word, 'regs': regs, 'code': bytes(uc.mem_read(pc - 64, 128))}, out)
            log.write(f'PRIVATE INTR intno={intno} pc={pc-BASE:#x} word={word:#x} x8={x8:#x}\n')
            stopped[0] = True
            uc.emu_stop()
            return
    svc_log.append((x8, x[0]))
    ret = 0
    # arm64 syscall numbers
    if x8 == 222:  # mmap
        ret = alloc((x[1] + 0xfff) & ~0xfff)
    elif x8 == 226: ret = 0  # mprotect
    elif x8 == 215: ret = 0  # munmap
    elif x8 == 56:  # openat
        ret = fake_open(read_cstr(x[1]))
    elif x8 == 57:  # close
        fd_map.pop(x[0], None); ret = 0
    elif x8 == 63:  # read
        info = fd_map.get(x[0])
        if info:
            content = file_content(info[0]); chunk = content[info[1]:info[1]+x[2]]; info[1] += len(chunk)
            try: mu.mem_write(x[1], chunk)
            except UcError: pass
            ret = len(chunk)
        else: ret = 0
    elif x8 == 64: ret = x[2]  # write
    elif x8 == 172: ret = 12345  # getpid
    elif x8 == 178: ret = 12345  # gettid
    elif x8 == 174: ret = 10234  # getuid
    elif x8 == 220:  # clone
        log.write('!! svc clone — parent path\n'); ret = 23457
    elif x8 == 129: ret = 0  # kill
    elif x8 == 93 or x8 == 94:
        log.write(f'!! svc exit({x[0]})\n'); stopped[0] = True; uc.emu_stop()
    elif x8 == 278:  # getentropy
        try: mu.mem_write(x[0], os.urandom(min(x[1], 256))); ret = 0
        except UcError: ret = -1
    elif x8 == 160: ret = 0  # uname -> fill?
    elif x8 == 167: ret = 1 if x[0] == 3 else 0  # prctl: PR_GET_DUMPABLE=1
    elif x8 == 113:  # clock_gettime
        if x[1]: mu.mem_write(x[1], struct.pack('<QQ', 1700000000, 0))
        ret = 0
    elif x8 == 101: ret = 0  # nanosleep
    elif x8 == 59:  # pipe2
        if x[0]: mu.mem_write(x[0], struct.pack('<ii', fake_open('pipe_r'), fake_open('pipe_w')))
        ret = 0
    elif x8 == 134: ret = 0  # rt_sigaction
    elif x8 == 135: ret = 0  # rt_sigprocmask
    elif x8 == 178 or x8 == 179: ret = 0
    elif x8 == 48:  # faccessat
        p = read_cstr(x[1])
        ret = 0 if lib_exists(p) else -2
    elif x8 == 79:  # fstatat/newfstatat
        p = read_cstr(x[1]); c = file_content(p)
        if c: write_stat(x[2], len(c)); ret = 0
        else: ret = -2
    elif x8 == 80:  # fstat
        info = fd_map.get(x[0])
        if info:
            write_stat(x[1], len(file_content(info[0]))); ret = 0
        else: ret = -2
    elif x8 == 29: ret = 0  # ioctl
    elif x8 == 233: ret = 0  # madvise
    elif x8 == 131: ret = 0  # tgkill
    elif x8 == 260: ret = -1  # wait4
    elif x8 == 117: ret = 0  # ptrace
    elif x8 == 169: ret = 0  # gettimeofday
    elif x8 == 96: ret = 0  # set_tid_address
    elif x8 == 98: ret = 0  # futex
    elif x8 == 99: ret = 0  # set_robust_list
    elif x8 == 78:  # readlinkat
        s = b'/system/bin/app_process64'
        try: mu.mem_write(x[2], s); ret = len(s)
        except UcError: ret = -1
    elif x8 == 61: ret = 0  # getdents64 -> 空目录
    elif x8 == 62:  # lseek
        info = fd_map.get(x[0])
        if info:
            total = len(file_content(info[0]))
            if x[2] == 0: info[1] = x[1]
            elif x[2] == 1: info[1] += x[1]
            else: info[1] = total + x[1]
            ret = info[1]
        else: ret = -1
    elif x8 == 67:  # pread64
        info = fd_map.get(x[0])
        if info:
            chunk = file_content(info[0])[x[3]:x[3]+x[2]]
            try: mu.mem_write(x[1], chunk)
            except UcError: pass
            ret = len(chunk)
        else: ret = 0
    elif x8 == 172+1: ret = 0
    else:
        log.write(f'SVC {x8} x0={x[0]:#x} unhandled -> 0\n')
    log.write(f'SVC {x8} x0={x[0]:#x} -> {ret:#x}\n')
    uc.reg_write(UC_ARM64_REG_X0, ret & 0xffffffffffffffff)

crash = [None]
def hook_unmapped(uc, access, addr, size, value, user):
    pc = uc.reg_read(UC_ARM64_REG_PC)
    log.write(f'UNMAPPED access={access} addr={addr:#x} size={size} pc={pc:#x} (vaddr {pc-BASE:#x})\n')
    crash[0] = (access, addr, pc)
    return False
mu.hook_add(UC_HOOK_CODE, hook_code, begin=STUB, end=STUB + 0x10000)
mu.hook_add(UC_HOOK_INTR, hook_intr)
mu.hook_add(UC_HOOK_MEM_UNMAPPED, hook_unmapped)
block_count = [0]
from collections import deque
block_ring = deque(maxlen=3000)
def hook_block(uc, addr, size, user):
    block_count[0] += 1
    block_ring.append(addr)
    if block_count[0] % 2_000_000 == 0:
        log.write(f'BLOCK {block_count[0]} pc={addr:#x} vaddr={addr-BASE:#x}\n')
    if block_count[0] == 4_000_001:
        lr = uc.reg_read(UC_ARM64_REG_LR)
        x0 = uc.reg_read(UC_ARM64_REG_X0); x1 = uc.reg_read(UC_ARM64_REG_X1); x2 = uc.reg_read(UC_ARM64_REG_X2)
        sp = uc.reg_read(UC_ARM64_REG_SP)
        log.write(f'DUMP pc={addr:#x} lr={lr:#x} (vaddr {lr-BASE:#x}) x0={x0:#x} x1={x1:#x} x2={x2:#x} sp={sp:#x}\n')
        try:
            code = bytes(uc.mem_read(lr - 32, 64))
            log.write('caller code: ' + code.hex() + '\n')
        except UcError: pass
if os.environ.get('TRACE_BLOCKS') == '1':
    mu.hook_add(UC_HOOK_BLOCK, hook_block)

# 捕获 shadow 未完整恢复的区域：PC 首次进入时从活内存dump正确明文
live_dump_done = set()
def hook_live_dump(uc, addr, size, user):
    v = addr - BASE
    for region in (0x151000, 0x152000, 0x153000, 0x154000, 0x155000, 0x156000, 0x157000):
        if region <= v < region + 0x1000 and region not in live_dump_done:
            live_dump_done.add(region)
            try:
                img = bytes(uc.mem_read(BASE + region, 0x1000))
                open(f'C:/Users/vhtmf/AppData/Local/Temp/np-unpack/live_{region:x}.bin', 'wb').write(img)
                log.write(f'LIVE DUMP region {region:#x}\n')
            except UcError: pass
if os.environ.get('CAPTURE_INIT_PAGES') == '1':
    mu.hook_add(UC_HOOK_BLOCK, hook_live_dump)

# 追踪字符串解密：0x138f64 入口记录描述符，0x1394e0(取cstr)入口转储解密结果
strdec_count = [0]
def hook_strdec(uc, addr, size, user):
    v = addr - BASE
    x0 = uc.reg_read(UC_ARM64_REG_X0); x1 = uc.reg_read(UC_ARM64_REG_X1)
    if v == 0x138f64:
        strdec_count[0] += 1
        if strdec_count[0] <= 80:
            try: desc = bytes(uc.mem_read(x1, 24)).hex()
            except UcError: desc = '?'
            log.write(f'STRDEC#{strdec_count[0]} obj={x0:#x} desc@{x1:#x}={desc}\n')
    elif v == 0x1394e0:
        if strdec_count[0] <= 80:
            try:
                dec = bytes(uc.mem_read(x0 + 0x204, 48))
                raw = bytes(uc.mem_read(x0, 8))
                log.write(f'  GETCSTR obj={x0:#x} raw={raw.hex()} dec@204={dec.hex()} ascii={dec[:32]!r}\n')
            except UcError: log.write(f'  GETCSTR obj={x0:#x} unreadable\n')
if os.environ.get('TRACE_STRING_DECRYPT') == '1':
    mu.hook_add(UC_HOOK_CODE, hook_strdec, begin=BASE + 0x138f64, end=BASE + 0x138f64)
    mu.hook_add(UC_HOOK_CODE, hook_strdec, begin=BASE + 0x1394e0, end=BASE + 0x1394e0)

def dump_backtrace(uc, tag):
    sp = uc.reg_read(UC_ARM64_REG_SP); fp = uc.reg_read(UC_ARM64_REG_X29)
    lr = uc.reg_read(UC_ARM64_REG_LR)
    log.write(f'{tag} LR={lr:#x} (vaddr {lr-BASE:#x}) FP={fp:#x}\n')
    try:
        words = struct.unpack('<48Q', bytes(uc.mem_read(sp, 48 * 8)))
        hits = [f'{w:#x}(v{w-BASE:#x})' for w in words if BASE <= w < BASE + 0x1c6000]
        log.write(f'{tag} stack code refs: {" ".join(hits[:24])}\n')
    except UcError: pass
    # FP 链
    for _ in range(12):
        if not (STACK <= fp < STACK + STACK_SZ): break
        try:
            prev, ret = struct.unpack('<QQ', bytes(uc.mem_read(fp, 16)))
        except UcError: break
        log.write(f'{tag} frame fp={fp:#x} ret={ret:#x} (vaddr {ret-BASE:#x})\n')
        fp = prev

def hook_throw(uc, addr, size, user):
    x0 = uc.reg_read(UC_ARM64_REG_X0); x1 = uc.reg_read(UC_ARM64_REG_X1)
    tname = '?'
    try:
        np_ = struct.unpack('<Q', bytes(uc.mem_read(x1 + 8, 8)))[0]
        tname = read_cstr(np_, 256)
    except UcError: pass
    what = ''
    try:
        sp_ = struct.unpack('<Q', bytes(uc.mem_read(x0 + 8, 8)))[0]
        what = read_cstr(sp_, 512)
    except UcError: pass
    log.write(f'!! __cxa_throw obj={x0:#x} type={tname} what={what!r}\n')
    dump_backtrace(uc, 'THROW')
def hook_terminate(uc, addr, size, user):
    log.write('!! std::terminate entered\n')
    dump_backtrace(uc, 'TERM')
mu.hook_add(UC_HOOK_CODE, hook_throw, begin=BASE + 0xda270, end=BASE + 0xda270)
mu.hook_add(UC_HOOK_CODE, hook_terminate, begin=BASE + 0xdad30, end=BASE + 0xdad30)

from unicorn import UC_HOOK_MEM_WRITE
if os.environ.get('TRACE_MODULE_INDEX') == '1':
    def hook_module_index(uc, access, address, size, value, user):
        pc = uc.reg_read(UC_ARM64_REG_PC)
        print(f'MODULE INDEX WRITE value={value:#x} size={size} pc={pc-BASE:#x} lr={uc.reg_read(UC_ARM64_REG_LR)-BASE:#x}', flush=True)
        if value != 0xffff and os.environ.get('STOP_MODULE_INDEX') == '1':
            uc.emu_stop()
    mu.hook_add(UC_HOOK_MEM_WRITE, hook_module_index, begin=BASE + 0x1aecfc, end=BASE + 0x1aecfc + 3)

if os.environ.get('TRACE_INIT_POINTER') == '1':
    def hook_init_pointer(uc, access, address, size, value, user):
        pc = uc.reg_read(UC_ARM64_REG_PC)
        lr = uc.reg_read(UC_ARM64_REG_LR)
        print('INIT POINTER WRITE', hex(address), 'size', size, 'value', hex(value), 'PC', hex(pc-BASE), 'LR', hex(lr-BASE), 'x0', hex(uc.reg_read(UC_ARM64_REG_X0)), 'x1', hex(uc.reg_read(UC_ARM64_REG_X1)), 'x2', hex(uc.reg_read(UC_ARM64_REG_X2)), flush=True)
        if value == BASE + 0x149d74 and os.environ.get('STOP_INIT_POINTER') == '1':
            print('INIT POINTER CONTEXT', {名称: hex(uc.reg_read(寄存器)) for 名称, 寄存器 in [('x8', UC_ARM64_REG_X8), ('x9', UC_ARM64_REG_X9), ('x19', UC_ARM64_REG_X19), ('x23', UC_ARM64_REG_X23), ('sp', UC_ARM64_REG_SP), ('fp', UC_ARM64_REG_X29)]}, flush=True)
            帧 = uc.reg_read(UC_ARM64_REG_X29)
            for _层级 in range(12):
                try:
                    上一帧, 返回地址 = struct.unpack('<QQ', bytes(uc.mem_read(帧, 16)))
                    print('INIT STACK FRAME', _层级, 'fp', hex(帧), 'next', hex(上一帧), 'LR', hex(返回地址), 'LR_OFFSET', hex(返回地址-BASE), flush=True)
                    if 上一帧 <= 帧:
                        break
                    帧 = 上一帧
                except UcError:
                    break
            with open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/init_table_processor_live.bin', 'wb') as 输出:
                输出.write(uc.mem_read(BASE + 0x152000, 0x1000))
            stopped[0] = True
            uc.emu_stop()
    mu.hook_add(UC_HOOK_MEM_WRITE, hook_init_pointer, begin=0x40004f90, end=0x40004f90)

# 监视 mutex 区域(0x107000-0x108000)的写入：判断 DT_INIT 是否解密过该区域、是否随后重加密
region_writes = [0]
def hook_region_write(uc, access, addr, size, value, user):
    region_writes[0] += 1
    n = region_writes[0]
    if n <= 100 or n % 5000 == 0:
        pc = uc.reg_read(UC_ARM64_REG_PC)
        log.write(f'RW#{n} pc={pc-BASE:#x} addr={addr-BASE:#x} size={size} val={value:#x}\n')
    if addr <= BASE + 0x1074a8 < addr + size or addr == BASE + 0x1074a8:
        snap = bytes(uc.mem_read(BASE + 0x107000, 0x1000))
        open(f'C:/Users/vhtmf/AppData/Local/Temp/np-unpack/region107_{n:06d}.bin', 'wb').write(snap)
        pc = uc.reg_read(UC_ARM64_REG_PC); lr = uc.reg_read(UC_ARM64_REG_LR)
        log.write(f'RW snapshot at write#{n} pc={pc-BASE:#x} lr={lr-BASE:#x} entry bytes={snap[0x4a8:0x4b8].hex()}\n')
if os.environ.get('TRACE_REGION_WRITES') == '1':
    mu.hook_add(UC_HOOK_MEM_WRITE, hook_region_write, begin=BASE + 0x107000, end=BASE + 0x108000)

# 全代码段写监视：累积每个8字节槽的首次写入值(=解密结果)成影子明文镜像；任何槽第二次写入时另存即时快照
RX_END = 0x1a0950
slot_writes = bytearray(RX_END // 8 + 1)
shadow_rx = bytearray(data[:RX_END])
plaintext_captured = [False]
def hook_rx_write(uc, access, addr, size, value, user):
    off = addr - BASE
    if off < 0 or off >= RX_END: return
    slot = off >> 3
    first = slot_writes[slot] == 0
    if slot_writes[slot] < 255: slot_writes[slot] += 1
    if first:
        vb = (value & ((1 << (size * 8)) - 1)).to_bytes(size, 'little')
        shadow_rx[off:off+size] = vb
    elif slot_writes[slot] == 2 and not plaintext_captured[0]:
        plaintext_captured[0] = True
        pc = uc.reg_read(UC_ARM64_REG_PC); lr = uc.reg_read(UC_ARM64_REG_LR)
        log.write(f'REENC POINT at second write to {off:#x} pc={pc-BASE:#x} lr={lr-BASE:#x}\n')
        dump_backtrace(uc, 'REENC')
        img = bytes(uc.mem_read(BASE, RX_END))
        open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/compatible_reenc_point.bin', 'wb').write(img)
if os.environ.get('CAPTURE_RX_WRITES') == '1' or not os.environ.get('SKIP_INIT') == '1':
    mu.hook_add(UC_HOOK_MEM_WRITE, hook_rx_write, begin=BASE, end=BASE + RX_END)

# 监视 NP 上下文指针槽的写入（libc函数表 ctx / 懒初始化标志 / 真实函数指针）
def hook_ctx_write(uc, access, addr, size, value, user):
    pc = uc.reg_read(UC_ARM64_REG_PC)
    log.write(f'CTX WRITE [{addr-BASE:#x}] = {value:#x} pc={pc-BASE:#x}\n')
if os.environ.get('TRACE_STATE_WRITES') == '1':
    for slot in (0x1b3070, 0x1b1020, 0x1b2bf8, 0x1b2b90, 0x1b2b98, 0x1b0f70, 0x1aecf0, 0x1b0ef0, 0x1b0ef8):
        mu.hook_add(UC_HOOK_MEM_WRITE, hook_ctx_write, begin=BASE + slot, end=BASE + slot + 8)
if os.environ.get('TRACE_INIT_CONTEXT') == '1':
    def hook_init_context(uc, addr, size, user):
        print('INIT CONTEXT ENTER', hex(addr-BASE), 'x0', hex(uc.reg_read(UC_ARM64_REG_X0)), 'LR', hex(uc.reg_read(UC_ARM64_REG_LR)-BASE), flush=True)
    mu.hook_add(UC_HOOK_CODE, hook_init_context, begin=BASE + 0x8f1dc, end=BASE + 0x8f1dc)
    mu.hook_add(UC_HOOK_CODE, hook_init_context, begin=BASE + 0x8f00c, end=BASE + 0x8f00c)
    mu.hook_add(UC_HOOK_MEM_WRITE, hook_ctx_write, begin=BASE + 0x1b3088, end=BASE + 0x1b3088 + 8)
if os.environ.get('TRACE_INIT_ENTRY') == '1':
    def hook_init_entry(uc, addr, size, user):
        print('INIT ENTRY ENTER', hex(addr-BASE), 'x0', hex(uc.reg_read(UC_ARM64_REG_X0)), 'LR', hex(uc.reg_read(UC_ARM64_REG_LR)-BASE), 'SP', hex(uc.reg_read(UC_ARM64_REG_SP)), flush=True)
        if os.environ.get('STOP_INIT_ENTRY') == '1':
            stopped[0] = True
            uc.emu_stop()
    mu.hook_add(UC_HOOK_CODE, hook_init_entry, begin=BASE + 0x149d74, end=BASE + 0x149d74)
if os.environ.get('TRACE_INIT_REGISTRATION') == '1':
    def hook_init_registration(uc, addr, size, user):
        print('INIT REGISTRATION ENTER', hex(addr-BASE), 'x0', hex(uc.reg_read(UC_ARM64_REG_X0)), 'x1', hex(uc.reg_read(UC_ARM64_REG_X1)), 'LR', hex(uc.reg_read(UC_ARM64_REG_LR)-BASE), flush=True)
    def hook_init_registration_write(uc, access, address, size, value, user):
        print('INIT REGISTRATION WRITE', hex(address-BASE), 'size', size, 'value', hex(value), 'PC', hex(uc.reg_read(UC_ARM64_REG_PC)-BASE), 'LR', hex(uc.reg_read(UC_ARM64_REG_LR)-BASE), flush=True)
    for _offset in (0x149d88, 0x149e2c, 0x14b3f4, 0x92454):
        mu.hook_add(UC_HOOK_CODE, hook_init_registration, begin=BASE + _offset, end=BASE + _offset)
    mu.hook_add(UC_HOOK_MEM_WRITE, hook_init_registration_write, begin=BASE + 0x1b32c0, end=BASE + 0x1b32c0)
    mu.hook_add(UC_HOOK_MEM_WRITE, hook_init_registration_write, begin=BASE + 0x1b30c0, end=BASE + 0x1b30c0 + 0x400)
# 宽域监视状态表区，捕捉覆盖 0x1b2bf8 的宽存储（str q/stp/memcpy）
def hook_bss_broad(uc, access, addr, size, value, user):
    pc = uc.reg_read(UC_ARM64_REG_PC)
    log.write(f'BSS WRITE [{addr-BASE:#x}] size={size} val={value:#x} pc={pc-BASE:#x}\n')
if os.environ.get('TRACE_STATE_WRITES') == '1':
    mu.hook_add(UC_HOOK_MEM_WRITE, hook_bss_broad, begin=BASE + 0x1b2b00, end=BASE + 0x1b2c00)

RET_ADDR = STUB + 0xf000
mu.mem_write(RET_ADDR, struct.pack('<I', 0xd65f03c0))
mu.mem_write(ONCE_RET, struct.pack('<I', 0xd65f03c0))
import_names[ONCE_RET] = '__once_ret'
init = BASE + d['DT_INIT'][0]
print('DT_INIT @', hex(init), 'vaddr', hex(d['DT_INIT'][0]), flush=True)
SKIP_INIT = os.environ.get('SKIP_INIT') == '1'
if SKIP_INIT:
    import pickle
    _prefix = os.environ.get('SNAPSHOT_PREFIX') or ('post_mod' if os.environ.get('RESUME_MOD') == '1' else 'mu')
    if os.environ.get('TRACE_STARTUP') == '1': print('STARTUP: restoring context', _prefix, flush=True)
    _ctx = pickle.load(open(f'C:/Users/vhtmf/AppData/Local/Temp/np-unpack/{_prefix}_ctx.pkl', 'rb'))
    mu.context_restore(_ctx)
    _ps = pickle.load(open(f'C:/Users/vhtmf/AppData/Local/Temp/np-unpack/{_prefix}_pystate.pkl', 'rb'))
    snapshot_pystate = _ps
    heap_ptr[0] = _ps['heap_ptr']; fd_next[0] = _ps['fd_next']; fd_map.update(_ps['fd_map']); rand_state[0] = _ps['rand_state']
    stopped[0] = False
    # unicorn2 context 不含内存：显式恢复 DT_INIT 建立的全部内存状态；新快照可能包含原脚本尚未创建的il2cpp映射
    for _addr, _size, _bytes in pickle.load(open(f'C:/Users/vhtmf/AppData/Local/Temp/np-unpack/{_prefix}_mem.pkl', 'rb')):
        if os.environ.get('RESUME_MOD') == '1':
            _existing = next(((a, b) for a, b, _ in mu.mem_regions() if a <= _addr and b >= _addr + _size - 1), None)
            if _existing is None:
                mu.mem_map(_addr, (_size + 0xfff) & ~0xfff)
                if os.environ.get('TRACE_STARTUP') == '1': print('STARTUP: mapped snapshot region', hex(_addr), hex(_size), flush=True)
        mu.mem_write(_addr, _bytes)
        if os.environ.get('TRACE_STARTUP') == '1': print('STARTUP: restored region', hex(_addr), hex(_size), flush=True)
    print('SKIP_INIT: context + memory restored, heap used', hex(heap_ptr[0] - HEAP), 'snapshot', _prefix, flush=True)
else:
    if os.environ.get('TRACE_DT_AES') == '1':
        _aes_log = open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/aes_calls.txt', 'w', buffering=1)
        _aes_count = [0]
        _aes_hook = [None]
        def hook_dt_aes(uc, addr, size, user):
            if _aes_count[0] >= 40:
                uc.hook_del(_aes_hook[0])
                return
            _aes_count[0] += 1
            x = [uc.reg_read(UC_ARM64_REG_X0 + i) for i in range(5)]
            _aes_log.write(f'AES#{_aes_count[0]} args={[hex(v) for v in x]} lr={uc.reg_read(UC_ARM64_REG_LR)-BASE:#x}\n')
            try:
                _aes_log.write('  key/in=' + bytes(uc.mem_read(x[1], 32)).hex() + '\n')
                _aes_log.write('  out-before=' + bytes(uc.mem_read(x[2], 32)).hex() + '\n')
            except UcError:
                pass
        _aes_hook[0] = mu.hook_add(UC_HOOK_CODE, hook_dt_aes, begin=BASE + 0x137968, end=BASE + 0x137968)
    if os.environ.get('CAPTURE_SIGNAL') == '1':
        _signal_log = open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/signal_setup_dt.txt', 'w', buffering=1)
        def hook_dt_signal(uc, addr, size, user):
            _x0 = uc.reg_read(UC_ARM64_REG_X0); _x1 = uc.reg_read(UC_ARM64_REG_X1); _lr = uc.reg_read(UC_ARM64_REG_LR)
            _signal_log.write(f'ENTER 0x93ef0 old_actions={_x0:#x} handler={_x1:#x} handler_off={_x1-BASE:#x} lr={_lr:#x} lr_off={_lr-BASE:#x}\n')
            stopped[0] = True
            uc.emu_stop()
        mu.hook_add(UC_HOOK_CODE, hook_dt_signal, begin=BASE + 0x93ef0, end=BASE + 0x93ef0)
    mu.reg_write(UC_ARM64_REG_LR, RET_ADDR)
    try:
        mu.emu_start(init, RET_ADDR, timeout=int(os.environ.get('EMULATION_TIMEOUT_US', '10000000')), count=2_000_000_000)
        print('init returned OK' if not stopped[0] else 'init stopped early')
    except UcError as e:
        pc = mu.reg_read(UC_ARM64_REG_PC)
        print('EMU ERROR:', e, 'PC=', hex(pc), 'vaddr=', hex(pc - BASE))
print('blocks:', block_count[0])
print('svc calls:', len(svc_log), 'heap used:', hex(heap_ptr[0] - HEAP))
print('final PC:', hex(mu.reg_read(UC_ARM64_REG_PC)), 'LR:', hex(mu.reg_read(UC_ARM64_REG_LR)))
if os.environ.get('STOP_INIT_POINTER') == '1' and stopped[0]:
    log.close()
    print('init pointer capture stopped without snapshot overwrite', flush=True)
    sys.exit(0)
log.close()
import pickle
if not SKIP_INIT and os.environ.get('CAPTURE_SIGNAL') != '1':
    # save memory snapshot for later analysis
    with open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/mu_state.pkl', 'wb') as fp:
        pickle.dump({'heap_ptr': heap_ptr[0], 'stopped': stopped[0], 'crash': crash[0]}, fp)
    img_end = max(s.header.p_vaddr + s.header.p_memsz for s in elf.iter_segments() if s.header.p_type == 'PT_LOAD')
    img = bytearray(img_end)
    for s in elf.iter_segments():
        if s.header.p_type != 'PT_LOAD': continue
        va, ms = s.header.p_vaddr, s.header.p_memsz
        img[va:va+ms] = bytes(mu.mem_read(BASE + va, ms))
    open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/compatible_mem.bin', 'wb').write(bytes(img))
    print('memory snapshot saved, size', hex(img_end))
    open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/compatible_decrypted.bin', 'wb').write(bytes(shadow_rx))
    nw = sum(1 for c in slot_writes if c)
    print('shadow plaintext saved; slots written:', nw, 'double-written:', sum(1 for c in slot_writes if c >= 2))
    # 尾部执行路径转储（用影子明文反汇编）
    from capstone import Cs, CS_ARCH_ARM64, CS_MODE_ARM
    _md = Cs(CS_ARCH_ARM64, CS_MODE_ARM)
    with open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/tail_blocks.txt', 'w') as tf:
        for addr in list(block_ring)[-400:]:
            v = addr - BASE
            if not (0 <= v < RX_END):
                tf.write(f'{addr:#x} (outside image)\n'); continue
            ins = next(_md.disasm(bytes(shadow_rx[v:v+4]), v), None)
            if ins: tf.write(f'{v:#x}: {ins.mnemonic} {ins.op_str}\n')
            else: tf.write(f'{v:#x}: <undecodable> {shadow_rx[v:v+4].hex()}\n')
    print('tail blocks dumped')
    try:
        ctx = mu.context_save()
        pickle.dump(ctx, open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/mu_ctx.pkl', 'wb'))
        pickle.dump({'heap_ptr': heap_ptr[0], 'fd_next': fd_next[0], 'fd_map': dict(fd_map), 'rand_state': rand_state[0]},
                    open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/mu_pystate.pkl', 'wb'))
        # 保存全部内存区域（unicorn2 context 不含内存），HEAP 裁剪到已用、STACK 只存顶部
        # mem_regions 返回 (begin, end, perms)，end 为末字节地址
        _regions = []
        for _r in mu.mem_regions():
            _a, _e, _p = _r
            _s = _e - _a + 1
            if _a == HEAP: _s = min(_s, (heap_ptr[0] - HEAP + 0xfff) & ~0xfff)
            elif _a == STACK: _a = STACK + STACK_SZ - 0x20000; _s = 0x20000
            elif _a == TLS: _s = 0x1000
            _regions.append((_a, _s, bytes(mu.mem_read(_a, _s))))
        pickle.dump(_regions, open('C:/Users/vhtmf/AppData/Local/Temp/np-unpack/mu_mem.pkl', 'wb'))
        print('unicorn context + pystate + memory saved')
    except Exception as e:
        print('context save failed:', e)
