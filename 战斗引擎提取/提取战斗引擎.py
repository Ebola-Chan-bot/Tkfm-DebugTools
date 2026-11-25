#!/usr/bin/env python3
"""
从原始 APK 中提取完整战斗引擎信息。
- 元数据解密：从 APK 内加密 global-metadata.dat 实时解密（AES-ECB + LZ4）
- 方法表解析：覆盖 Assembly-CSharp 全部类型和方法
- 战斗引擎定位：识别所有战斗相关类型及其方法
- IL2CPP 代码恢复：可选，需要外部内存快照

不依赖 Temp 目录中任何预生成文件。
"""
import sys, os, struct, hashlib, zipfile, pathlib, csv, io, bisect, subprocess

# ─── 常量 ───────────────────────────────────────────────────────
# IL2CPP 元数据格式魔术码（Unity IL2CPP 运行时 GlobalMetadataFileInternals.h 规范定义的格式标识，类似 ZIP 的 "PK"，非从 APK 提取）
元数据魔数 = bytes.fromhex("af1bb1fa")

# 战斗引擎相关类型名匹配规则（语义推断：从 IL2CPP 元数据扫描出的 13976 个类型中，经人工分析战斗引擎汇编代码后归纳出的类型名模式，非机械提取）
战斗类型模式 = [
    'BattleCalculator', 'TCharBattleData', 'TBattleChar',
    'TBattleEffect', 'TTriggerSkill', 'TSkillData', 'TSkillObj',
    'TSelectSkillObj', 'TCharSkillObj', 'TSkillOneObj',
    'TSkillStateData', 'TSkillEffectData',
    'TPasstiveTriggerSkillData', 'TSpecialTriggerSkillData',
    'TBeforeRoundTriggerSkillData', 'TAfterRoundSkill',
]

# 关键方法名（语义推断：从战斗引擎汇编中人工识别出的核心逻辑入口，用于高亮标记。方法名本身取自元数据，但“哪些算关键”由逆向分析确定）
关键方法名 = [
    'GetTauntCharacterIdxList', 'SetSkillTarget', 'GetRandomTarget',
    'DoTriggerSkill', 'SetTriggerSkillBaseData', 'SelectCharToSkill',
    'DoAttack', 'UseSkill', 'SelectCharToAttack', 'SetAITarget',
    'SelectCharToDefend', 'DoDefend', 'GetSkillEffectValue',
    'GetSkillEffectParam', 'GetSkillTargetValue', 'ChkTaunt',
    'get_IsTaunt', 'get_TauntRound', 'SetTauntRound',
    'DoAttackCallback', 'UpdateDataAfterAttack', 'EnemyAction',
    'NextTurn', 'ChangeRound', 'EndRound', 'StartBattle',
    'UseGroupSkill', 'SetPasstiveSkill', 'SetPasstiveGroupSkill',
    'SetTriggerAttackSkill', 'SetTriggerActionSkill',
    'SetTriggerSkillSkill', 'SetTriggerDefendSkill',
    'SetTriggerDoAnythingSkill', 'ClearTeamBeTargetData',
    'GetEnemyPlayCharData', 'GetLiveCharDataIdx',
    'GetNewTempCharBattleData', 'UpdateCharData',
    'SelectCharToRecharge', 'DoRecharge', 'SelectCharToTalk', 'DoTalk',
    'ChkCharsSkillState', 'ChkIsTeam', 'ChkIsTeamSkillHasTarget',
    'SetNextActionor', 'DoRecordAction', 'DoRecordChangeRound',
    'GetAttackValue', 'GetSkillValue', 'GetAIValue', 'GetBattleValue',
    'GetStageValue', 'GetHPValue', 'GetHashStr', 'ShowLog',
]


