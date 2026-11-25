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

def 反汇编(机器码, 虚拟地址, 最大条数=200, 基地址=0):
    反汇编器 = Cs(CS_ARCH_ARM64, CS_MODE_ARM)
    反汇编器.detail = False
    结果 = []
    for 指令 in 反汇编器.disasm(机器码, 虚拟地址):
        结果.append(f'0x{指令.address:x}: {指令.mnemonic}\t{指令.op_str}')
        if len(结果) >= 最大条数: break
    return 结果

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
    json.dump(有名字的符号, open(os.path.join(脚本目录, f'{文件名}.syms.json'), 'w'))
    # segments
    print('== segments ==')
    for 段 in ELF文件.iter_segments():
        print(段.header.p_type, hex(段.header.p_offset), hex(段.header.p_vaddr), hex(段.header.p_filesz), hex(段.header.p_memsz), 段.header.p_flags)