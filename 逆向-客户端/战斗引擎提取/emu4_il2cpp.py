# 阶段2：DT_INIT 完成后，加载 libil2cpp.so 并执行其 DT_INIT 桩 → SoLibraryStart 解密本体
import struct, sys, os, runpy
from unicorn import UcError
from unicorn.arm64_const import *

HERE = os.path.dirname(os.path.abspath(__file__))
ns = runpy.run_path(os.path.join(HERE, 'emu2.py'))
mu = ns['mu']; BASE = ns['BASE']; STACK = ns['STACK']; STACK_SZ = ns['STACK_SZ']
RET_ADDR = ns['RET_ADDR']; elf_c = ns['elf']
# runpy 返回的是 globals 副本；钩子函数的真实 globals 要从函数对象取，替换日志才能生效
live = ns['hook_intr'].__globals__
if os.environ.get('CAPTURE_PRIVATE_INTR') == '1':
    live['capture_private_intr'] = True
if os.environ.get('TRACE_ALLOCATIONS') == '1':
    live['trace_allocations'] = True
    live['allocation_log'] = open(os.path.join(HERE, 'allocations.txt'), 'w', buffering=1)
# 重新打开日志（emu2 末尾关闭了）
log = open(os.path.join(HERE, 'emu4_trace.txt'), 'w', buffering=1)
live['log'] = log
trace_impl = open(os.path.join(HERE, 'target_process.txt'), 'w', buffering=1)
if os.environ.get('METADATA_FASTPATH') == '1':
    from unicorn import UC_HOOK_CODE, UC_HOOK_MEM_READ_UNMAPPED, UC_HOOK_MEM_WRITE_UNMAPPED, UC_HOOK_MEM_FETCH_UNMAPPED
    def hook_fastpath_unmapped(uc, access, address, size, value, user):
        pc = uc.reg_read(UC_ARM64_REG_PC)
        print('FASTPATH UNMAPPED', 'access', access, 'address', hex(address), 'pc', hex(pc), 'lr', hex(uc.reg_read(UC_ARM64_REG_LR)), flush=True)
        trace_impl.write(f'UNMAPPED access={access} address={address:#x} size={size} pc={pc-BASE:#x} lr={uc.reg_read(UC_ARM64_REG_LR)-BASE:#x}\n')
        return False
    mu.hook_add(UC_HOOK_MEM_READ_UNMAPPED | UC_HOOK_MEM_WRITE_UNMAPPED | UC_HOOK_MEM_FETCH_UNMAPPED, hook_fastpath_unmapped)
    def hook_metadata_init(uc, addr, size, user):
        print('METADATA INITIALIZE ENTER', hex(addr - IL2CPP_BASE), 'LR', hex(uc.reg_read(UC_ARM64_REG_LR) - IL2CPP_BASE), flush=True)
    def hook_metadata_return(uc, addr, size, user):
        pointer = struct.unpack('<Q', bytes(uc.mem_read(IL2CPP_BASE + 0x5369348, 8)))[0]
        print('METADATA INITIALIZE RETURN pointer', hex(pointer), flush=True)
        try:
            header = bytes(uc.mem_read(pointer, 0x120))
        except UcError:
            header = b''
        if header[:4] == bytes.fromhex('af1bb1fa') and 20 <= struct.unpack_from('<i', header, 4)[0] <= 40:
            length = max((offset + size for offset, size in struct.iter_unpack('<ii', header[8:0x110]) if offset > 0 and size > 0), default=0)
            output = os.path.join(HERE, 'global-metadata_decrypted.dat')
            with open(output, 'wb') as out:
                out.write(uc.mem_read(pointer, length))
            print('VERIFIED METADATA SAVED', output, 'length', hex(length), flush=True)
        else:
            print('METADATA HEADER NOT VALID', header[:32].hex(), flush=True)
        uc.emu_stop()
    metadata_base = 0x8000000000
    mu.hook_add(UC_HOOK_CODE, hook_metadata_init, begin=metadata_base + 0x205e01c, end=metadata_base + 0x205e01c)
    mu.hook_add(UC_HOOK_CODE, hook_metadata_return, begin=metadata_base + 0x205e1f0, end=metadata_base + 0x205e1f0)

def peek(v):
    return struct.unpack('<Q', bytes(mu.mem_read(BASE + v, 8)))[0]

flag = peek(0x1b1020)
real_fn_slot = peek(0x1b2bf8)
print(f'init flag [0x1b1020]={flag:#x}  real SoLibraryStart fn [0x1b2bf8]={real_fn_slot:#x}')
# 注意：这两个槽位可能由 SoLibraryStart 内部的懒初始化(0x9c5a0)填充，DT_INIT 只负责解密 NP 自身代码，不强制要求非零

# DT_INIT 末尾 NP 会重加密自身代码；从模幂快照恢复时保留其中的实时NP代码状态
dec_path = os.path.join(HERE, 'compatible_decrypted.bin')
if os.environ.get('RESUME_MOD') != '1' and os.path.exists(dec_path):
    dec = open(dec_path, 'rb').read()
    mu.mem_write(BASE, dec)
    print('restored decrypted RX segment:', hex(len(dec)))
else:
    print('!! no plaintext capture found')

# NP 的 libc 函数指针表 ctx=[0x1b3070] 在 DT_INIT 后仍为 NULL（建表由 Java 层 native init 触发，未模拟）。
# dispatch 桩对空函数指针优雅返回 0/-1，仅 ctx 本身为 NULL 才崩溃。先给一个有效结构让懒初始化推进。
# 用真实语义桩填充已知偏移，其余置 0（优雅降级）。
ctx = ns['alloc'](0x400) if os.environ.get('METADATA_FASTPATH') != '1' else struct.unpack('<Q', bytes(mu.mem_read(BASE + 0x1b3070, 8)))[0]
if not ctx:
    raise RuntimeError('模幂快照缺少有效libc上下文，停止以避免错误初始化')
sb = ns['stub_by_name']
# 综合猜测映射（NP libc 函数表），用真实语义桩填充；配合 dispatch 日志按崩溃/参数迭代修正
known = {
    0x10: 'open', 0x18: 'close', 0x20: 'read', 0x28: 'write', 0x30: 'lseek', 0x38: 'fstat',
    0xd8: 'pthread_mutex_lock', 0xe0: 'pthread_mutex_unlock', 0xe8: 'pthread_mutex_trylock',
    0x110: 'pthread_rwlock_unlock', 0x118: 'pthread_rwlock_rdlock',
    0x150: 'mmap', 0x168: 'write', 0x258: 'munmap',
}
for off, nm in known.items():
    if nm in sb:
        mu.mem_write(ctx + off, struct.pack('<Q', sb[nm]))
mu.mem_write(BASE + 0x1b3070, struct.pack('<Q', ctx))
print('manual ctx @', hex(ctx), 'filled', len(known), 'slots')

# scall 对象的两个槽位是真实的寄存器/向量上下文恢复函数；默认保留，只有旧实验明确请求时才替换为通用桩。
scall_obj = BASE + 0x1b32c8
SCALL_DISP = ns['STUB'] + 0xd000
mu.mem_write(SCALL_DISP, struct.pack('<I', 0xd65f03c0))
ns['import_names'][SCALL_DISP] = '__scall_dispatch'
if os.environ.get('PRESERVE_SCALL_SLOTS') != '1':
    for off in (0x98, 0xa0):
        mu.mem_write(scall_obj + off, struct.pack('<Q', SCALL_DISP))
    print('scall obj slots -> dispatch stub', hex(SCALL_DISP))
else:
    print('scall obj slots preserved')

# 通用 scall 分发：LR=调用包装器返回地址，据此判定 syscall 类型
def handle_scall(uc):
    lr = uc.reg_read(UC_ARM64_REG_LR) - BASE
    x = [uc.reg_read(r) for r in (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X2, UC_ARM64_REG_X3, UC_ARM64_REG_X4, UC_ARM64_REG_X5)]
    if os.environ.get('TRACE_SYSCALLS') == '1':
        trace_impl.write(f'SCALL lr={lr:#x} args={[hex(v) for v in x]}\n')
    ret = 0
    if lr == 0xa7ec4:  # mmap 包装器 0xa7e1c：标准 mmap(addr,len,prot,flags,fd,off)
        if os.environ.get('TRACE_ALLOCATIONS') == '1':
            trace_impl.write(f'MMAP args={[hex(v) for v in x]} heap={ns["heap_ptr"][0]:#x}\\n')
        ret = allocate_mapping(uc, x[1])
    elif lr == 0x8ddf4:  # 通用 scall 包装器 0x8dda4：w5=主syscall号,w6=备syscall号
        num = x[5] & 0xffffffff
        ret = do_scall_syscall(uc, num, x)
    elif lr == 0x18ad70:  # openat(dirfd,path,flags,mode)：此封装将路径放在 x1
        ret = do_scall_syscall(uc, 56, x)
    elif lr == 0x8e110:  # lseek(fd,offset,whence)
        ret = do_scall_syscall(uc, 62, x)
    elif lr == 0x873c0:  # read(fd,buf,count)
        ret = do_scall_syscall(uc, 63, x)
    elif lr == 0x18ab88:  # close(fd)
        ret = do_scall_syscall(uc, 57, x)
    elif lr == 0x924e8:  # munmap(addr,length)
        ret = release_mapping(uc, x[0], x[1])
    else:
        dlog.write(f'SCALL unknown lr={lr:#x} x0={x[0]:#x} x1={x[1]:#x} x5={x[5]:#x}\n')
        trace_impl.write(f'SCALL UNKNOWN lr={lr:#x} args={[hex(v) for v in x]}\n')
        ret = 0
    uc.reg_write(UC_ARM64_REG_X0, ret & 0xffffffffffffffff)

