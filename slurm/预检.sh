#!/bin/bash
# 预检.sh —— 提交正式搜索前的一次性环境验证（在计算节点上跑）：
#   node 运行、团队码解码、机制表 bin 构建（flatc 工具链）。全部通过才提交 搜索.sbatch。
#
# 用法：CODE='xxxx:yyyy' srun -p bme_gpupub -A v-jiamh -c 2 --time=00:20:00 bash slurm/预检.sh
# 环境变量：CODE（必填）、ROOT（默认 $SLURM_SUBMIT_DIR/..）、NODE_DIR、FLATC、OUT
set -e
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
NODE_DIR="${NODE_DIR:-/home_data/home/slst/v-jiamh/tools/node-glibc217/bin}"
FLATC="${FLATC:-/home_data/home/slst/v-jiamh/tools/flatc_extract/flatc}"
export PATH="$NODE_DIR:$PATH"
MECH="$ROOT/优化器/机制表"
OUT="${OUT:-$ROOT/../搜索产物_预检}"
CODE="${CODE:?必须设置 CODE 团队码}"

echo "== node =="; node -v; hostname; nproc
echo; echo "== 解码预检（--只解析）=="
node "$ROOT/搜索最优队伍.js" --码="$CODE" --只解析 --出目录="$OUT"

echo; echo "== 机制表 bin 保障 =="
if [ -f "$MECH/build/mechanisms.bin" ]; then
  echo "bin 已存在: $(stat -c%s "$MECH/build/mechanisms.bin") 字节"
else
  [ -x "$FLATC" ] || { echo "错误: flatc 不可用: $FLATC（Linux 版 flatc 25.12.19，与 tools/flatc.exe 同版本）" >&2; exit 2; }
  cp "$MECH/names.txt" /tmp/names.txt.precheck.$$
  node "$MECH/tools/flatten_core.js" --全量 --srcDir 生成
  "$FLATC" -o "$MECH/build" --binary --strict-json --no-warnings "$MECH/schema.fbs" "$MECH/build/flat.json"
  mv -f "$MECH/build/flat.bin" "$MECH/build/mechanisms.bin"
  cp /tmp/names.txt.precheck.$$ "$MECH/names.txt" && rm -f /tmp/names.txt.precheck.$$
  echo "bin 构建完成: $(stat -c%s "$MECH/build/mechanisms.bin") 字节"
fi
ls -la "$MECH/build/"
echo "== 预检全部通过，可提交：CODE='…' sbatch slurm/搜索.sbatch =="
