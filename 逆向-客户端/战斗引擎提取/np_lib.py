import sys, json
from elftools.elf.elffile import ELFFile
from elftools.elf.dynamic import DynamicSection
from capstone import Cs, CS_ARCH_ARM64, CS_MODE_ARM

ROOT = 'D:/天下布魔/0923_63_1_TenkafuMADiablosHarem/lib/arm64-v8a/'

def load(name):
    f = open(ROOT + name, 'rb')
    return ELFFile(f), f

def dyninfo(elf):
    d = {}
    for sec in elf.iter_sections():
        if isinstance(sec, DynamicSection):
            for tag in sec.iter_tags():
                d.setdefault(tag.entry.d_tag, []).append(tag.entry.d_val)
    return d

def symbols(elf):
    out = []
    for sec in elf.iter_sections():
        if sec.header.sh_type in ('SHT_DYNSYM', 'SHT_SYMTAB'):
            for s in sec.iter_symbols():
                out.append(dict(name=s.name, value=s.entry.st_value, size=s.entry.st_size,
                                info=s.entry.st_info.type, shndx=s.entry.st_shndx))
    return out

def disasm(data, vaddr, count=200, base=0):
    md = Cs(CS_ARCH_ARM64, CS_MODE_ARM)
    md.detail = False
    out = []
    for i in md.disasm(data, vaddr):
        out.append(f'0x{i.address:x}: {i.mnemonic}\t{i.op_str}')
        if len(out) >= count: break
    return out

if __name__ == '__main__':
    name = sys.argv[1] if len(sys.argv) > 1 else 'libcompatible.so'
    elf, f = load(name)
    d = dyninfo(elf)
    print('== dynamic tags ==')
    for k in ('DT_INIT', 'DT_INIT_ARRAY', 'DT_INIT_ARRAYSZ', 'DT_FINI', 'DT_SONAME', 'DT_NEEDED', 'DT_STRTAB', 'DT_SYMTAB', 'DT_RELA', 'DT_RELASZ', 'DT_JMPREL', 'DT_PLTRELSZ', 'DT_ANDROID_RELA', 'DT_ANDROID_RELASZ'):
        if k in d: print(k, [hex(v) for v in d[k]])
    syms = symbols(elf)
    named = [s for s in syms if s['name']]
    print(f'== symbols total {len(syms)} named {len(named)} ==')
    for s in named:
        print(f"{s['name']} @0x{s['value']:x} size={s['size']} {s['info']} shndx={s['shndx']}")
    json.dump(named, open(f'C:/Users/vhtmf/AppData/Local/Temp/np-unpack/{name}.syms.json', 'w'))
    # segments
    print('== segments ==')
    for seg in elf.iter_segments():
        print(seg.header.p_type, hex(seg.header.p_offset), hex(seg.header.p_vaddr), hex(seg.header.p_filesz), hex(seg.header.p_memsz), seg.header.p_flags)