MMAP_BASE = 0x9000000000
mmap_next = [ns.get('snapshot_pystate', {}).get('mmap_next', MMAP_BASE)]
def allocate_mapping(uc, size):
    size = (size + 0xfff) & ~0xfff
    if size == 0:
        return 0
    address = mmap_next[0]
    uc.mem_map(address, size)
    mmap_next[0] += size
    return address

def release_mapping(uc, address, size):
    if address == 0 or address < MMAP_BASE:
        return -22
    size = (size + 0xfff) & ~0xfff
    trace_impl.write(f'RELEASE MAPPING address={address:#x} size={size:#x} lr={uc.reg_read(UC_ARM64_REG_LR)-BASE:#x}\n')
    uc.mem_unmap(address, size)
    return 0

def do_scall_syscall(uc, num, x):
    # 复用 emu2 的 svc 语义：mmap/munmap使用独立虚拟内存区，不侵占NP的malloc堆
    if num == 222: return allocate_mapping(uc, x[1])  # mmap
    if num == 226:
        if os.environ.get('REAL_MEMORY_PERMISSIONS') == '1':
            uc.mem_protect(x[0] & ~0xfff, (x[1] + 0xfff) & ~0xfff, x[2])
        return 0  # mprotect
    if num == 215: return release_mapping(uc, x[0], x[1])  # munmap
    if num == 56:  # openat
        p = ns['read_cstr'](x[1]); return live['fake_open'](p)
    if num == 57:  # close
        ns['fd_map'].pop(x[0], None); return 0
    if num == 63:  # read
        info = ns['fd_map'].get(x[0])
        if info:
            c = ns['file_content'](info[0]); chunk = c[info[1]:info[1]+x[2]]; info[1] += len(chunk)
            try: uc.mem_write(x[1], chunk)
            except UcError: pass
            if info[0].endswith('/maps') or info[0].endswith('/self/maps'):
                trace_impl.write(f'MAPS READ fd={x[0]} pos={info[1]} got={len(chunk)} data={chunk[:160]!r}\n')
            if 'global-metadata.dat' in info[0]:
                trace_impl.write(f'METADATA READ fd={x[0]} buffer={x[1]:#x} end={info[1]:#x} got={len(chunk)} head={chunk[:32].hex()} caller={uc.reg_read(UC_ARM64_REG_LR)-BASE:#x}\n')
            return len(chunk)
        return 0
    if num == 64: return x[2]  # write
    if num == 172: return 12345  # getpid
    if num == 178: return 12345  # gettid
    if num == 217: return 0  # getdents64 空
    if num == 48:  # faccessat
        p = ns['read_cstr'](x[1]); return 0 if ns['lib_exists'](p) else -2
    if num == 79:  # fstatat
        p = ns['read_cstr'](x[1]); c = ns['file_content'](p)
        if c: ns['write_stat'](x[2], len(c)); return 0
        return -2
    if num == 62:  # lseek：NP 的 maps 读取器每轮会重新定位到文件头
        info = ns['fd_map'].get(x[0])
        if not info: return -1
        total = len(ns['file_content'](info[0]))
        if x[2] == 0: info[1] = x[1]
        elif x[2] == 1: info[1] += x[1]
        else: info[1] = total + x[1]
        return info[1]
    if num == 67:  # pread64 不改变文件游标
        info = ns['fd_map'].get(x[0])
        if not info: return 0
        chunk = ns['file_content'](info[0])[x[3]:x[3]+x[2]]
        try: uc.mem_write(x[1], chunk)
        except UcError: pass
        if info[0].endswith('/maps'):
            trace_impl.write(f'MAPS PREAD fd={x[0]} off={x[3]} got={len(chunk)} data={chunk[:160]!r}\n')
        return len(chunk)
    if num == 117: return 0  # ptrace
    if num == 167: return 1 if x[0] == 3 else 0  # prctl
    dlog.write(f'SCALL syscall {num} unhandled x0={x[0]:#x}\n')
    return 0
live['handle_scall'] = handle_scall

# dispatch 桩调用日志：记录每个 ctx 偏移的调用参数，用于反推函数语义
from unicorn import UC_HOOK_CODE
dlog = open(os.path.join(HERE, 'dispatch_log.txt'), 'w', buffering=1)
dcount = [0]
def hook_dispatch(uc, addr, size, user):
    import struct as _s
    w = _s.unpack('<I', bytes(uc.mem_read(addr, 4)))[0]
    # 仅在 stub 入口（adrp 0x1b3000）记录，避免桩体内每条指令都记
    if (w & 0x9f000000) != 0x90000000: return
    immlo = (w >> 29) & 3; immhi = (w >> 5) & 0x7ffff; imm = (immhi << 2) | immlo
    if imm & 0x100000: imm -= 0x200000
    if (addr & ~0xfff) + imm * 4096 != 0x1b3000: return
    dcount[0] += 1
    if dcount[0] > 4000: return
    v = addr - BASE
    x0 = uc.reg_read(UC_ARM64_REG_X0); x1 = uc.reg_read(UC_ARM64_REG_X1)
    x2 = uc.reg_read(UC_ARM64_REG_X2); lr = uc.reg_read(UC_ARM64_REG_LR)
    off = '?'
    try:
        w3 = _s.unpack_from('<I', bytes(uc.mem_read(addr + 8, 4)), 0)[0]
        if (w3 & 0xFFC00000) == 0xF9400000:
            off = hex(((w3 >> 10) & 0xFFF) * 8)
    except Exception: pass
    dlog.write(f'#{dcount[0]} stub={v:#x} ctxoff={off} x0={x0:#x} x1={x1:#x} x2={x2:#x} lr={lr-BASE:#x}\n')
if os.environ.get('TRACE_STUBS') == '1':
    mu.hook_add(UC_HOOK_CODE, hook_dispatch, begin=BASE + 0x107400, end=BASE + 0x107900)

# scall 桩执行追踪：滚动记录最后 300 个块的寄存器，崩溃时转储定位错误跳转
from unicorn import UC_HOOK_BLOCK
from unicorn.arm64_const import (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X8, UC_ARM64_REG_X9,
    UC_ARM64_REG_X16, UC_ARM64_REG_X17, UC_ARM64_REG_X19, UC_ARM64_REG_X20, UC_ARM64_REG_LR, UC_ARM64_REG_PC)
from collections import deque
tlog = open(os.path.join(HERE, 'scall_trace.txt'), 'w', buffering=1)
reg_ring = deque(maxlen=300)
def hook_trace(uc, addr, size, user):
    r = [uc.reg_read(x) for x in (UC_ARM64_REG_X0, UC_ARM64_REG_X1, UC_ARM64_REG_X8, UC_ARM64_REG_X9, UC_ARM64_REG_X16, UC_ARM64_REG_X17, UC_ARM64_REG_X19, UC_ARM64_REG_X20, UC_ARM64_REG_LR)]
    reg_ring.append((addr - BASE, r))
if os.environ.get('TRACE_REGISTER_RING') == '1':
    mu.hook_add(UC_HOOK_BLOCK, hook_trace)
def dump_reg_ring():
    for v, r in reg_ring:
        tlog.write(f'{v:#x}: x0={r[0]:#x} x1={r[1]:#x} x8={r[2]:#x} x9={r[3]:#x} x16={r[4]:#x} x17={r[5]:#x} x19={r[6]:#x} x20={r[7]:#x} lr={r[8]-BASE:#x}\n')

# 广域监视：懒初始化期间写入 bss(0x1b0000-0x1c5000) 的代码指针值（找解密器地址）
from unicorn import UC_HOOK_MEM_WRITE
ptrlog = open(os.path.join(HERE, 'bss_ptr_writes.txt'), 'w', buffering=1)
def hook_bss_ptr(uc, access, addr, size, value, user):
    if size == 8 and 0x10000000 <= value < 0x101c6000:
        pc = uc.reg_read(UC_ARM64_REG_PC)
        ptrlog.write(f'[{addr-BASE:#x}] = code+{value-0x10000000:#x} pc={pc-BASE:#x}\n')
if os.environ.get('TRACE_STATE_WRITES') == '1':
    mu.hook_add(UC_HOOK_MEM_WRITE, hook_bss_ptr, begin=BASE + 0x1b0000, end=BASE + 0x1c5000)

