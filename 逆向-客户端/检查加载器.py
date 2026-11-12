import argparse
import hashlib
import io
import json
import re
from pathlib import Path

from capstone import Cs, CS_ARCH_ARM, CS_ARCH_ARM64, CS_ARCH_X86, CS_MODE_ARM, CS_MODE_THUMB, CS_MODE_32, CS_MODE_64, CS_OP_IMM, CS_OP_MEM, CS_OP_REG
from elftools.elf.elffile import ELFFile


def 查询引用(库: ELFFile, 数据: bytes, 目标地址: set[int], 重定位表: dict[int, int]) -> list[dict]:
    if 库.header["e_machine"] != "EM_AARCH64":
        raise ValueError("定向交叉引用目前只支持AArch64")
    解码器 = Cs(CS_ARCH_ARM64, CS_MODE_ARM)
    解码器.detail = True
    解码器.skipdata = True
    结果 = []
    for 段 in 库.iter_segments():
        if 段["p_type"] != "PT_LOAD" or not 段["p_flags"] & 1:
            continue
        寄存器值 = {}
        段数据 = 数据[段["p_offset"]:段["p_offset"] + 段["p_filesz"]]
        for 指令 in 解码器.disasm(段数据, 段["p_vaddr"]):
            if 指令.id == 0:
                寄存器值.clear()
                continue
            操作数 = 指令.operands
            地址 = None
            if 指令.mnemonic in ("adrp", "adr") and len(操作数) == 2:
                寄存器值[操作数[0].reg] = (操作数[1].imm, 指令.address)
                地址 = 操作数[1].imm
            elif 指令.mnemonic == "add" and len(操作数) == 3 and 操作数[1].type == CS_OP_REG and 操作数[2].type == CS_OP_IMM:
                基址 = 寄存器值.get(操作数[1].reg)
                if 基址:
                    地址 = 基址[0] + 操作数[2].imm
                    寄存器值[操作数[0].reg] = (地址, 指令.address)
            elif 指令.mnemonic.startswith(("ldr", "str")):
                内存 = next((项.mem for 项 in 操作数 if 项.type == CS_OP_MEM), None)
                基址 = 寄存器值.get(内存.base) if 内存 else None
                if 内存 and 基址:
                    地址 = 基址[0] + 内存.disp
                    if 指令.mnemonic == "ldr" and 地址 in 重定位表:
                        寄存器值[操作数[0].reg] = (重定位表[地址], 指令.address)
            elif 指令.mnemonic in ("bl", "b") and 操作数 and 操作数[0].type == CS_OP_IMM:
                地址 = 操作数[0].imm
            if 地址 in 目标地址:
                结果.append({"指令地址": hex(指令.address), "目标地址": hex(地址), "指令": f"{指令.mnemonic} {指令.op_str}"})
            if 指令.mnemonic in ("bl", "blr", "ret", "br", "b"):
                寄存器值.clear()
            寄存器值 = {编号: 值 for 编号, 值 in 寄存器值.items() if 指令.address - 值[1] <= 96}
    return 结果


