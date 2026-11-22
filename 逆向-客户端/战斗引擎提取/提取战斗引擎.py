#!/usr/bin/env python3
"""
从原始 APK 中提取完整战斗引擎信息。
- 元数据解密：从 APK 内加密 global-metadata.dat 实时解密（AES-ECB + LZ4）
- 方法表解析：覆盖 Assembly-CSharp 全部类型和方法
- 战斗引擎定位：识别所有战斗相关类型及其方法
- IL2CPP 代码恢复：可选，需要外部内存快照

不依赖 Temp 目录中任何预生成文件。
"""
import sys, os, struct, hashlib, zipfile, pathlib, csv, io

# ─── 常量 ───────────────────────────────────────────────────────
STATIC_KEY = bytes.fromhex("b5c8c2cb9aa6f6e68dccd179e17b91a8")
META_MAGIC = bytes.fromhex("af1bb1fa")

# 战斗引擎相关类型名匹配规则
BATTLE_TYPE_PATTERNS = [
    'BattleCalculator', 'TCharBattleData', 'TBattleChar',
    'TBattleEffect', 'TTriggerSkill', 'TSkillData', 'TSkillObj',
    'TSelectSkillObj', 'TCharSkillObj', 'TSkillOneObj',
    'TBattleEffect', 'TSkillStateData', 'TSkillEffectData',
    'TPasstiveTriggerSkillData', 'TSpecialTriggerSkillData',
    'TBeforeRoundTriggerSkillData', 'TAfterRoundSkill',
]