IL2CPP_BASE = 0x8000000000
from np_lib import load
elf, f = load('libil2cpp.so')
f.seek(0)
data = f.read()
img_end = max(s.header.p_vaddr + s.header.p_memsz for s in elf.iter_segments() if s.header.p_type == 'PT_LOAD')
# 连续映射整个镜像（真实 linker 行为），恢复快照已有目标映射时不得重新映射或覆盖其内容
if not any(begin == IL2CPP_BASE for begin, end, permissions in mu.mem_regions()):
    mu.mem_map(IL2CPP_BASE, (img_end + 0xfff) & ~0xfff)
    for seg in elf.iter_segments():
        if seg.header.p_type != 'PT_LOAD': continue
        va, ms, fsz, off = seg.header.p_vaddr, seg.header.p_memsz, seg.header.p_filesz, seg.header.p_offset
        mu.mem_write(IL2CPP_BASE + va, data[off:off+fsz])
for seg in elf.iter_segments():
    if seg.header.p_type != 'PT_LOAD': continue
    va, ms, fsz, off = seg.header.p_vaddr, seg.header.p_memsz, seg.header.p_filesz, seg.header.p_offset
    print(f'il2cpp seg va={va:#x} fsz={fsz:#x} msz={ms:#x} flags={seg.header.p_flags}')
print(f'il2cpp image end: {img_end:#x}')

# 手填唯一关键 GOT：PLT@0x4dbbbb0 用 [0x50cd4c8] → SoLibraryStart 包装器
if os.environ.get('METADATA_FASTPATH') != '1':
    mu.mem_write(IL2CPP_BASE + 0x50cd4c8, struct.pack('<Q', BASE + 0x9c55c))

# maps 加入 libil2cpp（NP 可能按 x0 地址查 maps 定位调用模块）；保留 emu2 的合成 libc 等行
if not any(begin == IL2CPP_BASE for begin, end, path in live['loaded_modules']):
    live['PROC_MAPS'] = live['PROC_MAPS'] + (f'{IL2CPP_BASE:08x}-{IL2CPP_BASE+img_end:08x} r-xp 00000000 fd:00 1236 /data/app/lib/arm64/libil2cpp.so\n').encode()
    live['loaded_modules'].append((IL2CPP_BASE, IL2CPP_BASE + img_end, '/data/app/lib/arm64/libil2cpp.so'))

mu.reg_write(UC_ARM64_REG_SP, STACK + STACK_SZ - 0x1000)
mu.reg_write(UC_ARM64_REG_LR, RET_ADDR)
mu.reg_write(UC_ARM64_REG_X0, 0)

# ---- 模拟 NP Java 层 native init：构造最小假 JNIEnv，调用 JNI init 0x133ec4 设置密钥/标志 ----
FAKE = ns['FAKE']
JNI_TABLE = FAKE + 0x40000      # JNINativeInterface* 函数表（250 项）
JNI_STUBS = FAKE + 0x50000      # 每个 JNI 函数一个 ret 桩
JNI_ENV = FAKE + 0x48000        # JNIEnv*（指向函数表指针）
JNI_OBJ = FAKE + 0x49000        # fake jobject
for i in range(250):
    mu.mem_write(JNI_TABLE + i * 8, struct.pack('<Q', JNI_STUBS + i * 4))
    mu.mem_write(JNI_STUBS + i * 4, struct.pack('<I', 0xd65f03c0))
mu.mem_write(JNI_ENV, struct.pack('<Q', JNI_TABLE))
jlog = open(os.path.join(HERE, 'jni_calls.txt'), 'w', buffering=1)
def _cstr(uc, p, n=256):
    if not p: return ''
    try:
        b = bytes(uc.mem_read(p, n)); e = b.find(b'\0')
        return b[:e if e >= 0 else n].decode('latin1')
    except UcError: return f'<unreadable {p:#x}>'
jni_method_names = {}
jni_field_names = {}
jni_id_counter = [0]
def jni_new_id(table, name):
    jni_id_counter[0] += 1
    value = JNI_OBJ + 0x800 + jni_id_counter[0] * 8
    table[value] = name
    return value

def hook_jni(uc, addr, size, user):
    idx = (addr - JNI_STUBS) // 4
    x1 = uc.reg_read(UC_ARM64_REG_X1); x2 = uc.reg_read(UC_ARM64_REG_X2)
    x3 = uc.reg_read(UC_ARM64_REG_X3)
    extra = ''
    if idx == 6: extra = f' FindClass({_cstr(uc, x1)!r})'
    elif idx in (33, 113):
        extra = f' MethodID({_cstr(uc, x2)!r},{_cstr(uc, x3)!r})'
    elif idx in (94, 95, 100):
        extra = f' Field({_cstr(uc, x2)!r},{_cstr(uc, x3)!r})'
    elif idx in (34, 35, 36, 114, 115, 116):
        extra = f' CallMethod(id={x2:#x},name={jni_method_names.get(x2, "")!r})'
    elif idx == 164: extra = f' NewStringUTF({_cstr(uc, x1)!r})'
    elif idx == 215:
        extra = f' RegisterNatives clazz={x1:#x} count={x3}'
        try:
            for k in range(min(x3, 60)):
                ent = bytes(uc.mem_read(x2 + k * 24, 24))
                np_, sp_, fp = struct.unpack('<QQQ', ent)
                extra += f'\n    [{k}] name={_cstr(uc, np_)!r} sig={_cstr(uc, sp_)!r} fn={fp:#x}'
        except UcError: extra += ' <table unreadable>'
    jlog.write(f'JNI[{idx}] x1={x1:#x} x2={x2:#x}{extra}\n')
    ret = 0
    if idx in (33, 113):
        ret = jni_new_id(jni_method_names, _cstr(uc, x2))
    elif idx in (94,):
        ret = jni_new_id(jni_field_names, _cstr(uc, x2))
    elif idx == 95:
        ret = JNI_OBJ + 0x400 + (x2 & 0xff)
    elif idx == 100:
        ret = 0
    elif idx in (114, 115, 116):
        name = jni_method_names.get(x2, '')
        ret = JNI_OBJ + (0x300 if name == 'currentActivityThread' else 0x500)
    elif idx in (34, 35, 36):
        name = jni_method_names.get(x2, '')
        ret = JNI_OBJ + (0x400 if name == 'getApplicationInfo' else 0x500)
    elif idx in (6, 31, 21, 169, 16, 27): ret = JNI_OBJ + 0x100 + idx * 8
    uc.reg_write(UC_ARM64_REG_X0, ret)
mu.hook_add(UC_HOOK_CODE, hook_jni, begin=JNI_STUBS, end=JNI_STUBS + 250 * 4)

signal_handlers = []
if os.environ.get('CAPTURE_SIGNAL') == '1':
    signal_log = open(os.path.join(HERE, 'signal_setup.txt'), 'w', buffering=1)
    def hook_signal_setup(uc, addr, size, user):
        x0 = uc.reg_read(UC_ARM64_REG_X0)
        x1 = uc.reg_read(UC_ARM64_REG_X1)
        lr = uc.reg_read(UC_ARM64_REG_LR)
        signal_handlers.append((x0, x1, lr))
        signal_log.write(f'ENTER 0x93ef0 old_actions={x0:#x} handler={x1:#x} handler_off={x1-BASE:#x} lr={lr:#x} lr_off={lr-BASE:#x}\n')
    mu.hook_add(UC_HOOK_CODE, hook_signal_setup, begin=BASE + 0x93ef0, end=BASE + 0x93ef0)

JNI_INIT = BASE + 0x133ec4
# DT_INIT 未设全局状态表基址 [0x1b2b90]（JNI init 崩溃 str w8,[x9=*[0x1b2b90],#0x254]）。手动 alloc 零表让其推进。
if os.environ.get('METADATA_FASTPATH') != '1':
    state_table = ns['alloc'](0x4000)
    mu.mem_write(BASE + 0x1b2b90, struct.pack('<Q', state_table))
    mu.mem_write(BASE + 0x1b2ba0, struct.pack('<Q', state_table + 0x100))
    print('manual state table [0x1b2b90] @', hex(state_table), ' [0x1b2ba0]->', hex(state_table + 0x100))
    print('calling NP JNI init @', hex(JNI_INIT))
    mu.reg_write(UC_ARM64_REG_SP, STACK + STACK_SZ - 0x2000)
    mu.reg_write(UC_ARM64_REG_LR, RET_ADDR)
    mu.reg_write(UC_ARM64_REG_X0, JNI_ENV)
    mu.reg_write(UC_ARM64_REG_X1, JNI_OBJ)
    mu.reg_write(UC_ARM64_REG_X2, 0)
    mu.reg_write(UC_ARM64_REG_X3, 0)
try:
    if os.environ.get('RESUME_MOD') == '1':
        print('JNI init skipped for post-mod resume')
    else:
        mu.emu_start(JNI_INIT, RET_ADDR, timeout=int(os.environ.get('EMULATION_TIMEOUT_US', '10000000')), count=200_000_000)
        print('JNI init returned OK')
except UcError as e:
    print('JNI init ERROR:', e, 'PC=', hex(mu.reg_read(UC_ARM64_REG_PC)))
if os.environ.get('CAPTURE_SIGNAL') == '1':
    print('captured signal handlers:', [(hex(a), hex(h), hex(lr)) for a, h, lr in signal_handlers])
    signal_log.flush()
    sys.exit(0)
def _rdg(v):
    try: return struct.unpack('<Q', bytes(mu.mem_read(BASE + v, 8)))[0]
    except UcError: return 0