# ─── 元数据解密 ────────────────────────────────────────────────
def 解密元数据(加密数据: bytes, 静态密钥: bytes) -> bytes:
    """AES-ECB + LZ4 解密 NP 加密的 global-metadata.dat"""
    from Crypto.Cipher import AES
    if 加密数据[:3] != b"AEI":
        raise ValueError(f"非 AEI 头: {加密数据[:8].hex()}")
    输出长度 = struct.unpack_from("<I", 加密数据, 3)[0]
    读取长度 = struct.unpack_from("<I", 加密数据, 7)[0]
    压缩长度 = struct.unpack_from("<I", 加密数据, 11)[0]
    加密数据密钥 = 加密数据[15:31]
    数据密钥 = AES.new(静态密钥, AES.MODE_ECB).decrypt(加密数据密钥)
    密文 = 加密数据[31 : 31 + 读取长度]
    明文 = AES.new(数据密钥, AES.MODE_ECB).decrypt(密文)
    try:
        import lz4.block
        解压结果 = lz4.block.decompress(明文[:压缩长度], uncompressed_size=输出长度)
    except ImportError:
        import lz4.frame
        解压结果 = lz4.frame.decompress(明文[:压缩长度])
    if len(解压结果) < 输出长度:
        解压结果 = 解压结果.ljust(输出长度, b"\x00")
    return 解压结果[:输出长度]


def _快速LZ4校验(明文块: bytes, 预期魔数: bytes) -> bool:
    """快速检查 AES 解密后的首块数据是否为包含指定魔术码的 LZ4 压缩数据，用于过滤候选密钥"""
    if len(明文块) < 6:
        return False
    令牌 = 明文块[0]
    字面量长度 = 令牌 >> 4
    if 字面量长度 == 15:
        位置 = 1
        while 位置 < len(明文块) and 明文块[位置] == 255:
            位置 += 1
        if 位置 >= len(明文块):
            return False
        字面量起始 = 位置 + 1
    elif 字面量长度 >= 4:
        字面量起始 = 1
    else:
        return False
    return 明文块[字面量起始 : 字面量起始 + 4] == 预期魔数


def 提取静态密钥(NP主体库数据: bytes, 加密数据: bytes) -> tuple:
    """从 libcompatible.so 中提取 AEI 解密静态密钥并返回已解密的元数据，避免重复解密"""
    from Crypto.Cipher import AES
    try:
        import lz4.block as _lz4
        _解压 = lambda d, s: _lz4.decompress(d, uncompressed_size=s)
    except ImportError:
        import lz4.frame as _lz4
        _解压 = lambda d, s: _lz4.decompress(d)
    加密数据密钥 = 加密数据[15:31]
    读取长度 = struct.unpack_from("<I", 加密数据, 7)[0]
    压缩长度 = struct.unpack_from("<I", 加密数据, 11)[0]
    输出长度 = struct.unpack_from("<I", 加密数据, 3)[0]
    密文 = 加密数据[31 : 31 + 读取长度]
    for 偏移 in range(0, len(NP主体库数据) - 16):
        候选密钥 = NP主体库数据[偏移 : 偏移 + 16]
        try:
            数据密钥 = AES.new(候选密钥, AES.MODE_ECB).decrypt(加密数据密钥)
            首块 = AES.new(数据密钥, AES.MODE_ECB).decrypt(密文[:16])
        except Exception:
            continue
        if not _快速LZ4校验(首块, 元数据魔数):
            continue
        try:
            明文 = AES.new(数据密钥, AES.MODE_ECB).decrypt(密文)
            解压结果 = _解压(明文[:压缩长度], 输出长度)
            if 解压结果[:4] == 元数据魔数:
                return 候选密钥, 解压结果[:输出长度]
        except Exception:
            continue
    raise ValueError("未能从 libcompatible.so 中提取 AEI 解密静态密钥")