# 关键方法名（用于高亮）
KEY_METHODS = [
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
def decrypt_metadata(raw: bytes) -> bytes:
    """AES-ECB + LZ4 解密 NP 加密的 global-metadata.dat"""
    from Crypto.Cipher import AES
    if raw[:3] != b"AEI":
        raise ValueError(f"非 AEI 头: {raw[:8].hex()}")
    out_len = struct.unpack_from("<I", raw, 3)[0]
    read_len = struct.unpack_from("<I", raw, 7)[0]
    compressed_len = struct.unpack_from("<I", raw, 11)[0]
    enc_data_key = raw[15:31]
    data_key = AES.new(STATIC_KEY, AES.MODE_ECB).decrypt(enc_data_key)
    ciphertext = raw[31 : 31 + read_len]
    plaintext = AES.new(data_key, AES.MODE_ECB).decrypt(ciphertext)
    try:
        import lz4.block
        result = lz4.block.decompress(plaintext[:compressed_len], uncompressed_size=out_len)
    except ImportError:
        import lz4.frame
        result = lz4.frame.decompress(plaintext[:compressed_len])
    if len(result) < out_len:
        result = result.ljust(out_len, b"\x00")
    return result[:out_len]


# ─── 元数据表解析（v31）────────────────────────────────────────
def parse_metadata(meta: bytes):
    magic = meta[:4]
    version = struct.unpack_from("<I", meta, 4)[0]
    print(f"  元数据: magic={magic.hex()} version={version} size={len(meta)}")

    pairs = [struct.unpack_from("<II", meta, 8 + i * 8) for i in range(31)]
    str_off, str_size = pairs[2]
    met_off, met_size = pairs[5]   # method definitions
    typ_off, typ_size = pairs[19]  # type definitions
    img_off, img_size = pairs[20]  # image definitions
    fld_off, fld_size = pairs[11]  # field definitions

    def read_str(idx):
        if not (0 <= idx < str_size):
            return ""
        end = idx
        limit = str_off + str_size
        while str_off + end < limit and meta[str_off + end] != 0:
            end += 1
        return meta[str_off + idx : str_off + end].decode("utf-8", errors="replace")

    # 方法表（36 字节/条）
    method_count = met_size // 36
    methods = []
    for i in range(method_count):
        b = met_off + i * 36
        name_idx = struct.unpack_from("<I", meta, b)[0]
        decl_type = struct.unpack_from("<I", meta, b + 4)[0]
        ret_type = struct.unpack_from("<I", meta, b + 8)[0]
        param_start = struct.unpack_from("<I", meta, b + 16)[0]
        token = struct.unpack_from("<I", meta, b + 24)[0]
        flags = struct.unpack_from("<H", meta, b + 28)[0]
        iflags = struct.unpack_from("<H", meta, b + 30)[0]
        slot = struct.unpack_from("<H", meta, b + 32)[0]
        param_count = struct.unpack_from("<H", meta, b + 34)[0]
        methods.append({
            "index": i, "name": read_str(name_idx), "decl_type": decl_type,
            "return_type": ret_type, "param_start": param_start,
            "token": token, "flags": flags, "iflags": iflags,
            "slot": slot, "param_count": param_count,
        })

    # 类型表（88 字节/条）
    type_count = typ_size // 88
    types = {}
    for i in range(type_count):
        b = typ_off + i * 88
        name_idx = struct.unpack_from("<I", meta, b)[0]
        ns_idx = struct.unpack_from("<I", meta, b + 4)[0]
        method_start = struct.unpack_from("<I", meta, b + 36)[0]
        field_start = struct.unpack_from("<I", meta, b + 32)[0]
        flags = struct.unpack_from("<I", meta, b + 28)[0]
        # counts at offset 64: 8 × uint16
        method_count_field = struct.unpack_from("<H", meta, b + 64)[0]
        types[i] = {
            "index": i, "name": read_str(name_idx), "namespace": read_str(ns_idx),
            "method_start": method_start, "field_start": field_start,
            "method_count": method_count_field, "flags": flags,
        }

    # 图像表（40 字节/条）
    img_count = img_size // 40
    images = []
    for i in range(img_count):
        b = img_off + i * 40
        name_idx = struct.unpack_from("<I", meta, b)[0]
        type_start = struct.unpack_from("<I", meta, b + 8)[0]
        type_count_field = struct.unpack_from("<I", meta, b + 12)[0]
        images.append({
            "index": i, "name": read_str(name_idx),
            "type_start": type_start, "type_count": type_count_field,
        })

    return {
        "magic": magic, "version": version,
        "methods": methods, "types": types, "images": images,
        "method_count": method_count, "type_count": type_count,
    }


# ─── 战斗引擎方法识别 ─────────────────────────────────────────
def find_battle_types(types: dict):
    """返回所有战斗引擎相关的类型索引"""
    battle = {}
    for idx, t in types.items():
        full = f"{t['namespace']}.{t['name']}" if t["namespace"] else t["name"]
        for pat in BATTLE_TYPE_PATTERNS:
            if pat in t["name"]:
                battle[idx] = {**t, "full_name": full}
                break
    return battle


def collect_battle_methods(parsed: dict):
    """收集所有战斗类型的方法，以及关键名称方法"""
    battle_types = find_battle_types(parsed["types"])
    battle_methods = []

    # 按类型收集
    for ti, tinfo in battle_types.items():
        ms = tinfo.get("method_start", 0)
        mc = tinfo.get("method_count", 0)
        for j in range(ms, min(ms + mc, len(parsed["methods"]))):
            m = parsed["methods"][j]
            if m["decl_type"] == ti:
                m["_type"] = tinfo["full_name"]
                m["_is_key"] = m["name"] in KEY_METHODS
                battle_methods.append(m)

    # 也收集不在战斗类型中但名字匹配的方法
    existing_ids = {m["index"] for m in battle_methods}
    for m in parsed["methods"]:
        if m["index"] not in existing_ids and m["name"] in KEY_METHODS:
            tinfo = parsed["types"].get(m["decl_type"])
            m["_type"] = tinfo["name"] if tinfo else f"type{m['decl_type']}"
            m["_is_key"] = True
            battle_methods.append(m)

    return battle_types, battle_methods


# ─── IL2CPP 代码恢复 ──────────────────────────────────────────
def recover_code_from_snapshot(snapshot_path: str, out_dir: pathlib.Path,
                               battle_methods: list):
    """从内存快照提取战斗方法的 ARM64 机器码并反汇编"""
    import pickle
    from capstone import Cs, CS_ARCH_ARM64, CS_MODE_ARM

    snap = pathlib.Path(snapshot_path)
    if not snap.exists():
        print(f"  [!] 快照不存在: {snapshot_path}")
        return False

    regions = pickle.loads(snap.read_bytes())
    BASE = 0x8000000000
    target = None
    for s, n, data in regions:
        if s == BASE:
            target = data
            break
    if target is None:
        print("  [!] 快照中未找到 IL2CPP 基址 0x8000000000")
        return False

    # Assembly-CSharp CodeGenModule
    cgmod_off = 0x4E0EA00
    name_ptr, method_count, method_ptrs = struct.unpack_from("<QQQ", target, cgmod_off)
    print(f"  Assembly-CSharp CodeGenModule: methods={method_count} ptrs=0x{method_ptrs-BASE:x}")
    if method_ptrs == 0:
        print("  [!] method_ptrs 为 0，IL2CPP 尚未完成解密，需要更多轮次的快照")
        return False

    md = Cs(CS_ARCH_ARM64, CS_MODE_ARM)
    md.skipdata = True

    asm_dir = out_dir / "battle_asm"
    asm_dir.mkdir(exist_ok=True)
    extracted = 0

    for m in battle_methods:
        idx = m["index"]
        if idx >= method_count:
            continue
        va = struct.unpack_from("<Q", target, method_ptrs - BASE + idx * 8)[0]
        off = va - BASE
        if off < 0 or off + 16 > len(target):
            continue

        # 确定函数大小（扫描到下一个方法或 ret）
        next_va = 0
        if idx + 1 < method_count:
            next_va = struct.unpack_from("<Q", target, method_ptrs - BASE + (idx + 1) * 8)[0]
        max_size = min(0x10000, (next_va - va) if next_va > va else 0x2000)
        if max_size < 16:
            max_size = 0x2000

        code = target[off : off + max_size]
        safe_name = m["name"].replace("/", "_").replace("<", "_").replace(">", "_")[:80]
        fname = f"{idx:06d}_{safe_name}.asm"
        out_file = asm_dir / fname

        lines = list(md.disasm(code, off))
        with out_file.open("w") as f:
            f.write(f"; {m.get('_type', '?')}.{m['name']}\n")
            f.write(f"; method_index={idx} token=0x{m['token']:08x}\n")
            f.write(f"; VA=0x{va:x}  file_offset=0x{off:x}  param_count={m['param_count']}\n\n")
            for ins in lines:
                f.write(f"0x{ins.address:x}: {ins.mnemonic:8s} {ins.op_str}\n")
                if ins.mnemonic == "ret" and ins.address > off + 32:
                    break
        extracted += 1

    print(f"  反汇编完成: {extracted} 个方法 → {asm_dir}")
    return True


# ─── 主流程 ──────────────────────────────────────────────────
def main():
    import argparse
    parser = argparse.ArgumentParser(description="从 APK 提取完整战斗引擎")
    parser.add_argument("apk", help="原始 APK 路径")
    parser.add_argument("-o", "--out", help="输出目录", default=None)
    parser.add_argument("--snapshot", help="内存快照 .pkl 路径（可选，用于代码恢复）", default=None)
    args = parser.parse_args()

    apk_path = pathlib.Path(args.apk)
    if not apk_path.exists():
        print(f"[X] APK 不存在: {apk_path}")
        sys.exit(1)

    out_dir = pathlib.Path(args.out) if args.out else apk_path.parent / (apk_path.stem + "_提取")
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n{'='*60}")
    print(f"  天下布魔 战斗引擎完整提取")
    print(f"  APK: {apk_path.name}")
    print(f"  输出: {out_dir}")
    print(f"{'='*60}\n")

    # ── 1. 从 APK 提取关键文件 ──
    print("[1/5] 从 APK 提取文件")
    apk_content = out_dir / "apk_content"
    apk_content.mkdir(parents=True, exist_ok=True)
    need_files = {
        "lib/arm64-v8a/libil2cpp.so": "libil2cpp.so",
        "lib/arm64-v8a/libstub.so": "libstub.so",
        "lib/arm64-v8a/libcompatible.so": "libcompatible.so",
        "lib/arm64-v8a/libengine.so": "libengine.so",
        "assets/bin/Data/Managed/Metadata/global-metadata.dat": "global-metadata-encrypted.dat",
    }
    with zipfile.ZipFile(apk_path) as zf:
        for entry_name, out_name in need_files.items():
            try:
                data = zf.read(entry_name)
                dest = apk_content / out_name
                dest.write_bytes(data)
                print(f"  [OK] {out_name} ({len(data)/1024/1024:.1f} MB)")
            except KeyError:
                print(f"  [!] APK 中未找到 {entry_name}")

    # ── 2. 解密元数据 ──
    print("\n[2/5] 解密 global-metadata.dat")
    meta_enc_path = apk_content / "global-metadata-encrypted.dat"
    meta_out_path = out_dir / "global-metadata_decrypted.dat"

    if meta_enc_path.exists():
        raw = meta_enc_path.read_bytes()
        print(f"  加密文件: {len(raw)} bytes, 头={raw[:8].hex()}")
        plain = decrypt_metadata(raw)
        meta_out_path.write_bytes(plain)
        sha = hashlib.sha256(plain).hexdigest()[:16]
        ver = struct.unpack_from("<I", plain, 4)[0]
        print(f"  [OK] 解密完成: {len(plain)} bytes, version={ver}, sha256={sha}...")
    else:
        print("  [X] 未找到加密元数据")
        sys.exit(1)

    # ── 3. 解析元数据 ──
    print("\n[3/5] 解析元数据方法表")
    parsed = parse_metadata(meta_out_path.read_bytes())
    print(f"  方法: {parsed['method_count']}")
    print(f"  类型: {parsed['type_count']}")
    print(f"  程序集: {len(parsed['images'])}")

    # ── 4. 识别战斗引擎方法 ──
    print("\n[4/5] 识别战斗引擎方法")
    battle_types, battle_methods = collect_battle_methods(parsed)
    print(f"  战斗类型: {len(battle_types)}")
    print(f"  战斗方法: {len(battle_methods)}")

    # 分类统计
    by_type = {}
    for m in battle_methods:
        by_type.setdefault(m["_type"], []).append(m)
    for tname in sorted(by_type.keys()):
        cnt = len(by_type[tname])
        key_cnt = sum(1 for m in by_type[tname] if m.get("_is_key"))
        marker = " ★" if key_cnt else ""
        print(f"    {tname}: {cnt} methods{marker}")

    # 导出 CSV
    csv_path = out_dir / "battle_methods.csv"
    with csv_path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["index", "name", "type", "token", "param_count", "is_key"])
        for m in sorted(battle_methods, key=lambda x: (x["_type"], x["index"])):
            w.writerow([m["index"], m["name"], m["_type"],
                        f"0x{m['token']:08x}", m["param_count"],
                        "★" if m.get("_is_key") else ""])

    # 导出完整方法表
    all_csv = out_dir / "all_methods.csv"
    with all_csv.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["index", "name", "decl_type", "token", "param_count", "slot"])
        for m in parsed["methods"]:
            tinfo = parsed["types"].get(m["decl_type"])
            tname = tinfo["name"] if tinfo else str(m["decl_type"])
            w.writerow([m["index"], m["name"], tname,
                        f"0x{m['token']:08x}", m["param_count"], m["slot"]])
    print(f"  [OK] 导出: {csv_path.name}, {all_csv.name}")

    # ── 5. IL2CPP 代码恢复 ──
    print("\n[5/5] IL2CPP 代码恢复")
    snapshot_path = args.snapshot
    if not snapshot_path:
        # 自动从 APK 提取的文件生成快照
        print("  未提供快照，自动生成（Unicorn 模拟 NP 解包）...")
        gen_script = pathlib.Path(__file__).parent / "generate_snapshot.py"
        if gen_script.exists():
            import subprocess as sp
            result = sp.run(
                [sys.executable, str(gen_script), str(apk_content), "-o", str(out_dir)],
                capture_output=True, text=True, timeout=900,
            )
            print(result.stdout[-1000:] if result.stdout else "")
            if result.returncode != 0 and result.stderr:
                print(f"  [!] 快照生成 stderr: {result.stderr[-500:]}")
            # 查找生成的快照（搜索所有子目录，取最新的 post_fastpath）
            for pattern in ["il2cpp_snapshot.pkl", "post_fastpath_*_mem.pkl", "mu_mem.pkl"]:
                matches = sorted(out_dir.rglob(pattern))
                if matches:
                    snapshot_path = str(matches[-1])
                    break
        else:
            print("  [!] 未找到 generate_snapshot.py")
    if snapshot_path:
        print(f"  使用快照: {snapshot_path}")
        recover_code_from_snapshot(snapshot_path, out_dir, battle_methods)
    else:
        print("  [!] 快照生成失败，元数据和方法表已完整提取")

    # ── 汇总 ──
    summary_path = out_dir / "summary.txt"
    with summary_path.open("w") as f:
        f.write(f"天下布魔 战斗引擎提取摘要\n")
        f.write(f"{'='*50}\n")
        f.write(f"APK: {apk_path.name}\n")
        f.write(f"元数据版本: {parsed['version']}\n")
        f.write(f"方法总数: {parsed['method_count']}\n")
        f.write(f"类型总数: {parsed['type_count']}\n")
        f.write(f"战斗类型: {len(battle_types)}\n")
        f.write(f"战斗方法: {len(battle_methods)}\n\n")
        f.write(f"战斗类型列表:\n")
        for ti, t in sorted(battle_types.items()):
            f.write(f"  [{ti}] {t['full_name']} ({t['method_count']} methods)\n")
        f.write(f"\n关键方法:\n")
        for m in sorted(battle_methods, key=lambda x: x["index"]):
            if m.get("_is_key"):
                f.write(f"  [{m['index']}] {m['_type']}.{m['name']} token=0x{m['token']:08x}\n")

    print(f"\n  [OK] 摘要: {summary_path}")
    print(f"\n{'='*60}")
    print(f"  提取完成。输出目录: {out_dir}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