print('after JNI init: flag[0x1b1020]=', hex(_rdg(0x1b1020)), 'real_fn[0x1b2bf8]=', hex(_rdg(0x1b2bf8)), 'ctx[0x1b3070]=', hex(_rdg(0x1b3070)))
print('  [0x1a8fc0]->', hex(_rdg(_rdg(0x1a8fc0) - BASE)) if _rdg(0x1a8fc0) else 0, ' [0x1a8e88]flag=', _rdg(0x1a8e88) & 0xff)
# JNI init 中间会清除刚设置的 bit0；真实 native 链在 DT_INIT 之后再调用 0x133ec4，补回该门控位
_rdb = lambda v: bytes(mu.mem_read(BASE + v, 1))[0]
if _rdb(0x1b0ef8) == 0:
    mu.mem_write(BASE + 0x1b0ef8, b'\x01')
    print('restored post-init flag [0x1b0ef8]=1')

# ---- 实验：调用主调度器候选 native，观察 RegisterNatives / real_fn ----
if os.environ.get('DISPATCH') == '1':
    candidates = (int(os.environ['DISPATCH_ONE'], 16),) if os.environ.get('DISPATCH_ONE') else (0x136b68, 0x135648, 0x136188, 0x134cb8, 0x1350cc, 0x1338a4)
    for cand in candidates:
        before = _rdg(0x1b2bf8)
        mu.reg_write(UC_ARM64_REG_SP, STACK + STACK_SZ - 0x3000)
        mu.reg_write(UC_ARM64_REG_LR, RET_ADDR)
        mu.reg_write(UC_ARM64_REG_X0, JNI_ENV)
        mu.reg_write(UC_ARM64_REG_X1, JNI_OBJ)
        mu.reg_write(UC_ARM64_REG_X2, JNI_OBJ + 0x200)
        mu.reg_write(UC_ARM64_REG_X3, 0)
        mu.reg_write(UC_ARM64_REG_X4, 0)
        mu.reg_write(UC_ARM64_REG_X5, 0)
        jlog.write(f'\n===== DISPATCH candidate {cand:#x} =====\n')
        try:
            mu.emu_start(BASE + cand, RET_ADDR, timeout=int(os.environ.get('EMULATION_TIMEOUT_US', '10000000')), count=100_000_000)
            print(f'dispatch {cand:#x} returned OK; real_fn={_rdg(0x1b2bf8):#x}')
        except UcError as e:
            print(f'dispatch {cand:#x} ERROR {e} PC={mu.reg_read(UC_ARM64_REG_PC):#x} real_fn={_rdg(0x1b2bf8):#x}')
        if _rdg(0x1b2bf8) != before:
            print(f'  *** real_fn CHANGED by {cand:#x}: {before:#x} -> {_rdg(0x1b2bf8):#x} ***')
            break
    if os.environ.get('DISPATCH_ONLY') == '1':
        print('dispatch-only stopping before target processing')
        sys.exit(0)

# setter 0x92dec 的正常分支安装一组绝对实现地址；当前 DT_INIT 快照未调用该 setter，直接补齐。
if os.environ.get('FORCE_REAL') == '1':
    impls = {0x1b2be8: 0x132d24, 0x1b2bf0: 0x10779c, 0x1b2bf8: 0x173b1c,
             0x1b2c00: 0x162d9c, 0x1b2c08: 0x109540}
    for slot, off in impls.items():
        mu.mem_write(BASE + slot, struct.pack('<Q', BASE + off))
    print('forced real implementations:', {hex(k): hex(v) for k, v in impls.items()})
    # 实现区在该库静态文件中仍加密，真实路径按需解密；记录首次实现的活内存字节用于校验
    if os.environ.get('METADATA_FASTPATH') != '1':
        impl_snapshot = bytes(mu.mem_read(BASE + 0x173b1c, 64))
        print('real impl first bytes:', impl_snapshot.hex())
        open(os.path.join(HERE, 'real_impl_live.bin'), 'wb').write(impl_snapshot)
    def hook_impl_entry(uc, addr, size, user):
        live_impl = bytes(uc.mem_read(BASE + 0x173b1c, 0x400))
        flowlog.write('IMPL LIVE ' + live_impl.hex() + '\n')
        open(os.path.join(HERE, 'real_impl_live_after.bin'), 'wb').write(live_impl)
        print('real impl live bytes:', live_impl[:64].hex())
        if os.environ.get('STOP_IMPL') == '1':
            uc.emu_stop()
    if os.environ.get('STOP_IMPL') == '1':
        mu.hook_add(UC_HOOK_CODE, hook_impl_entry, begin=BASE + 0x173b1c, end=BASE + 0x173b1c)
    def hook_impl_reenc(uc, access, addr, size, value, user):
        if BASE + 0x173b1c <= addr < BASE + 0x174000:
            region = bytes(uc.mem_read(BASE + 0x173000, 0x2000))
            open(os.path.join(HERE, 'real_impl_reenc.bin'), 'wb').write(region)
            flowlog.write(f'IMPL REENC addr={addr-BASE:#x} size={size} value={value:#x}\n')
            print('captured implementation region before re-encryption')
            uc.hook_del(hreenc)
    if os.environ.get('CAPTURE_REENCRYPTION') == '1':
        hreenc = mu.hook_add(UC_HOOK_MEM_WRITE, hook_impl_reenc, begin=BASE + 0x173000, end=BASE + 0x175000)
    # 实现页发生首次读取/解密时捕获，不执行到可能的重加密路径
    def hook_impl_read(uc, access, addr, size, value, user):
        if BASE + 0x173000 <= addr < BASE + 0x175000:
            region = bytes(uc.mem_read(BASE + 0x173000, 0x2000))
            open(os.path.join(HERE, 'real_impl_on_read.bin'), 'wb').write(region)
            flowlog.write(f'IMPL READ addr={addr-BASE:#x} size={size} pc={uc.reg_read(UC_ARM64_REG_PC)-BASE:#x}\n')
            print('captured implementation on first read')
            uc.emu_stop()
    if os.environ.get('CAPTURE_IMPL_READ') == '1':
        mu.hook_add(UC_HOOK_MEM_READ, hook_impl_read, begin=BASE + 0x173000, end=BASE + 0x175000)
    if os.environ.get('TRACE_IMPL') == '1':
        mu.hook_add(UC_HOOK_CODE, lambda uc, a, s, u: flowlog.write(f'IMPL {a-BASE:#x} x0={uc.reg_read(UC_ARM64_REG_X0):#x} x8={uc.reg_read(UC_ARM64_REG_X8):#x}\n'), begin=BASE + 0x173b1c, end=BASE + 0x173d00)

# 记录关键控制流门和实现入口；emu2 的 bss/rx 写hook本身报告重加密并终止跟踪，不阻止写入
from unicorn import UC_HOOK_CODE
flowlog = open(os.path.join(HERE, 'real_flow.txt'), 'w', buffering=1)
flow_off = [0x133ec4, 0x133f24, 0x13457c, 0x9c5a0, 0x9c570, 0x9c578, 0x9c58c, 0x173b1c,
            0x9cb0c, 0x9c6fc, 0x9c7f0, 0x9cdd4, 0x9ce70]
def hook_real_flow(uc, addr, size, user):
    flowlog.write(f'{addr-BASE:#x} x0={uc.reg_read(UC_ARM64_REG_X0):#x} flag={_rdb(0x1b0ef8)} ctx={_rdg(0x1b3070):#x} real={_rdg(0x1b2bf8):#x}\n')
    if addr == BASE + 0x9c578:
        regs = {f'x{i}': uc.reg_read(UC_ARM64_REG_X0 + i) for i in range(31)}
        regs['sp'] = uc.reg_read(UC_ARM64_REG_SP)
        flowlog.write('BEFORE REAL ' + repr(regs) + '\n')
        import pickle
        pickle.dump(regs, open(os.path.join(HERE, 'real_call_regs.pkl'), 'wb'))
    if addr == BASE + 0x9c58c:
        print('real function returned; il2cpp desc head=', bytes(mu.mem_read(IL2CPP_BASE + 0x3134000, 32)).hex())
        print('libil2cpp code head=', bytes(mu.mem_read(IL2CPP_BASE + 0x1d5aafc, 32)).hex())
if os.environ.get('TRACE_REAL_FLOW') == '1':
    for off in flow_off:
        mu.hook_add(UC_HOOK_CODE, hook_real_flow, begin=BASE + off, end=BASE + off)
if os.environ.get('TRACE_CONTEXT_INIT') == '1':
    def hook_context_init(uc, addr, size, user):
        if addr == BASE + 0x1074a8:
            trace_impl.write('CONTEXT CONSTRUCT ENTER x0=' + hex(uc.reg_read(UC_ARM64_REG_X0)) + ' LR=' + hex(uc.reg_read(UC_ARM64_REG_LR)-BASE) + '\n')
        else:
            trace_impl.write('CONTEXT CONSTRUCT RETURN PC=' + hex(addr-BASE) + ' LR=' + hex(uc.reg_read(UC_ARM64_REG_LR)-BASE) + ' ctx=' + bytes(uc.mem_read(BASE+0x1b3070, 0x180)).hex() + '\n')
            print('CONTEXT CONSTRUCT RETURN', hex(addr-BASE), flush=True)
    mu.hook_add(UC_HOOK_CODE, hook_context_init, begin=BASE + 0x1074a8, end=BASE + 0x1074a8)
    for off in (0x8f2e8, 0x8f32c, 0x8f378):
        mu.hook_add(UC_HOOK_CODE, hook_context_init, begin=BASE + off, end=BASE + off)
