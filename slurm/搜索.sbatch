#!/bin/bash
# 搜索.sbatch —— 搜索最优队伍的 Slurm 提交脚本（断点续跑 + 超时自动重提）
#
# 用法（在**仓库根目录**或显式设 ROOT 提交）：
#   CODE='xxxx:yyyy' sbatch slurm/搜索.sbatch
#   CODE='xxxx:yyyy' OUT=/data/out TIME=2-00:00:00 CPUS=8 sbatch slurm/搜索.sbatch
#
# 环境变量：
#   CODE      团队码（必填）
#   OUT       产物+检查点目录（默认：<仓库外>/搜索产物_<码哈希>/结果）。
#             **续跑必须同一 OUT**：被杀后重新提交同一命令即自动跳过已完成块/阶段。
#             OUT 一旦确定会随自动重提原样传递（不会因时间戳变化而错位）。
#   ROOT      仓库根（默认 $SLURM_SUBMIT_DIR；从别处提交时显式指定）
#   NODE_DIR  node 可执行目录（默认共享存储上的 glibc2.17 兼容构建）
#   TIME      时限（默认 4-00:00:00；分区上限 5 天）
#   CPUS      核数（默认 8；注意 QOS 单用户核上限，超了直接 PENDING）
#   MEM       内存（默认 32G）
#   MAXRESUB  超时/中断后自动重提次数上限（默认 3）
#   RESUBMIT_N（内部）当前已重提次数
#   追加参数   EXTRA_ARGS='--从头' 等原样透传给搜索最优队伍.js
#
# 可靠性设计：
#   - 搜索脚本逐块/逐项落检查点（出目录/检查点/）+ 每 2s 刷进度.json + 每 30s 刷输出镜像；
#     无论 SIGTERM/SIGKILL/节点掉电，最多损失在途块 × 并发数 的算量。
#   - --signal=B:USR1@300：超时前 5 分钟发 USR1，脚本立刻通知 node 保存进度提前收尾，
#     随后自动 `sbatch $0` 重提自己续跑（RESUBMIT_N 递增，MAXRESUB 封顶）。
#     用户主动 scancel 只发 SIGTERM 不发 USR1，不会误触发自动重提。
#   - --requeue：节点故障时调度器自动重排，配合检查点即"换节点接着跑"。
#
#SBATCH --job-name=搜索最优队伍
#SBATCH --partition=bme_gpupub
#SBATCH --account=v-jiamh
#SBATCH -c 8
#SBATCH --mem=32G
#SBATCH --time=4-00:00:00
#SBATCH --requeue
#SBATCH --signal=B:USR1@300
#SBATCH --output=slurm-%j.out

set -u

# ---- 集群/环境适配（均可环境变量覆盖）----
ROOT="${ROOT:-${SLURM_SUBMIT_DIR:-.}}"
NODE_DIR="${NODE_DIR:-/home_data/home/slst/v-jiamh/tools/node-glibc217/bin}"
export PATH="$NODE_DIR:$PATH"

if [ ! -f "$ROOT/搜索最优队伍.js" ]; then
  echo "错误: ROOT=$ROOT 下找不到 搜索最优队伍.js。请从仓库根目录提交，或显式设置 ROOT。" >&2
  exit 2
fi
if [ -z "${CODE:-}" ]; then
  echo "错误: 必须设置 CODE 团队码，例如 CODE='xxxx:yyyy' sbatch slurm/搜索.sbatch" >&2
  exit 2
fi

# ---- OUT：默认按码哈希定目录（同一码重复提交天然续跑），已设则原样沿用 ----
if [ -z "${OUT:-}" ]; then
  HASH=$(printf '%s' "$CODE" | md5sum | cut -c1-8)
  OUT="$ROOT/../搜索产物_${HASH}/结果"
fi
mkdir -p "$OUT"
export CODE OUT   # 供自动重提沿用（同一 OUT 才能续跑）

MAXRESUB="${MAXRESUB:-3}"
RESUBMIT_N="${RESUBMIT_N:-0}"
TIMEOUT_WARN=0
NODE_PID=""

echo "job=$SLURM_JOB_ID host=$(hostname) cpus=$(nproc) start=$(date '+%F %T')"
echo "ROOT=$ROOT"
echo "OUT=$OUT"
echo "RESUBMIT_N=$RESUBMIT_N/$MAXRESUB"
node -v
[ -f "$OUT/进度.json" ] && echo "[续跑] 上次进度: $(cat "$OUT/进度.json")"

# 超时预警（USR1）：提前通知 node 落检查点收尾，给自动重提留时间
on_usr1() {
  TIMEOUT_WARN=1
  echo "[$(date '+%F %T')] 收到 USR1 超时预警，通知 node 保存进度提前收尾"
  [ -n "$NODE_PID" ] && kill -TERM "$NODE_PID" 2>/dev/null
}
# SIGTERM：只记录。是否重提由退出后的判断决定（区分超时 vs 用户 scancel）
on_term() { echo "[$(date '+%F %T')] 收到 SIGTERM（超时预警标记 TIMEOUT_WARN=$TIMEOUT_WARN）"; }
trap on_usr1 USR1
trap on_term TERM

node "$ROOT/搜索最优队伍.js" \
  --码="$CODE" \
  --出目录="$OUT" \
  --导出="$OUT/最优队_结果.json" \
  --并发="$SLURM_CPUS_PER_TASK" \
  ${EXTRA_ARGS:-} &
NODE_PID=$!
wait "$NODE_PID"
rc=$?
NODE_PID=""
echo "[$(date '+%F %T')] node exit=$rc"

# ---- 完成判定 / 自动重提 ----
if [ -f "$OUT/最优队_结果.json" ]; then
  echo "== 搜索完成，结果: $OUT/最优队_结果.json"
  exit 0
fi
if [ "$TIMEOUT_WARN" != 1 ]; then
  echo "== 非超时中断（用户 scancel 或报错，exit=$rc），不自动重提。检查点已保存，重提同一命令即续跑。"
  exit "$rc"
fi
if [ "$RESUBMIT_N" -ge "$MAXRESUB" ]; then
  echo "== 超时但已达自动重提上限 MAXRESUB=$MAXRESUB，停止。检查点已保存，手动重提可续跑。"
  exit 143
fi

export RESUBMIT_N=$((RESUBMIT_N + 1))
echo "== 超时中断（exit=$rc），自动重提续跑（第 $RESUBMIT_N/$MAXRESUB 次）…"
if ! sbatch --export=ALL "$0"; then
  echo "错误: 自动重提失败。检查点已保存在 $OUT/检查点/，手动重提同一命令即可续跑。" >&2
  exit 143
fi
echo "已重新提交，本作业退出。"
exit 0