# ─── 元数据表解析（v31）────────────────────────────────────────
def 解析元数据(元数据: bytes):
    magic = 元数据[:4]
    version = struct.unpack_from("<I", 元数据, 4)[0]
    print(f"  元数据: magic={magic.hex()} version={version} size={len(元数据)}")

    表字段对 = [struct.unpack_from("<II", 元数据, 8 + i * 8) for i in range(31)]
    字符串偏移, 字符串大小 = 表字段对[2]
    方法表偏移, 方法表大小 = 表字段对[5]   # method definitions
    类型表偏移, 类型表大小 = 表字段对[19]  # type definitions
    图像表偏移, 图像表大小 = 表字段对[20]  # image definitions
    fld_off, fld_size = 表字段对[11]  # field definitions

    def 读字符串(idx):
        if not (0 <= idx < 字符串大小):
            return ""
        end = idx
        limit = 字符串偏移 + 字符串大小
        while 字符串偏移 + end < limit and 元数据[字符串偏移 + end] != 0:
            end += 1
        return 元数据[字符串偏移 + idx : 字符串偏移 + end].decode("utf-8", errors="replace")

    # 方法表（36 字节/条）
    方法数量 = 方法表大小 // 36
    方法列表 = []
    for i in range(方法数量):
        b = 方法表偏移 + i * 36
        name_idx = struct.unpack_from("<I", 元数据, b)[0]
        decl_type = struct.unpack_from("<I", 元数据, b + 4)[0]
        ret_type = struct.unpack_from("<I", 元数据, b + 8)[0]
        param_start = struct.unpack_from("<I", 元数据, b + 16)[0]
        token = struct.unpack_from("<I", 元数据, b + 24)[0]
        flags = struct.unpack_from("<H", 元数据, b + 28)[0]
        iflags = struct.unpack_from("<H", 元数据, b + 30)[0]
        slot = struct.unpack_from("<H", 元数据, b + 32)[0]
        param_count = struct.unpack_from("<H", 元数据, b + 34)[0]
        方法列表.append({
            "索引": i, "名称": 读字符串(name_idx), "声明类型": decl_type,
            "返回类型": ret_type, "参数起始": param_start,
            "令牌": token, "标志": flags, "内部标志": iflags,
            "槽位": slot, "参数数量": param_count,
        })

    # 类型表（88 字节/条）
    类型数量 = 类型表大小 // 88
    类型表 = {}
    for i in range(类型数量):
        b = 类型表偏移 + i * 88
        name_idx = struct.unpack_from("<I", 元数据, b)[0]
        ns_idx = struct.unpack_from("<I", 元数据, b + 4)[0]
        method_start = struct.unpack_from("<I", 元数据, b + 36)[0]
        field_start = struct.unpack_from("<I", 元数据, b + 32)[0]
        flags = struct.unpack_from("<I", 元数据, b + 28)[0]
        # counts at offset 64: 8 × uint16
        method_count_field = struct.unpack_from("<H", 元数据, b + 64)[0]
        类型表[i] = {
            "索引": i, "名称": 读字符串(name_idx), "命名空间": 读字符串(ns_idx),
            "方法起始": method_start, "字段起始": field_start,
            "方法数量": method_count_field, "标志": flags,
        }

    # 图像表（40 字节/条）
    图像数量 = 图像表大小 // 40
    图像列表 = []
    for i in range(图像数量):
        b = 图像表偏移 + i * 40
        name_idx = struct.unpack_from("<I", 元数据, b)[0]
        type_start = struct.unpack_from("<I", 元数据, b + 8)[0]
        type_count_field = struct.unpack_from("<I", 元数据, b + 12)[0]
        图像列表.append({
            "索引": i, "名称": 读字符串(name_idx),
            "类型起始": type_start, "类型数量": type_count_field,
        })

    return {
        "魔数": magic, "版本": version,
        "方法列表": 方法列表, "类型表": 类型表, "图像列表": 图像列表,
        "方法数量": 方法数量, "类型数量": 类型数量,
    }


# ─── 战斗引擎方法识别 ─────────────────────────────────────────
def 查找战斗类型(类型表: dict):
    """返回所有战斗引擎相关的类型索引"""
    战斗类型表 = {}
    for idx, t in 类型表.items():
        完整名 = f"{t['命名空间']}.{t['名称']}" if t["命名空间"] else t["名称"]
        for 匹配模式 in 战斗类型模式:
            if 匹配模式 in t["名称"]:
                战斗类型表[idx] = {**t, "完整名": 完整名}
                break
    return 战斗类型表