if os.environ.get('TRACE_STATE_MACHINE') == '1':
    def hook_state_machine(uc, addr, size, user):
        sp = uc.reg_read(UC_ARM64_REG_SP)
        fp = uc.reg_read(UC_ARM64_REG_X29)
        lr = uc.reg_read(UC_ARM64_REG_LR)
        print('STATE MACHINE', hex(addr-BASE), 'LR', hex(lr-BASE), 'FP', hex(fp), 'SP', hex(sp), flush=True)
        try:
            print('STATE STACK', bytes(uc.mem_read(sp, 0x120)).hex(), flush=True)
        except UcError:
            pass
        if addr == BASE + 0x172b34:
            print('HANDLER PARAMS', hex(uc.reg_read(UC_ARM64_REG_X0)), hex(uc.reg_read(UC_ARM64_REG_X1)), flush=True)
            uc.emu_stop()
    for off in (0x172000, 0x172b34):
        mu.hook_add(UC_HOOK_CODE, hook_state_machine, begin=BASE + off, end=BASE + off)
if os.environ.get('TRACE_INDEX_INIT') == '1':
    def hook_index_init(uc, addr, size, user):
        print('INDEX INIT', hex(addr-BASE), 'x0', hex(uc.reg_read(UC_ARM64_REG_X0)), 'LR', hex(uc.reg_read(UC_ARM64_REG_LR)-BASE), 'index', bytes(uc.mem_read(BASE + 0x1aecfc, 8)).hex(), flush=True)
    mu.hook_add(UC_HOOK_CODE, hook_index_init, begin=BASE + 0x149d88, end=BASE + 0x149d88)
    mu.hook_add(UC_HOOK_CODE, hook_index_init, begin=BASE + 0x149e2c, end=BASE + 0x149e2c)
    mu.hook_add(UC_HOOK_CODE, hook_index_init, begin=BASE + 0x14b3f4, end=BASE + 0x14b3f4)
if os.environ.get('TRACE_INIT_ENTRY') == '1':
    def hook_init_entry_phase2(uc, addr, size, user):
        print('INIT ENTRY PHASE2', hex(addr-BASE), 'x0', hex(uc.reg_read(UC_ARM64_REG_X0)), 'LR', hex(uc.reg_read(UC_ARM64_REG_LR)-BASE), 'SP', hex(uc.reg_read(UC_ARM64_REG_SP)), flush=True)
        if addr == BASE + 0x149d74 and os.environ.get('STOP_INIT_ENTRY') == '1':
            uc.emu_stop()
    mu.hook_add(UC_HOOK_CODE, hook_init_entry_phase2, begin=BASE + 0x149d74, end=BASE + 0x149d74)
    for _offset in (0x9c5a0, 0x9ce54, 0x98a3c, 0x174ab8, 0x9a810, 0x9a8e8, 0x9db38):
        mu.hook_add(UC_HOOK_CODE, hook_init_entry_phase2, begin=BASE + _offset, end=BASE + _offset)

# 捕获密钥派生/OpenSSL 解析函数的间接调用及其输入输出；不改写正常逻辑
if os.environ.get('TRACE_CRYPTO') == '1':
    cryptolog = open(os.path.join(HERE, 'crypto_trace.txt'), 'w', buffering=1)
    def hook_crypto(uc, addr, size, user):
        v = addr - BASE
        regs = [uc.reg_read(UC_ARM64_REG_X0 + i) for i in range(4)]
        cryptolog.write(f'ENTER {v:#x} args={[hex(x) for x in regs]} lr={uc.reg_read(UC_ARM64_REG_LR)-BASE:#x}\n')
        if v == 0x109f78:
            data = bytes(uc.mem_read(BASE + 0x1aed20, 0x150))
            cryptolog.write('  embedded=' + data.hex() + '\n')
        if v == 0x109acc:
            try: cryptolog.write('  path=' + bytes(uc.mem_read(regs[1], 256)).split(b'\0')[0].hex() + '\n')
            except UcError: pass
    for off in (0x109acc, 0x109f78):
        mu.hook_add(UC_HOOK_CODE, hook_crypto, begin=BASE + off, end=BASE + off)
    def hook_crypto_ret(uc, addr, size, user):
        x0 = uc.reg_read(UC_ARM64_REG_X0)
        cryptolog.write(f'CRYPTO RET pc={addr-BASE:#x} x0={x0:#x}\n')
    for off in (0x109f04, 0x10a3f4):
        mu.hook_add(UC_HOOK_CODE, hook_crypto_ret, begin=BASE + off, end=BASE + off)

# 在主实现的实际调用者中记录关键解析函数返回值；同时记录目标库被写入的范围
def hook_target_fn(uc, addr, size, user):
    x = [uc.reg_read(UC_ARM64_REG_X0 + i) for i in range(4)]
    trace_impl.write(f'CALL {addr-BASE:#x} args={[hex(v) for v in x]} lr={uc.reg_read(UC_ARM64_REG_LR)-BASE:#x}\n')
if os.environ.get('CAPTURE_MEMORY_FAULT') == '1':
    from unicorn import UC_HOOK_MEM_PROT, UC_HOOK_MEM_READ_UNMAPPED, UC_HOOK_MEM_WRITE_UNMAPPED, UC_HOOK_MEM_FETCH_UNMAPPED
    def hook_memory_fault(uc, access, address, size, value, user):
        pc = uc.reg_read(UC_ARM64_REG_PC)
        print('MEMORY FAULT', 'access', access, 'address', hex(address), 'size', size, 'pc', hex(pc), 'lr', hex(uc.reg_read(UC_ARM64_REG_LR)))
        trace_impl.write(f'MEMORY FAULT access={access} address={address:#x} size={size} pc={pc-BASE:#x} lr={uc.reg_read(UC_ARM64_REG_LR)-BASE:#x}\n')
        uc.emu_stop()
        return False
    mu.hook_add(UC_HOOK_MEM_PROT | UC_HOOK_MEM_READ_UNMAPPED | UC_HOOK_MEM_WRITE_UNMAPPED | UC_HOOK_MEM_FETCH_UNMAPPED, hook_memory_fault)
if os.environ.get('TRACE_TARGET_CALLS') == '1':
    for off in (0x9659c, 0x162898, 0x173aa4, 0x1748a0, 0x174934, 0x138a1c, 0x138ca0, 0x137918, 0x137954, 0x137968):
        mu.hook_add(UC_HOOK_CODE, hook_target_fn, begin=BASE + off, end=BASE + off)
target_write_summary = {'count': 0, 'minimum': img_end, 'maximum': 0, 'pcs': {}}
def hook_target_write(uc, access, addr, size, value, user):
    if IL2CPP_BASE <= addr < IL2CPP_BASE + img_end:
        offset = addr - IL2CPP_BASE
        target_write_summary['count'] += 1
        target_write_summary['minimum'] = min(target_write_summary['minimum'], offset)
        target_write_summary['maximum'] = max(target_write_summary['maximum'], offset + size)
        pc = uc.reg_read(UC_ARM64_REG_PC) - BASE
        key = hex(pc)
        target_write_summary['pcs'][key] = target_write_summary['pcs'].get(key, 0) + 1
        if os.environ.get('TRACE_TARGET_WRITES') == '1':
            trace_impl.write(f'IL2CPP WRITE addr={offset:#x} size={size} value={value:#x} pc={pc:#x}\n')
if os.environ.get('TRACE_TARGET_WRITES') == '1' or os.environ.get('SUMMARIZE_TARGET_WRITES') == '1':
    mu.hook_add(UC_HOOK_MEM_WRITE, hook_target_write, begin=IL2CPP_BASE, end=IL2CPP_BASE + img_end)

# 实际打开目标库后补文件读取日志，pread/read 不可混用游标语义
_orig_fake_open = ns['fake_open']
def traced_fake_open(path):
    fd = _orig_fake_open(path)
    trace_impl.write(f'FILE OPEN fd={fd} path={path}\n')
    if 'global-metadata.dat' in path:
        print('METADATA OPEN CAPTURED', path, 'fd', fd, flush=True)
        import pickle
        prefix = os.path.join(HERE, 'metadata_access')
        pickle.dump(uc_context := mu.context_save(), open(prefix + '_ctx.pkl', 'wb'))
        pickle.dump({'heap_ptr': ns['heap_ptr'][0], 'fd_next': ns['fd_next'][0], 'fd_map': dict(ns['fd_map']), 'rand_state': ns['rand_state'][0], 'path': path, 'fd': fd}, open(prefix + '_pystate.pkl', 'wb'))
        regions = []
        for begin, end, permissions in mu.mem_regions():
            regions.append((begin, end - begin + 1, bytes(mu.mem_read(begin, end - begin + 1))))
        pickle.dump(regions, open(prefix + '_mem.pkl', 'wb'), protocol=pickle.HIGHEST_PROTOCOL)
        print('METADATA SNAPSHOT SAVED', flush=True)
        mu.emu_stop()
    return fd
