#!/usr/bin/env python3
"""
从 APK 提取的文件生成 IL2CPP 解密快照（Unicorn 模拟 NP 解包）。
自动修补模拟器脚本中的硬编码路径，无需手动准备。
"""
import sys, os, shutil, pathlib, subprocess

def patch_script(src: pathlib.Path, dst: pathlib.Path, work_dir: pathlib.Path):
    """将脚本中的硬编码 Temp 路径替换为工作目录"""
    text = src.read_text(encoding="utf-8", errors="replace")
    old_base = "C:/Users/vhtmf/AppData/Local/Temp/np-unpack"
    new_base = str(work_dir).replace("\\", "/")
    text = text.replace(old_base, new_base)
    dst.write_text(text, encoding="utf-8")

def generate_snapshot(apk_content_dir: str, out_dir: str, script_dir: str = None):
    """
    参数:
      apk_content_dir: 提取的 APK 文件目录（含 libcompatible.so, libil2cpp.so 等）
      out_dir: 输出目录（快照保存在此）
      script_dir: 模拟器脚本目录（默认与本脚本同目录）
    """
    apk_dir = pathlib.Path(apk_content_dir)
    out = pathlib.Path(out_dir)
    if script_dir is None:
        script_dir = pathlib.Path(__file__).parent
    else:
        script_dir = pathlib.Path(script_dir)

    out.mkdir(parents=True, exist_ok=True)

    # 检查输入
    for name in ["libcompatible.so", "libil2cpp.so"]:
        if not (apk_dir / name).exists():
            print(f"[X] 缺少 {name}，请先从 APK 提取")
            return False

    # 需要的模拟器文件
    emu_files = ["emu2.py", "emu4_il2cpp.py", "np_lib.py", "compatible_relocs.json", "compatible_decrypted.bin"]

    # 检查模拟器脚本
    for f in emu_files:
        if not (script_dir / f).exists():
            print(f"[X] 缺少模拟器文件: {f}")
            return False

    # 创建工作目录并复制文件
    work = out / "emu_work"
    work.mkdir(parents=True, exist_ok=True)
    print(f"[1/3] 准备模拟环境: {work}")

    for f in emu_files:
        shutil.copy2(script_dir / f, work / f)

    # 复制 APK 提取的文件
    for name in ["libcompatible.so", "libil2cpp.so", "libstub.so", "libengine.so"]:
        src = apk_dir / name
        if src.exists():
            shutil.copy2(src, work / name)

    # 修补硬编码路径
    print("[2/3] 修补模拟器路径")
    for f in ["emu2.py", "emu4_il2cpp.py"]:
        patch_script(work / f, work / f, work)

    # 运行模拟
    print("[3/3] 运行 NP 解包模拟（Unicorn）")
    print("  这可能需要几分钟...")

    py = sys.executable or "python"

    # 阶段1: emu2.py 解包 libcompatible
    print("  阶段 1: libcompatible DT_INIT ...")
    r1 = subprocess.run([py, str(work / "emu2.py")], cwd=str(work),
                        capture_output=True, text=True, timeout=600)
    if r1.returncode != 0:
        print(f"  [!] emu2.py 返回 {r1.returncode}")
        print(f"  stdout: {r1.stdout[-500:]}")
        print(f"  stderr: {r1.stderr[-500:]}")

    # 检查阶段1输出
    mu_mem = work / "mu_mem.pkl"
    if not mu_mem.exists():
        print("  [X] 阶段1未产生 mu_mem.pkl")
        return False
    print(f"  [OK] mu_mem.pkl ({mu_mem.stat().st_size/1024/1024:.1f} MB)")

    # 阶段2: emu4_il2cpp.py 解包 libil2cpp（多轮续跑）
    print("  阶段 2: libil2cpp DT_INIT（多轮续跑）...")
    import os as _os
    env = _os.environ.copy()
    env['SAVE_MOD_STATE'] = '1'
    env['FORCE_REAL'] = '1'  # 填充 NP 函数表 impls（含 real_fn），模拟成功的关键
    env['MAP_MOD'] = '1'     # 注册模幂陷阱/返回钩子（hook_mod_trap/hook_mod_return），checkpoint 保存的前提
    env['INSTRUCTION_LIMIT'] = '2000000000'   # 20 亿条指令（默认 2 亿不够状态机完成解密）
    env['EMULATION_TIMEOUT_US'] = '120000000' # 120 秒（默认 10 秒不够）
    snapshot = None
    for cycle in range(1, 16):
        # 第1轮从 mu 开始，后续轮次从上一轮 checkpoint 续跑
        if cycle == 1:
            prefix = 'post_mod'
        else:
            prefix = f'post_fastpath_{cycle-1}'
        env['SNAPSHOT_PREFIX'] = prefix
        if cycle > 1:
            env['RESUME_MOD'] = '1'
        else:
            env.pop('RESUME_MOD', None)
        print(f"  轮次 {cycle}: SNAPSHOT_PREFIX={prefix} RESUME_MOD={env.get('RESUME_MOD','-')}")
        r2 = subprocess.run([py, str(work / "emu4_il2cpp.py")], cwd=str(work),
                            capture_output=True, text=True, timeout=300, env=env)
        # 保存完整输出到日志文件供诊断
        log_path = work / f"cycle_{cycle}.log"
        log_path.write_text(f"=== stdout ===\n{r2.stdout}\n=== stderr ===\n{r2.stderr}\nreturncode={r2.returncode}", encoding='utf-8')
        if r2.stdout:
            for line in r2.stdout.strip().split("\n")[-8:]:
                print(f"    {line}")
        if r2.returncode != 0 and r2.stderr:
            for line in r2.stderr.strip().split("\n")[-5:]:
                print(f"    ERR: {line}")
        # 检查本轮是否产出 checkpoint，重命名为统一格式
        pm = work / "post_mod_mem.pkl"
        if pm.exists():
            target_name = f"post_fastpath_{cycle}_mem.pkl"
            target = work / target_name
            pm.rename(target)
            for suffix in ['_ctx.pkl', '_pystate.pkl']:
                src = work / ("post_mod" + suffix)
                if src.exists():
                    src.rename(work / (f"post_fastpath_{cycle}" + suffix))
            print(f"  [OK] 轮次 {cycle} 产出: {target_name} ({target.stat().st_size/1024/1024:.1f} MB)")
            snapshot = target
        # 检查 IL2CPP 是否已解密（libil2cpp_mem.bin 代码段非零）
        il2cpp_bin = work / "libil2cpp_mem.bin"
        if il2cpp_bin.exists():
            with il2cpp_bin.open('rb') as f:
                f.seek(0x1D5A33C)  # 代码入口
                code_head = f.read(16)
            if any(code_head):
                print(f"  [OK] IL2CPP 代码段已解密 (轮次 {cycle})")
                break
        print(f"  轮次 {cycle} 未完全解密，继续...")
    if not snapshot:
        for p in sorted(work.glob("mu_mem.pkl")):
            snapshot = p
            break

    # 复制快照到输出目录
    dest = out / snapshot.name
    shutil.copy2(snapshot, dest)
    print(f"  [OK] 快照: {dest.name} ({dest.stat().st_size/1024/1024:.1f} MB)")
    for suffix in ["_ctx.pkl", "_pystate.pkl"]:
        p = snapshot.parent / (snapshot.stem.replace("_mem", "") + suffix)
        if p.exists():
            shutil.copy2(p, out / p.name)
    return True


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="生成 IL2CPP 解密快照")
    parser.add_argument("apk_content", help="APK 提取目录")
    parser.add_argument("-o", "--out", help="输出目录", default=".")
    parser.add_argument("--script-dir", help="模拟器脚本目录", default=None)
    args = parser.parse_args()
    ok = generate_snapshot(args.apk_content, args.out, args.script_dir)
    sys.exit(0 if ok else 1)