def 收集战斗方法(解析结果: dict):
    """收集所有战斗类型的方法，以及关键名称方法"""
    战斗类型表 = 查找战斗类型(解析结果["类型表"])
    战斗方法列表 = []

    # 按类型收集
    for ti, 类型信息 in 战斗类型表.items():
        方法起始 = 类型信息.get("方法起始", 0)
        方法数量 = 类型信息.get("方法数量", 0)
        for j in range(方法起始, min(方法起始 + 方法数量, len(解析结果["方法列表"]))):
            m = 解析结果["方法列表"][j]
            if m["声明类型"] == ti:
                m["_类型"] = 类型信息["完整名"]
                m["_是否关键"] = m["名称"] in 关键方法名
                战斗方法列表.append(m)

    # 也收集不在战斗类型中但名字匹配的方法
    已收集索引 = {m["索引"] for m in 战斗方法列表}
    for m in 解析结果["方法列表"]:
        if m["索引"] not in 已收集索引 and m["名称"] in 关键方法名:
            类型信息 = 解析结果["类型表"].get(m["声明类型"])
            m["_类型"] = 类型信息["名称"] if 类型信息 else f"type{m['声明类型']}"
            m["_是否关键"] = True
            战斗方法列表.append(m)

    return 战斗类型表, 战斗方法列表


# ─── IL2CPP 代码恢复 ──────────────────────────────────────────
def 构建函数边界表(目标数据, 方法数量, 方法指针表, 基址):
    """收集并按地址排序全部方法入口，作为函数边界；IL2CPP 方法指针表按定义序排列，idx+1 未必是下一函数"""
    入口集合 = set()
    for i in range(方法数量):
        入口 = struct.unpack_from("<Q", 目标数据, 方法指针表 - 基址 + i * 8)[0]
        if 基址 <= 入口 < 基址 + len(目标数据):
            入口集合.add(入口)
    return sorted(入口集合)


def 从快照恢复代码(快照路径: str, 输出目录: pathlib.Path, 战斗方法列表: list):
    """从内存快照提取战斗方法的 ARM64 机器码并反汇编"""
    import pickle
    from capstone import Cs, CS_ARCH_ARM64, CS_MODE_ARM

    快照文件 = pathlib.Path(快照路径)
    if not 快照文件.exists():
        print(f"  [!] 快照不存在: {快照路径}")
        return False

    区域列表 = pickle.loads(快照文件.read_bytes())
    基址 = 0x8000000000
    目标数据 = None
    for s, n, data in 区域列表:
        if s == 基址:
            目标数据 = data
            break
    if 目标数据 is None:
        print("  [!] 快照中未找到 IL2CPP 基址 0x8000000000")
        return False

    # Assembly-CSharp CodeGenModule
    代码生成模块偏移 = 0x4E0EA00
    名称指针, 方法数量, 方法指针表 = struct.unpack_from("<QQQ", 目标数据, 代码生成模块偏移)
    # 直接打绝对地址：旧写法减基址在指针为0时会输出负号十六进制（如 0x-8000000000），极易误读
    print(f"  Assembly-CSharp CodeGenModule: methods={方法数量} ptrs={方法指针表:#x}")
    if 方法指针表 == 0 or not (基址 <= 方法指针表 < 基址 + len(目标数据)):
        print("  [X] 方法指针表未建立，IL2CPP 代码尚未解密完成；本次快照是模拟达到超时/指令上限后保存的半成品，不能用于提取")
        print("      请调大 模拟超时微秒 / 指令上限 后重跑，或用已完成的快照通过 --snapshot 指定")
        return False

    反汇编器 = Cs(CS_ARCH_ARM64, CS_MODE_ARM)
    反汇编器.skipdata = True

    函数边界表 = 构建函数边界表(目标数据, 方法数量, 方法指针表, 基址)
    print(f"  函数边界表: {len(函数边界表)} 个唯一方法入口（按地址排序）")

    汇编目录 = 输出目录 / "battle_asm"
    汇编目录.mkdir(exist_ok=True)
    for 旧文件 in 汇编目录.glob("*.asm"):
        旧文件.unlink()
    已提取数 = 0

    for m in 战斗方法列表:
        idx = m["索引"]
        if idx >= 方法数量:
            continue
        虚拟地址 = struct.unpack_from("<Q", 目标数据, 方法指针表 - 基址 + idx * 8)[0]
        off = 虚拟地址 - 基址
        if off < 0 or off + 16 > len(目标数据):
            continue

        # 函数边界取自全部方法入口的地址排序：IL2CPP 方法指针表按定义序排列，idx+1 不一定是下一函数；且 ARM64 函数可有多个 ret 与尾部跳转，首个 ret 之后仍是真实代码，故整段导出不截断
        边界位置 = bisect.bisect_right(函数边界表, 虚拟地址)
        下一边界 = 函数边界表[边界位置] if 边界位置 < len(函数边界表) else 基址 + len(目标数据)
        函数长度 = max(4, min(下一边界 - 虚拟地址, 0x80000))

        机器码 = 目标数据[off : off + 函数长度]
        安全名称 = m["名称"].replace("/", "_").replace("<", "_").replace(">", "_")[:80]
        文件名 = f"{idx:06d}_{安全名称}.asm"
        输出文件 = 汇编目录 / 文件名

        lines = list(反汇编器.disasm(机器码, off))
        with 输出文件.open("w") as f:
            f.write(f"; {m.get('_类型', '?')}.{m['名称']}\n")
            f.write(f"; method_index={idx} token=0x{m['令牌']:08x}\n")
            f.write(f"; VA=0x{虚拟地址:x}  file_offset=0x{off:x}  param_count={m['参数数量']}\n")
            f.write(f"; region=0x{虚拟地址:x}-0x{虚拟地址 + 函数长度:x}  instructions={len(lines)}\n\n")
            for ins in lines:
                f.write(f"0x{ins.address:x}: {ins.mnemonic:8s} {ins.op_str}\n")
        已提取数 += 1

    print(f"  反汇编完成: {已提取数} 个方法 → {汇编目录}")
    return True