live['fake_open'] = traced_fake_open

# 只记录 0x9659c 完成时的返回值和调用现场，识别模块定位失败的具体原因
# 影子快照可能漏掉局部代码的首次写入；进入目标函数前保存真实执行字节供后续分析/恢复
def hook_fcfn(uc, addr, size, user):
    region = bytes(uc.mem_read(BASE + 0xfcf10, 0x100))
    open(os.path.join(HERE, 'fcfn_live.bin'), 'wb').write(region)
    trace_impl.write('FCFN LIVE=' + region.hex() + '\n')
    print('captured fcfn live:', region[0xb0:0xd0].hex())
    uc.hook_del(hfcfn)
if os.environ.get('METADATA_FASTPATH') != '1':
    hfcfn = mu.hook_add(UC_HOOK_CODE, hook_fcfn, begin=BASE + 0xfcf10, end=BASE + 0xfcf10)

if os.environ.get('CAPTURE_TARGET_TRAP') == '1':
    import pickle
    def hook_target_trap(uc, addr, size, user):
        regs = {f'x{i}': uc.reg_read(UC_ARM64_REG_X0 + i) for i in range(31)}
        regs['sp'] = uc.reg_read(UC_ARM64_REG_SP)
        regs['pc'] = uc.reg_read(UC_ARM64_REG_PC)
        regs['lr'] = uc.reg_read(UC_ARM64_REG_LR)
        result = {'regs': regs, 'code': bytes(uc.mem_read(addr - 128, 384))}
        for name in ('x0', 'x1', 'x2', 'x8', 'x19', 'x20', 'sp'):
            try:
                result[name] = bytes(uc.mem_read(regs[name], 0x100))
            except UcError:
                result[name] = None
        with open(os.path.join(HERE, 'target_trap.pkl'), 'wb') as out:
            pickle.dump(result, out)
        print('target trap captured:', hex(addr))
        uc.emu_stop()
    mu.hook_add(UC_HOOK_CODE, hook_target_trap, begin=BASE + 0x160af4, end=BASE + 0x160af4)

if os.environ.get('TRACE_TARGET_DISPATCH') == '1':
    from unicorn import UC_HOOK_MEM_FETCH_UNMAPPED
    dispatch_count = [0]
    dispatch_limit = int(os.environ.get('DISPATCH_LIMIT', '512'))
    def hook_target_dispatch(uc, addr, size, user):
        if dispatch_count[0] >= dispatch_limit:
            uc.emu_stop()
            return
        dispatch_count[0] += 1
        vals = [uc.reg_read(reg) for reg in (UC_ARM64_REG_X8, UC_ARM64_REG_X11, UC_ARM64_REG_X19, UC_ARM64_REG_X20, UC_ARM64_REG_X25, UC_ARM64_REG_LR)]
        trace_impl.write(f'DISPATCH STATE pc={addr-BASE:#x} x8={vals[0]:#x} x11={vals[1]:#x} x19={vals[2]:#x} x20={vals[3]:#x} x25={vals[4]:#x} lr={vals[5]:#x}\n')
    iteration_count = [0]
    last_iteration = [None]
    def hook_dispatch_iteration(uc, addr, size, user):
        iteration = uc.reg_read(UC_ARM64_REG_X8)
        target = uc.reg_read(UC_ARM64_REG_X23)
        iteration_count[0] += 1
        if iteration != last_iteration[0] or iteration_count[0] % 256 == 0:
            last_iteration[0] = iteration
            if target <= IL2CPP_BASE + img_end:
                trace_impl.write(f'DISPATCH ITERATION count={iteration_count[0]} index={iteration:#x} target={target-IL2CPP_BASE:#x}\n')
    mu.hook_add(UC_HOOK_CODE, hook_dispatch_iteration, begin=BASE + 0x160cf4, end=BASE + 0x160cf4)
    def hook_target_invalid(uc, access, address, size, value, user):
        pc = uc.reg_read(UC_ARM64_REG_PC)
        regs = {f'x{i}': uc.reg_read(UC_ARM64_REG_X0 + i) for i in range(31)}
        regs.update(pc=pc, sp=uc.reg_read(UC_ARM64_REG_SP), lr=uc.reg_read(UC_ARM64_REG_LR), fault_address=address, access=access)
        import pickle
        with open(os.path.join(HERE, 'target_invalid.pkl'), 'wb') as out:
            pickle.dump(regs, out)
        print('TARGET INVALID FETCH', hex(address), 'PC', hex(pc), 'LR', hex(regs['lr']))
        uc.emu_stop()
        return False
    mu.hook_add(UC_HOOK_BLOCK, hook_target_dispatch, begin=BASE + 0x160af4, end=BASE + 0x161100)
    mu.hook_add(UC_HOOK_MEM_FETCH_UNMAPPED, hook_target_invalid)

if os.environ.get('CAPTURE_CONTENT_FRAME') == '1':
    import pickle
    def hook_content_frame(uc, addr, size, user):
        sp = uc.reg_read(UC_ARM64_REG_SP)
        fp = uc.reg_read(UC_ARM64_REG_X29)
        result = {
            'sp': sp,
            'fp': fp,
            'stack': bytes(uc.mem_read(sp, 0xa60)),
            'object': bytes(uc.mem_read(uc.reg_read(UC_ARM64_REG_X0), 0xb98)),
            'key': bytes(uc.mem_read(fp - 0x40, 0x10)),
            'pc': addr,
        }
        with open(os.path.join(HERE, 'content_frame.pkl'), 'wb') as out:
            pickle.dump(result, out)
        print('content frame captured sp=', hex(sp), 'fp=', hex(fp), 'key=', result['key'].hex())
        uc.emu_stop()
    mu.hook_add(UC_HOOK_CODE, hook_content_frame, begin=BASE + 0x1602c0, end=BASE + 0x1602c0)

if os.environ.get('CAPTURE_XOR_KEY') == '1':
    import pickle
    def hook_xor_key(uc, addr, size, user):
        sp = uc.reg_read(UC_ARM64_REG_SP)
        fp = uc.reg_read(UC_ARM64_REG_X29)
        key = bytes(uc.mem_read(fp - 0x40, 0x10))
        stack = bytes(uc.mem_read(sp, 0x1c0))
        index = struct.unpack_from('<i', stack, 0x174)[0]
        limit = struct.unpack_from('<i', stack, 0x114)[0]
        source = struct.unpack_from('<Q', stack, 0x168)[0]
        dest = struct.unpack_from('<Q', stack, 0x180)[0]
        def sample(pointer):
            try:
                return bytes(uc.mem_read(pointer + index * 8, 8))
            except UcError:
                return None
        result = {
            'sp': sp,
            'stack': stack,
            'key': key,
            'index': index,
            'limit': limit,
            'source': source,
            'dest': dest,
            'source_sample': sample(source),
            'dest_sample': sample(dest),
            'regs': {f'x{i}': uc.reg_read(UC_ARM64_REG_X0 + i) for i in range(31)},
        }
        with open(os.path.join(HERE, 'xor_key_frame.pkl'), 'wb') as out:
            pickle.dump(result, out)
        print('XOR frame captured key=', key.hex(), 'index=', index, 'limit=', limit, 'source=', hex(source), 'dest=', hex(dest))
        uc.emu_stop()
    mu.hook_add(UC_HOOK_CODE, hook_xor_key, begin=BASE + 0x160f14, end=BASE + 0x160f14)

if os.environ.get('CAPTURE_EXECUTED_PAGES') == '1':
    from pathlib import Path
    capture_dir = Path(HERE) / 'executed_pages'
    capture_dir.mkdir(exist_ok=True)
    captured_pages = set()
    def hook_executed_page(uc, addr, size, user):
        page = addr & ~0xfff
        if page in captured_pages:
            return
        captured_pages.add(page)
        try:
            content = bytes(uc.mem_read(page, 0x1000))
            (capture_dir / f'{page:x}.bin').write_bytes(content)
            print('EXECUTED PAGE', hex(page), flush=True)
        except UcError:
            captured_pages.discard(page)
    mu.hook_add(UC_HOOK_BLOCK, hook_executed_page, begin=IL2CPP_BASE, end=IL2CPP_BASE + img_end)