def 检查文件(文件: Path, 地址列表: list[int] | None = None, 长度: int = 256, 指针列表: list[int] | None = None, 引用地址: list[int] | None = None) -> dict:
    数据 = 文件.read_bytes()
    结果 = {"文件": 文件.name, "架构目录": 文件.parent.name, "大小": len(数据), "SHA256": hashlib.sha256(数据).hexdigest(), "文件头": 数据[:32].hex()}
    关键词 = re.compile(r"metadata|il2cpp|SoLibrary|JNI_|dlopen|dlsym|decrypt|encrypt|AES|engine|stub|appguard|appsealing|liapp|http|socket|connect|recv|inflate|uncompress|lz4|lzma|zstd", re.I)
    结果["相关字符串"] = [{"偏移": 匹配.start(), "文本": 匹配.group().decode("ascii")} for 匹配 in re.finditer(rb"[\x20-\x7e]{5,}", 数据) if 关键词.search(匹配.group().decode("ascii"))]
    if 数据[:4] != b"\x7fELF" or 数据[4] not in (1, 2):
        结果["类型"] = "非标准ELF载荷"
        return 结果
    库 = ELFFile(io.BytesIO(数据))
    结果.update({"类型": "ELF", "位数": 库.elfclass, "机器": 库.header["e_machine"], "入口": hex(库.header["e_entry"])})
    结果["映射段"] = [{"类型": 段["p_type"], "偏移": hex(段["p_offset"]), "虚拟地址": hex(段["p_vaddr"]), "文件大小": 段["p_filesz"], "内存大小": 段["p_memsz"], "权限": 段["p_flags"]} for 段 in 库.iter_segments()]
    结果["节"] = [节.name for 节 in 库.iter_sections()]
    动态段 = next((段 for 段 in 库.iter_segments() if 段["p_type"] == "PT_DYNAMIC"), None)
    符号表 = 库.get_section_by_name(".dynsym")
    结果["导入"] = []
    结果["导出"] = []
    重定位值 = {}
    符号列 = 符号表.iter_symbols() if 符号表 is not None else 动态段.iter_symbols() if 动态段 is not None else []
    if 符号列:
        for 符号 in 符号列:
            if not 符号.name:
                continue
            项 = {"名称": 符号.name, "地址": hex(符号["st_value"]), "大小": 符号["st_size"], "类型": 符号["st_info"]["type"]}
            结果["导入" if 符号["st_shndx"] == "SHN_UNDEF" else "导出"].append(项)
    if 动态段 is not None:
        结果["初始化"] = [{"标签": 标签.entry.d_tag, "数值": hex(标签.entry.d_val)} for 标签 in 动态段.iter_tags() if 标签.entry.d_tag in {"DT_INIT", "DT_INIT_ARRAY", "DT_INIT_ARRAYSZ", "DT_FINI", "DT_NEEDED"}]
        结果["依赖库"] = [标签.needed for 标签 in 动态段.iter_tags() if 标签.entry.d_tag == "DT_NEEDED"]
        重点符号 = {"sigaction", "sigaltstack", "signal", "mprotect", "mmap", "dlopen", "dlsym", "connect", "recv", "socket", "read", "fopen", "AAsset_read"}
        重定位列 = []
        for 名称, 表 in 动态段.get_relocation_tables().items():
            for 重定位 in 表.iter_relocations():
                if 重定位["r_info_type"] == 1027:
                    重定位值[重定位["r_offset"]] = 重定位.entry.get("r_addend", 0)
                符号 = 动态段.get_symbol(重定位["r_info_sym"]).name if 重定位["r_info_sym"] else ""
                if 符号 not in 重点符号 and 重定位["r_offset"] not in (指针列表 or []):
                    continue
                重定位列.append({"表": 名称, "地址": hex(重定位["r_offset"]), "类型": 重定位["r_info_type"], "符号": 符号, "加数": hex(重定位.entry.get("r_addend", 0))})
        结果["重定位"] = 重定位列
    if 引用地址:
        结果["交叉引用"] = 查询引用(库, 数据, set(引用地址), 重定位值)
    if 指针列表:
        结果["指针"] = []
        for 地址 in 指针列表:
            链 = []
            当前地址 = 地址
            for _ in range(3):
                映射 = next((段 for 段 in 库.iter_segments() if 段["p_type"] == "PT_LOAD" and 段["p_vaddr"] <= 当前地址 < 段["p_vaddr"] + 段["p_filesz"]), None)
                if 映射 is None:
                    链.append({"地址": hex(当前地址), "状态": "无文件映射"})
                    break
                偏移 = 当前地址 - 映射["p_vaddr"] + 映射["p_offset"]
                值 = int.from_bytes(数据[偏移:偏移 + 库.elfclass // 8], "little")
                重定位 = next((项 for 项 in 结果.get("重定位", []) if int(项["地址"], 16) == 当前地址), None)
                if 重定位 and 重定位["类型"] in (1027, 8, 23):
                    值 = int(重定位["加数"], 16) if 库.elfclass == 64 else 值
                链.append({"地址": hex(当前地址), "偏移": hex(偏移), "值": hex(值)})
                当前地址 = 值
            结果["指针"].append(链)
    if 地址列表:
        配置 = {"EM_AARCH64": (CS_ARCH_ARM64, CS_MODE_ARM), "EM_ARM": (CS_ARCH_ARM, CS_MODE_ARM), "EM_X86_64": (CS_ARCH_X86, CS_MODE_64), "EM_386": (CS_ARCH_X86, CS_MODE_32)}
        架构, 模式 = 配置[库.header["e_machine"]]
        结果["反汇编"] = []
        for 地址 in 地址列表:
            当前模式 = CS_MODE_THUMB if 库.header["e_machine"] == "EM_ARM" and 地址 & 1 else 模式
            起点 = 地址 & ~1 if 库.header["e_machine"] == "EM_ARM" else 地址
            映射 = next((段 for 段 in 库.iter_segments() if 段["p_type"] == "PT_LOAD" and 段["p_vaddr"] <= 起点 < 段["p_vaddr"] + 段["p_filesz"]), None)
            if 映射 is None:
                raise ValueError(f"地址无文件映射：{地址:#x}")
            偏移 = 起点 - 映射["p_vaddr"] + 映射["p_offset"]
            反汇编器 = Cs(架构, 当前模式)
            指令 = [f"{项.address:#x}: {项.mnemonic} {项.op_str}" for 项 in 反汇编器.disasm(数据[偏移:偏移 + 长度], 起点)]
            结果["反汇编"].append({"地址": hex(地址), "文件偏移": hex(偏移), "原始字节": 数据[偏移:偏移 + min(长度, 64)].hex(), "指令": 指令})
    return 结果


if __name__ == "__main__":
    解析器 = argparse.ArgumentParser()
    解析器.add_argument("文件", nargs="+", type=Path)
    解析器.add_argument("--输出", type=Path)
    解析器.add_argument("--地址", type=lambda 值: int(值, 0), action="append")
    解析器.add_argument("--长度", type=int, default=256)
    解析器.add_argument("--指针", type=lambda 值: int(值, 0), action="append")
    解析器.add_argument("--引用", type=lambda 值: int(值, 0), action="append")
    参数 = 解析器.parse_args()
    结果 = [检查文件(文件, 参数.地址, 参数.长度, 参数.指针, 参数.引用) for 文件 in 参数.文件]
    内容 = json.dumps(结果, ensure_ascii=False, indent=2)
    if 参数.输出:
        参数.输出.parent.mkdir(parents=True, exist_ok=True)
        参数.输出.write_text(内容, encoding="utf-8")
    print(内容)