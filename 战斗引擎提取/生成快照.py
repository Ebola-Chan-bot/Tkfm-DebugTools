#!/usr/bin/env python3
"""
从 APK 提取的文件生成 IL2CPP 解密快照（Unicorn 模拟 NP 解包）。
自动修补模拟器脚本中的硬编码路径，无需手动准备。
"""
import sys, os, shutil, pathlib, subprocess

def 修补脚本(源文件: pathlib.Path, 目标文件: pathlib.Path, 工作目录: pathlib.Path):
    """将脚本中的硬编码路径替换为工作目录"""
    文本 = 源文件.read_text(encoding="utf-8", errors="replace")
    旧基路径 = "C:/Users/vhtmf/AppData/Local/Temp/np-unpack"
    新基路径 = str(工作目录).replace("\\", "/")
    文本 = 文本.replace(旧基路径, 新基路径)
    目标文件.write_text(文本, encoding="utf-8")

def 生成快照(APK提取目录: str, 输出目录: str, 脚本目录: str = None):
    """
    参数:
      APK提取目录: 提取的 APK 文件目录（含 libcompatible.so, libil2cpp.so 等）
      输出目录: 输出目录（快照保存在此）
      脚本目录: 模拟器脚本目录（默认与本脚本同目录）
    """
    APK目录 = pathlib.Path(APK提取目录)
    输出路径 = pathlib.Path(输出目录)
    if 脚本目录 is None:
        脚本目录 = pathlib.Path(__file__).parent
    else:
        脚本目录 = pathlib.Path(脚本目录)

    输出路径.mkdir(parents=True, exist_ok=True)

    for 文件名 in ["libcompatible.so", "libil2cpp.so"]:
        if not (APK目录 / 文件名).exists():
            print(f"[X] 缺少 {文件名}，请先从 APK 提取")
            return False

    模拟器文件列表 = ["NP自解密模拟.py", "IL2CPP解密模拟.py", "ELF工具库.py", "compatible_relocs.json", "compatible_decrypted.bin"]

    for 条目 in 模拟器文件列表:
        if not (脚本目录 / 条目).exists():
            print(f"[X] 缺少模拟器文件: {条目}")
            return False

    工作路径 = 输出路径 / "emu_work"
    工作路径.mkdir(parents=True, exist_ok=True)
    print(f"[1/3] 准备模拟环境: {工作路径}")

    for 条目 in 模拟器文件列表:
        shutil.copy2(脚本目录 / 条目, 工作路径 / 条目)

    for 文件名 in ["libcompatible.so", "libil2cpp.so", "libstub.so", "libengine.so"]:
        源 = APK目录 / 文件名
        if 源.exists():
            shutil.copy2(源, 工作路径 / 文件名)

    print("[2/3] 修补模拟器路径")
    for 条目 in ["NP自解密模拟.py", "IL2CPP解密模拟.py"]:
        修补脚本(工作路径 / 条目, 工作路径 / 条目, 工作路径)

    print("[3/3] 运行 NP 解包模拟（Unicorn）")
    print("  这可能需要几分钟...")

    Python解释器 = sys.executable or "python"

    print("  阶段 1: libcompatible DT_INIT ...")
    阶段1结果 = subprocess.run([Python解释器, str(工作路径 / "NP自解密模拟.py")], cwd=str(工作路径),
                        capture_output=True, text=True, timeout=600)
    if 阶段1结果.returncode != 0:
        print(f"  [!] emu2.py 返回 {阶段1结果.returncode}")
        print(f"  stdout: {阶段1结果.stdout[-500:]}")
        print(f"  stderr: {阶段1结果.stderr[-500:]}")

    内存快照文件 = 工作路径 / "mu_mem.pkl"
    if not 内存快照文件.exists():
        print("  [X] 阶段1未产生 mu_mem.pkl")
        return False
    print(f"  [OK] mu_mem.pkl ({内存快照文件.stat().st_size/1024/1024:.1f} MB)")

    print("  阶段 2: libil2cpp DT_INIT（一趟跑完）...")
    环境变量 = os.environ.copy()
    环境变量['指令上限'] = '50000000000'
    环境变量['模拟超时微秒'] = '1800000000'
    快照路径 = None
    print("  运行 IL2CPP DT_INIT 解密（一趟跑完）...")
    阶段2结果 = subprocess.run([Python解释器, str(工作路径 / "IL2CPP解密模拟.py")], cwd=str(工作路径),
                        capture_output=True, text=True, timeout=3600, env=环境变量)
    if 阶段2结果.stdout:
        for 行 in 阶段2结果.stdout.strip().split("\n")[-8:]:
            print(f"    {行}")
    if 阶段2结果.returncode != 0 and 阶段2结果.stderr:
        for 行 in 阶段2结果.stderr.strip().split("\n")[-5:]:
            print(f"    ERR: {行}")
    模幂内存文件 = 工作路径 / "post_mod_mem.pkl"
    if 模幂内存文件.exists():
        快照目标路径 = 工作路径 / "il2cpp_snapshot.pkl"
        模幂内存文件.rename(快照目标路径)
        快照路径 = 快照目标路径
        print(f"  [OK] 快照产出: {快照目标路径.name} ({快照目标路径.stat().st_size/1024/1024:.1f} MB)")
    if not 快照路径:
        for 条目 in sorted(工作路径.glob("mu_mem.pkl")):
            快照路径 = 条目
            break

    输出副本路径 = 输出路径 / 快照路径.name
    shutil.copy2(快照路径, 输出副本路径)
    print(f"  [OK] 快照: {输出副本路径.name} ({输出副本路径.stat().st_size/1024/1024:.1f} MB)")
    for 后缀 in ["_ctx.pkl", "_pystate.pkl"]:
        条目 = 快照路径.parent / (快照路径.stem.replace("_mem", "") + 后缀)
        if 条目.exists():
            shutil.copy2(条目, 输出路径 / 条目.name)
    return True


if __name__ == "__main__":
    import argparse
    参数解析器 = argparse.ArgumentParser(description="生成 IL2CPP 解密快照")
    参数解析器.add_argument("apk_content", help="APK 提取目录")
    参数解析器.add_argument("-o", "--out", help="输出目录", default=".")
    参数解析器.add_argument("--script-dir", help="模拟器脚本目录", default=None)
    命令行参数 = 参数解析器.parse_args()
    成功标志 = 生成快照(命令行参数.apk_content, 命令行参数.out, 命令行参数.script_dir)
    sys.exit(0 if 成功标志 else 1)