if os.environ.get('MAP_MOD') == '1':
    # 与前半段0xfcf80-0xfcf98完全同构：平方结果的隐藏返回对象是sp+8，模数是x20；陷阱前一条伪指令已破坏x1，必须恢复真实模数指针。
    mod_count = [0]
    def read_bignum(uc, p):
        n = struct.unpack('<I', bytes(uc.mem_read(p, 4)))[0]
        data = struct.unpack('<Q', bytes(uc.mem_read(p + 8, 8)))[0]
        value = 0
        if n and n < 0x10000:
            raw = bytes(uc.mem_read(data, n * 4))
            value = int.from_bytes(raw, 'little')
        return n, value
    def hook_mod_trap(uc, addr, size, user):
        source = uc.reg_read(UC_ARM64_REG_X0)
        modulus = uc.reg_read(UC_ARM64_REG_X20)
        mod_count[0] += 1
        if mod_count[0] <= 8 and os.environ.get('TRACE_BIGINT') == '1':
            trace_impl.write(f'MOD ENTER #{mod_count[0]} square={read_bignum(uc, source)} modulus={read_bignum(uc, modulus)}\n')
        uc.reg_write(UC_ARM64_REG_X1, modulus)
        uc.reg_write(UC_ARM64_REG_LR, BASE + 0xfcfe0)
        uc.reg_write(UC_ARM64_REG_PC, BASE + 0x82c58)
    def hook_mod_return(uc, addr, size, user):
        if mod_count[0] <= 8 and os.environ.get('TRACE_BIGINT') == '1':
            trace_impl.write(f'MOD RESULT #{mod_count[0]} dest={read_bignum(uc, uc.reg_read(UC_ARM64_REG_SP) + 8)} x22={read_bignum(uc, uc.reg_read(UC_ARM64_REG_X22))}\n')
        if mod_count[0] == 1 and os.environ.get('SAVE_MOD_STATE') == '1':
            import pickle
            pickle.dump(uc.context_save(), open(os.path.join(HERE, 'post_mod_ctx.pkl'), 'wb'))
            pickle.dump({'heap_ptr': ns['heap_ptr'][0], 'fd_next': ns['fd_next'][0], 'fd_map': dict(ns['fd_map']), 'rand_state': ns['rand_state'][0]}, open(os.path.join(HERE, 'post_mod_pystate.pkl'), 'wb'))
            regions = []
            for begin, end, permissions in uc.mem_regions():
                size = end - begin + 1
                if begin == ns['HEAP']:
                    size = min(size, (ns['heap_ptr'][0] - ns['HEAP'] + 0xfff) & ~0xfff)
                elif begin == ns['STACK']:
                    begin = ns['STACK'] + ns['STACK_SZ'] - 0x20000
                    size = 0x20000
                regions.append((begin, size, bytes(uc.mem_read(begin, size))))
            pickle.dump(regions, open(os.path.join(HERE, 'post_mod_mem.pkl'), 'wb'), protocol=pickle.HIGHEST_PROTOCOL)
            print('post-mod state saved; continuing')
    mu.hook_add(UC_HOOK_CODE, hook_mod_trap, begin=BASE + 0xfcfdc, end=BASE + 0xfcfdc)
    mu.hook_add(UC_HOOK_CODE, hook_mod_return, begin=BASE + 0xfcfe0, end=BASE + 0xfcfe0)
    resize_count = [0]
    def hook_resize_trap(uc, addr, size, user):
        requested = uc.reg_read(UC_ARM64_REG_X20) & 0xffffffff
        uc.reg_write(UC_ARM64_REG_X21, requested)
        uc.reg_write(UC_ARM64_REG_PC, BASE + 0xfc690)
        resize_count[0] += 1
        if resize_count[0] <= 4 and os.environ.get('TRACE_BIGINT') == '1':
            trace_impl.write(f'BYTE VECTOR RESIZE #{resize_count[0]} bytes={requested}\n')
    mu.hook_add(UC_HOOK_CODE, hook_resize_trap, begin=BASE + 0xfc68c, end=BASE + 0xfc68c)

if os.environ.get('CAPTURE_COPY_FAULT') == '1':
    def hook_copy_fault(uc, addr, size, user):
        regs = {f'x{i}': uc.reg_read(UC_ARM64_REG_X0 + i) for i in range(22)}
        print('COPY FAULT regs', {k: hex(v) for k,v in regs.items()})
        for name in ('x0', 'x1', 'x8', 'x19', 'x20'):
            p = regs[name]
            try: print(name, bytes(uc.mem_read(p, 32)).hex())
            except UcError: print(name, 'unmapped')
        uc.emu_stop()
    mu.hook_add(UC_HOOK_CODE, hook_copy_fault, begin=BASE + 0x824ec, end=BASE + 0x824ec)

if os.environ.get('MAP_COPY') == '1':
    def hook_map_copy(uc, addr, size, user):
        source = uc.reg_read(UC_ARM64_REG_X0)
        dest = uc.reg_read(UC_ARM64_REG_X8)
        n = struct.unpack('<I', bytes(uc.mem_read(source, 4)))[0]
        if n > 0x10000:
            raise RuntimeError(f'invalid copy limb count {n:#x}')
        src_data = struct.unpack('<Q', bytes(uc.mem_read(source + 8, 8)))[0] if n else 0
        dst_data = ns['alloc'](n * 4) if n else 0
        if n:
            uc.mem_write(dst_data, bytes(uc.mem_read(src_data, n * 4)))
        uc.mem_write(dest, struct.pack('<IQ', n, dst_data))
        uc.reg_write(UC_ARM64_REG_PC, BASE + 0xfcfe0)
        trace_impl.write(f'MAP copy-object source={source:#x} dest={dest:#x} n={n}\n')
        uc.hook_del(hmap_copy)
    hmap_copy = mu.hook_add(UC_HOOK_CODE, hook_map_copy, begin=BASE + 0xfcfdc, end=BASE + 0xfcfdc)

if os.environ.get('MAP_FCF') == '1':
    def hook_map_fcf(uc, addr, size, user):
        uc.reg_write(UC_ARM64_REG_LR, BASE + 0xfcfe0)
        uc.reg_write(UC_ARM64_REG_PC, BASE + 0x8349c)
        trace_impl.write('MAP fcf->0x8349c as BL, LR=0xfcfe0\n')
        uc.hook_del(hmap_fcf)
    hmap_fcf = mu.hook_add(UC_HOOK_CODE, hook_map_fcf, begin=BASE + 0xfcfdc, end=BASE + 0xfcfdc)

if os.environ.get('CAPTURE_FAULT') == '1':
    import json
    def hook_fault_capture(uc, addr, size, user):
        regs = {f'x{i}': uc.reg_read(UC_ARM64_REG_X0 + i) for i in range(31)}
        regs['sp'] = uc.reg_read(UC_ARM64_REG_SP)
        regs['pc'] = uc.reg_read(UC_ARM64_REG_PC)
        regs['lr'] = uc.reg_read(UC_ARM64_REG_LR)
        result = {'regs': {k: hex(v) for k, v in regs.items()}, 'memory': {}}
        for name, address in regs.items():
            if name in ('sp', 'x19', 'x29', 'x0', 'x8', 'x11', 'x30'):
                try:
                    result['memory'][name] = bytes(uc.mem_read(address, 0x100)).hex()
                except UcError:
                    result['memory'][name] = None
        open(os.path.join(HERE, 'fault_context.json'), 'w').write(json.dumps(result, indent=2))
        print('fault context captured; stopping without SVC substitution')
        uc.emu_stop()
    mu.hook_add(UC_HOOK_CODE, hook_fault_capture, begin=BASE + 0xfcfdc, end=BASE + 0xfcfdc)

if os.environ.get('TRACE_LOCATE') == '1':
    locate_saved = {}
    def hook_locate_entry(uc, addr, size, user):
        locate_saved.clear()
        for i, reg in enumerate((UC_ARM64_REG_X29, UC_ARM64_REG_X30, UC_ARM64_REG_SP)):
            locate_saved[i] = uc.reg_read(reg)
        trace_impl.write(f'LOCATE ENTER sp={locate_saved[2]:#x} fp={locate_saved[0]:#x}\n')
        ctx = struct.unpack('<Q', bytes(uc.mem_read(BASE + 0x1b0f70, 8)))[0]
        trace_impl.write(f'  ctx={ctx:#x} data=' + bytes(uc.mem_read(ctx, 0x2d0)).hex() + '\n')
        trace_impl.write('  maps=' + live['PROC_MAPS'].decode('utf-8', 'replace') + '\n')
    def hook_locate_ret(uc, addr, size, user):
        sp = uc.reg_read(UC_ARM64_REG_SP)
        trace_impl.write(f'LOCATE RET pc={addr-BASE:#x} x0={uc.reg_read(UC_ARM64_REG_X0):#x} sp={sp:#x}\n')
        try:
            trace_impl.write('  frame=' + bytes(uc.mem_read(sp, 0x80)).hex() + '\n')
        except UcError:
            pass
    mu.hook_add(UC_HOOK_CODE, hook_locate_entry, begin=BASE + 0x9659c, end=BASE + 0x9659c)
    for off in (0x173bd8, 0x174838, 0x96f14):
        mu.hook_add(UC_HOOK_CODE, hook_locate_ret, begin=BASE + off, end=BASE + off)
    # 记录 maps 行解析的实际输入及解析结果
    def hook_maps_scan(uc, addr, size, user):
        x0 = uc.reg_read(UC_ARM64_REG_X0); x1 = uc.reg_read(UC_ARM64_REG_X1)
        trace_impl.write(f'MAPS SCAN in={ns["read_cstr"](x0, 256)!r} fmt={ns["read_cstr"](x1, 128)!r}\n')
    mu.hook_add(UC_HOOK_CODE, hook_maps_scan, begin=BASE + 0x814c0, end=BASE + 0x814c0)
    def hook_maps_reader(uc, addr, size, user):
        x19 = uc.reg_read(UC_ARM64_REG_X19)
        try:
            data = bytes(uc.mem_read(x19, 0x30))
            trace_impl.write(f'MAPS READER pc={addr-BASE:#x} fdinfo={data.hex()} path={ns["read_cstr"](x19 + 0x24, 160)!r}\n')
        except UcError: pass
    for off in (0x1904cc, 0x19050c, 0x1905bc, 0x1906b8):
        mu.hook_add(UC_HOOK_CODE, hook_maps_reader, begin=BASE + off, end=BASE + off)