# ─── 主流程 ──────────────────────────────────────────────────
def 主函数():
    import argparse
    命令行解析器 = argparse.ArgumentParser(description="从 APK 提取完整战斗引擎")
    命令行解析器.add_argument("apk", help="原始 APK 路径")
    命令行解析器.add_argument("-o", "--out", help="输出目录", default=None)
    命令行解析器.add_argument("--snapshot", help="内存快照 .pkl 路径（可选，用于代码恢复）", default=None)
    命令行参数 = 命令行解析器.parse_args()

    APK文件路径 = pathlib.Path(命令行参数.apk)
    if not APK文件路径.exists():
        print(f"[X] APK 不存在: {APK文件路径}")
        sys.exit(1)

    输出目录 = pathlib.Path(命令行参数.out) if 命令行参数.out else APK文件路径.parent / (APK文件路径.stem + "_提取")
    输出目录.mkdir(parents=True, exist_ok=True)
    print(f"\n{'='*60}")
    print(f"  天下布魔 战斗引擎完整提取")
    print(f"  APK: {APK文件路径.name}")
    print(f"  输出: {输出目录}")
    print(f"{'='*60}\n")

    # ── 1. 从 APK 提取关键文件 ──
    print("[1/5] 从 APK 提取文件")
    APK内容目录 = 输出目录 / "apk_content"
    APK内容目录.mkdir(parents=True, exist_ok=True)
    所需文件映射 = {
        "lib/arm64-v8a/libil2cpp.so": "libil2cpp.so",
        "lib/arm64-v8a/libstub.so": "libstub.so",
        "lib/arm64-v8a/libcompatible.so": "libcompatible.so",
        "lib/arm64-v8a/libengine.so": "libengine.so",
        "assets/bin/Data/Managed/Metadata/global-metadata.dat": "global-metadata-encrypted.dat",
    }
    with zipfile.ZipFile(APK文件路径) as zf:
        for entry_name, out_name in 所需文件映射.items():
            try:
                data = zf.read(entry_name)
                dest = APK内容目录 / out_name
                dest.write_bytes(data)
                print(f"  [OK] {out_name} ({len(data)/1024/1024:.1f} MB)")
            except KeyError:
                print(f"  [!] APK 中未找到 {entry_name}")

    # ── 2. 解密元数据 ──
    print("\n[2/5] 解密 global-metadata.dat")
    元数据加密路径 = APK内容目录 / "global-metadata-encrypted.dat"
    元数据输出路径 = 输出目录 / "global-metadata_decrypted.dat"

    if 元数据加密路径.exists():
        raw = 元数据加密路径.read_bytes()
        print(f"  加密文件: {len(raw)} bytes, 头={raw[:8].hex()}")
        # 解密结果缓存：同一加密文件重跑直接复用，避免重复扫描 libcompatible.so 提取密钥
        缓存指纹 = hashlib.sha256(raw).hexdigest()[:16]
        指纹文件 = 元数据输出路径.with_suffix(".sha256")
        if 元数据输出路径.exists() and 指纹文件.exists() and 指纹文件.read_text(encoding="utf-8").strip() == 缓存指纹:
            明文数据 = 元数据输出路径.read_bytes()
            ver = struct.unpack_from("<I", 明文数据, 4)[0]
            print(f"  [OK] 复用已解密元数据: {len(明文数据)} bytes, version={ver}, 指纹={缓存指纹}")
        else:
            # 从 libcompatible.so 中提取 AEI 解密静态密钥（密钥内嵌于 NP 主体二进制，非硬编码）
            兼容库路径 = APK内容目录 / "libcompatible.so"
            if not 兼容库路径.exists():
                print(f"  [X] 未找到 libcompatible.so，无法提取解密密钥")
                sys.exit(1)
            兼容库数据 = 兼容库路径.read_bytes()
            print(f"  从 libcompatible.so ({len(兼容库数据)/1024/1024:.1f} MB) 扫描解密密钥...")
            静态密钥, 明文数据 = 提取静态密钥(兼容库数据, raw)
            print(f"  [OK] 静态密钥: {静态密钥.hex()}")
            元数据输出路径.write_bytes(明文数据)
            指纹文件.write_text(缓存指纹, encoding="utf-8")
            sha = hashlib.sha256(明文数据).hexdigest()[:16]
            ver = struct.unpack_from("<I", 明文数据, 4)[0]
            print(f"  [OK] 解密完成: {len(明文数据)} bytes, version={ver}, sha256={sha}...")
    else:
        print("  [X] 未找到加密元数据")
        sys.exit(1)

    # ── 3. 解析元数据 ──
    print("\n[3/5] 解析元数据方法表")
    解析结果 = 解析元数据(元数据输出路径.read_bytes())
    print(f"  方法: {解析结果['方法数量']}")
    print(f"  类型: {解析结果['类型数量']}")
    print(f"  程序集: {len(解析结果['图像列表'])}")

    # ── 4. 识别战斗引擎方法 ──
    print("\n[4/5] 识别战斗引擎方法")
    战斗类型表, 战斗方法列表 = 收集战斗方法(解析结果)
    print(f"  战斗类型: {len(战斗类型表)}")
    print(f"  战斗方法: {len(战斗方法列表)}")

    # 分类统计
    按类型分组 = {}
    for m in 战斗方法列表:
        按类型分组.setdefault(m["_类型"], []).append(m)
    for tname in sorted(按类型分组.keys()):
        cnt = len(按类型分组[tname])
        key_cnt = sum(1 for m in 按类型分组[tname] if m.get("_是否关键"))
        marker = " ★" if key_cnt else ""
        print(f"    {tname}: {cnt} methods{marker}")

    # 导出 CSV
    战斗方法表路径 = 输出目录 / "battle_methods.csv"
    with 战斗方法表路径.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["index", "name", "type", "token", "param_count", "is_key"])
        for m in sorted(战斗方法列表, key=lambda x: (x["_类型"], x["索引"])):
            w.writerow([m["索引"], m["名称"], m["_类型"],
                        f"0x{m['令牌']:08x}", m["参数数量"],
                        "★" if m.get("_是否关键") else ""])

    # 导出完整方法表
    all_csv = 输出目录 / "all_methods.csv"
    with all_csv.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["index", "name", "decl_type", "token", "param_count", "slot"])
        for m in 解析结果["方法列表"]:
            类型信息 = 解析结果["类型表"].get(m["声明类型"])
            tname = 类型信息["名称"] if 类型信息 else str(m["声明类型"])
            w.writerow([m["索引"], m["名称"], tname,
                        f"0x{m['令牌']:08x}", m["参数数量"], m["槽位"]])
    print(f"  [OK] 导出: {战斗方法表路径.name}, {all_csv.name}")

    # ── 5. IL2CPP 代码恢复 ──
    print("\n[5/5] IL2CPP 代码恢复")
    快照路径 = 命令行参数.snapshot
    if not 快照路径:
        # 自动从 APK 提取的文件生成快照
        print("  未提供快照，自动生成（Unicorn 模拟 NP 解包）...")
        生成脚本 = pathlib.Path(__file__).parent / "生成快照.py"
        if 生成脚本.exists():
            from ELF工具库 import 运行子进程
            # 外层超时必须覆盖内层全部上限并留裕量（阶段1 600秒 + 阶段2模拟上限 + 硬超时裕量）；旧值900秒会在模拟中途超时杀掉直接子进程而留下孤儿模拟进程
            # stdout 直通控制台，使子进程的阶段输出与进度心跳实时可见
            外层超时 = 600 + int(os.environ.get('模拟超时微秒', '5400000000')) // 1000000 + 1200
            运行结果 = 运行子进程(
                [sys.executable, str(生成脚本), str(APK内容目录), "-o", str(输出目录)],
                stderr=subprocess.PIPE, text=True, timeout=外层超时,
            )
            if 运行结果.returncode != 0 and 运行结果.stderr:
                print(f"  [!] 快照生成 stderr: {运行结果.stderr[-500:]}")
            # 查找生成的快照（搜索所有子目录，取最新的 post_fastpath）
            for pattern in ["il2cpp_snapshot.pkl", "post_fastpath_*_mem.pkl", "mu_mem.pkl"]:
                matches = sorted(输出目录.rglob(pattern))
                if matches:
                    快照路径 = str(matches[-1])
                    break
        else:
            print("  [!] 未找到 生成快照.py")
    代码恢复成功 = False
    if 快照路径:
        print(f"  使用快照: {快照路径}")
        代码恢复成功 = bool(从快照恢复代码(快照路径, 输出目录, 战斗方法列表))
    else:
        print("  [X] 快照生成失败，元数据和方法表已完整提取")

    # ── 汇总 ──
    摘要路径 = 输出目录 / "summary.txt"
    with 摘要路径.open("w") as f:
        f.write(f"天下布魔 战斗引擎提取摘要\n")
        f.write(f"{'='*50}\n")
        f.write(f"APK: {APK文件路径.name}\n")
        f.write(f"元数据版本: {解析结果['版本']}\n")
        f.write(f"方法总数: {解析结果['方法数量']}\n")
        f.write(f"类型总数: {解析结果['类型数量']}\n")
        f.write(f"战斗类型: {len(战斗类型表)}\n")
        f.write(f"战斗方法: {len(战斗方法列表)}\n\n")
        f.write(f"战斗类型列表:\n")
        for ti, t in sorted(战斗类型表.items()):
            f.write(f"  [{ti}] {t['完整名']} ({t['方法数量']} methods)\n")
        f.write(f"\n关键方法:\n")
        for m in sorted(战斗方法列表, key=lambda x: x["索引"]):
            if m.get("_是否关键"):
                f.write(f"  [{m['索引']}] {m['_类型']}.{m['名称']} token=0x{m['令牌']:08x}\n")

    print(f"\n  [OK] 摘要: {摘要路径}")
    print(f"\n{'='*60}")
    if 代码恢复成功:
        print(f"  提取完成。输出目录: {输出目录}")
    else:
        print(f"  提取未完成：仅元数据与方法表就绪，汇编代码未导出（详见上方原因）。输出目录: {输出目录}")
    print(f"{'='*60}")
    # 代码未导出属于任务失败，必须以非零码退出，避免上层靠退出码误判为成功
    if not 代码恢复成功:
        sys.exit(1)


if __name__ == "__main__":
    主函数()