resuming = os.environ.get('RESUME_MOD') == '1'
if resuming:
    import pickle
    snapshot_prefix = os.environ.get('SNAPSHOT_PREFIX', 'post_mod')
    # 恢复内存状态（NP 解密代码、IL2CPP 部分解密数据等），否则续跑时内存为初始加密态导致崩溃。动态 mmap 区域需先映射再写入
    with open(os.path.join(HERE, snapshot_prefix + '_mem.pkl'), 'rb') as inp:
        regions = pickle.load(inp)
    _mapped = [(s, e) for s, e, _ in mu.mem_regions()]
    def _is_mapped(addr, sz):
        for s, e in _mapped:
            if s <= addr and addr + sz - 1 <= e:
                return True
        return False
    for begin, size, data in regions:
        if not _is_mapped(begin, size):
            try:
                mu.mem_map(begin, (size + 0xfff) & ~0xfff)
                _mapped.append((begin, begin + ((size + 0xfff) & ~0xfff) - 1))
            except UcError:
                pass
        mu.mem_write(begin, data)
    print(f'restored {len(regions)} memory regions from {snapshot_prefix}_mem.pkl')
    # 恢复 Python 侧状态（堆指针、fd 映射、随机数状态）
    pystate = pickle.load(open(os.path.join(HERE, snapshot_prefix + '_pystate.pkl'), 'rb'))
    ns['heap_ptr'][0] = pystate['heap_ptr']
    ns['fd_next'][0] = pystate['fd_next']
    ns['fd_map'].clear()
    ns['fd_map'].update(pystate['fd_map'])
    ns['rand_state'][0] = pystate['rand_state']
    mu.context_restore(pickle.load(open(os.path.join(HERE, snapshot_prefix + '_ctx.pkl'), 'rb')))
print('SNAPSHOT AND PROBES READY', flush=True)
init2 = mu.reg_read(UC_ARM64_REG_PC) if resuming else IL2CPP_BASE + 0x3134504
if resuming and os.environ.get('RESUME_TO_MOD_RETURN') == '1' and os.environ.get('METADATA_FASTPATH') != '1':
    mu.reg_write(UC_ARM64_REG_LR, RET_ADDR)
    init2 = BASE + 0xfcfe0
if os.environ.get('RESUME_CONTENT_FRAME') == '1':
    import pickle
    with open(os.path.join(HERE, 'post_mod_mem.pkl'), 'rb') as inp:
        regions = pickle.load(inp)
    stack_base = next(begin for begin, size, content in regions if begin <= mu.reg_read(UC_ARM64_REG_SP) < begin + size)
    mu.reg_write(UC_ARM64_REG_SP, stack_base + 0x1da00)
    mu.reg_write(UC_ARM64_REG_LR, RET_ADDR)
    init2 = BASE + 0x1602c0
print('resume saved PC @' if resuming else 'il2cpp DT_INIT @', hex(init2), flush=True)
if not resuming:
    mu.reg_write(UC_ARM64_REG_SP, STACK + STACK_SZ - 0x1000)
    mu.reg_write(UC_ARM64_REG_LR, RET_ADDR)
    mu.reg_write(UC_ARM64_REG_X0, 0)
try:
    mu.emu_start(init2, RET_ADDR, timeout=int(os.environ.get('EMULATION_TIMEOUT_US', '10000000')), count=int(os.environ.get('INSTRUCTION_LIMIT', '200000000')))
    if mu.reg_read(UC_ARM64_REG_PC) == RET_ADDR:
        print('il2cpp init reached return stub')
    elif ns['stopped'][0]:
        print('il2cpp init stopped early')
    else:
        print('il2cpp init reached execution limit or timeout')
except UcError as e:
    pc = mu.reg_read(UC_ARM64_REG_PC)
    print('EMU ERROR:', e, 'PC=', hex(pc))
    # 崩溃诊断：关键全局对象与 ctx 状态
    def _rd(v):
        try: return struct.unpack('<Q', bytes(mu.mem_read(BASE + v, 8)))[0]
        except UcError: return None
    print('  [0x1a8ed8]=', hex(_rd(0x1a8ed8) or 0), ' [0x1a8e28]=', hex(_rd(0x1a8e28) or 0))
    objp = _rd(0x1a8ed8)
    if objp and BASE <= objp < BASE + 0x1c6000:
        o = objp - BASE
        print('  obj@', hex(o), '+0x98=', hex(_rd(o + 0x98) or 0), '+0xa0=', hex(_rd(o + 0xa0) or 0))
        print('  obj head:', bytes(mu.mem_read(objp, 32)).hex())
    print('  ctx[0x1b3070]=', hex(_rd(0x1b3070) or 0), ' flag[0x1b1020]=', hex(_rd(0x1b1020) or 0), ' real_fn[0x1b2bf8]=', hex(_rd(0x1b2bf8) or 0))
    # 垃圾 PC 的字节来源
    g = pc.to_bytes(8, 'little')
    sh = open(os.path.join(HERE, 'compatible_decrypted.bin'), 'rb').read()
    idx = sh.find(g)
    print('  garbage PC bytes found in shadow at:', hex(idx) if idx >= 0 else 'not found')
    dump_reg_ring()
if os.environ.get('METADATA_FASTPATH') == '1':
    print('metadata fastpath stopped', 'PC', hex(mu.reg_read(UC_ARM64_REG_PC)), 'blocks', ns['block_count'][0], 'LR', hex(mu.reg_read(UC_ARM64_REG_LR)), 'SP', hex(mu.reg_read(UC_ARM64_REG_SP)), flush=True)
# 转储 phase2 后的 compatible 内存
try:
    cimg = bytes(mu.mem_read(BASE, 0x1c6000))
    open(os.path.join(HERE, 'compatible_phase2.bin'), 'wb').write(cimg)
except UcError: pass
print('final PC:', hex(mu.reg_read(UC_ARM64_REG_PC)), 'LR:', hex(mu.reg_read(UC_ARM64_REG_LR)))
print('blocks:', ns['block_count'][0], 'svc:', len(ns['svc_log']), 'heap:', hex(ns['heap_ptr'][0] - ns['HEAP']))
log.close()
# 在模拟结束时保存完整检查点（覆盖 hook_mod_return 的早期保存），让下一轮从最远点续跑
if os.environ.get('SAVE_MOD_STATE') == '1':
    import pickle
    try:
        pickle.dump(mu.context_save(), open(os.path.join(HERE, 'post_mod_ctx.pkl'), 'wb'))
        pickle.dump({'heap_ptr': ns['heap_ptr'][0], 'fd_next': ns['fd_next'][0], 'fd_map': dict(ns['fd_map']), 'rand_state': ns['rand_state'][0]}, open(os.path.join(HERE, 'post_mod_pystate.pkl'), 'wb'))
        regions = []
        for begin, end, permissions in mu.mem_regions():
            size = end - begin + 1
            if begin == ns['HEAP']:
                size = min(size, (ns['heap_ptr'][0] - ns['HEAP'] + 0xfff) & ~0xfff)
            elif begin == ns['STACK']:
                begin = ns['STACK'] + ns['STACK_SZ'] - 0x20000
                size = 0x20000
            regions.append((begin, size, bytes(mu.mem_read(begin, size))))
        pickle.dump(regions, open(os.path.join(HERE, 'post_mod_mem.pkl'), 'wb'), protocol=pickle.HIGHEST_PROTOCOL)
        print('final checkpoint saved (post_mod_*)')
    except Exception as e:
        print(f'final checkpoint save failed: {e}')
# 转储 il2cpp 解密后内存
img = bytearray(img_end)
for seg in elf.iter_segments():
    if seg.header.p_type != 'PT_LOAD': continue
    va, ms = seg.header.p_vaddr, seg.header.p_memsz
    img[va:va+ms] = bytes(mu.mem_read(IL2CPP_BASE + va, ms))
open(os.path.join(HERE, 'libil2cpp_mem.bin'), 'wb').write(bytes(img))
print('il2cpp memory dumped:', hex(img_end))
import json
with open(os.path.join(HERE, 'target_write_summary.json'), 'w') as out:
    json.dump(target_write_summary, out, indent=2)
print('target write summary:', target_write_summary)
print('loaded file cache:', list(ns['real_cache'].keys()))
heap_used = ns['heap_ptr'][0] - ns['HEAP']
heap_data = bytes(mu.mem_read(ns['HEAP'], heap_used))
magic = bytes.fromhex('af1bb1fa')
metadata_offsets = []
position = heap_data.find(magic)
while position >= 0 and len(metadata_offsets) < 16:
    metadata_offsets.append(position)
    position = heap_data.find(magic, position + 1)
print('metadata magic in heap:', [hex(x) for x in metadata_offsets])
for position in metadata_offsets:
    available = heap_data[position:position + 0xbcdd9c]
    if len(available) >= 0x100:
        open(os.path.join(HERE, f'metadata_heap_{position:x}.bin'), 'wb').write(available)
        print('metadata heap candidate saved at', hex(position))