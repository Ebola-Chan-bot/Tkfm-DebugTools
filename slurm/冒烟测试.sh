#!/bin/bash
# 冒烟测试.sh —— 小规模验证 搜索最优队伍.js 的断点续跑/进度文件/指纹守卫链路。
#
# 用法（计算节点，约 5-10 分钟）：
#   srun -p bme_gpupub -A v-jiamh -c 4 --time=00:30:00 bash slurm/冒烟测试.sh
#
# 验证点：
#   1. 全链路小规模跑通（合成 8 人小团队码 + 迷你预算），产物齐全
#   2. 同参数重跑 = 全阶段检查点命中，秒级复现结果
#   3. 删一块检查点重跑 = 只补算缺失块（"跳过 2/3 块"）
#   4. 换参数重跑 = meta 指纹拒绝续跑（防串数据）
#   5. SIGTERM 中断 = 进度.json 落中断态 + 检查点保留，重跑续上
set -u
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
NODE_DIR="${NODE_DIR:-/home_data/home/slst/v-jiamh/tools/node-glibc217/bin}"
export PATH="$NODE_DIR:$PATH"
OUT="${OUT:-$ROOT/../搜索产物_冒烟/结果}"
LOG="$ROOT/../搜索产物_冒烟"
mkdir -p "$OUT" "$LOG"
FAIL=0
ok()   { echo "  [PASS] $1"; }
bad()  { echo "  [FAIL] $1"; FAIL=1; }

# 合成 8 人小团队码（解码格式：队员段=10进制'99'+每3位(id-10000)；羁绊段=每位数字）
CODE=$(node -e '
const T = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_!";
const b = d => { let n = BigInt(d), s = ""; do { s = T[Number(n % 64n)] + s; n /= 64n; } while (n > 0n); return s; };
const ids = [10002, 10003, 10005, 10006, 10057, 10063, 10048, 10044];
console.log(b("99" + ids.map(i => String(i - 10000).padStart(3, "0")).join("")) + ":" + b("5".repeat(ids.length)));
')
echo "== 冒烟小码: $CODE"

ARGS=(--码="$CODE" --出目录="$OUT" --全扫阈值=20 --块大小=20 --入围=30 --B名单=4
      --TopN=2 --K=1 --D名单=1 --D块=40 --终搜=1 --束时限=10
      --粗预算=100 --深预算=100 --爬山预算=100 --并发=4)

echo; echo "== 1. 首跑全链路 =="
node "$ROOT/搜索最优队伍.js" "${ARGS[@]}" > "$LOG/run1.log" 2>&1
[ $? -eq 0 ] && ok "首跑退出码 0" || bad "首跑非 0 退出（$LOG/run1.log）"
[ -f "$OUT/最优队_结果.json" ] && ok "最优队_结果.json 产出" || bad "缺 最优队_结果.json"
[ -f "$OUT/进度.json" ] && ok "进度.json 产出" || bad "缺 进度.json"
for f in meta.json A精扫.json B精排.json C深搜.json 终搜_1.json; do
  [ -f "$OUT/检查点/$f" ] && ok "检查点/$f" || bad "缺 检查点/$f"
done
NA=$(ls "$OUT/检查点"/A粗筛_*.json 2>/dev/null | wc -l)
ND=$(ls "$OUT/检查点"/D深评_*.json 2>/dev/null | wc -l)
[ "$NA" -ge 3 ] && ok "A粗筛分块检查点 $NA 块" || bad "A粗筛块数 $NA < 3"
[ "$ND" -ge 1 ] && ok "D深评分块检查点 $ND 块" || bad "缺 D深评块"

echo; echo "== 2. 同参数重跑（应全命中缓存）=="
node "$ROOT/搜索最优队伍.js" "${ARGS[@]}" > "$LOG/run2.log" 2>&1
[ $? -eq 0 ] && ok "重跑退出码 0" || bad "重跑非 0 退出"
grep -q "跳过 $NA/$NA 块" "$LOG/run2.log" && ok "A粗筛全块跳过（$NA/$NA）" || bad "A粗筛未全跳过"
grep -q "终搜 1/1 续跑：采用已有结果" "$LOG/run2.log" && ok "终搜命中缓存" || bad "终搜未命中缓存"
grep -q "B续跑：已完成" "$LOG/run2.log" && ok "B阶段命中缓存" || bad "B阶段未命中缓存"

echo; echo "== 3. 删一块检查点重跑（应只补算缺失块）=="
rm -f "$OUT/检查点/A粗筛_$((NA-1)).json" "$OUT/检查点/A精扫.json" \
      "$OUT/检查点/B精排.json" "$OUT/检查点/C深搜.json" \
      "$OUT/检查点"/D深评_*.json "$OUT/检查点"/终搜_*.json
node "$ROOT/搜索最优队伍.js" "${ARGS[@]}" > "$LOG/run3.log" 2>&1
[ $? -eq 0 ] && ok "补算退出码 0" || bad "补算非 0 退出"
grep -q "跳过 $((NA-1))/$NA 块" "$LOG/run3.log" && ok "仅补算 1 块（跳过 $((NA-1))/$NA）" || bad "块跳过数不对"
[ -f "$OUT/最优队_结果.json" ] && ok "补算后结果完整" || bad "补算后缺结果"

echo; echo "== 4. 换参数重跑（meta 指纹应拒绝）=="
node "$ROOT/搜索最优队伍.js" "${ARGS[@]}" --粗预算=101 > "$LOG/run4.log" 2>&1
RC=$?
[ "$RC" -eq 2 ] && ok "指纹不匹配被拒（exit 2）" || bad "指纹守卫失效（exit $RC）"
grep -q "指纹不匹配" "$LOG/run4.log" && ok "给出指纹拒绝提示" || bad "缺指纹拒绝提示"

echo; echo "== 5. SIGTERM 中断 + 续跑 =="
rm -rf "$OUT"; mkdir -p "$OUT"
node "$ROOT/搜索最优队伍.js" "${ARGS[@]}" > "$LOG/run5.log" 2>&1 &
PID=$!
GOT=0
for i in $(seq 1 90); do
  ls "$OUT/检查点"/A粗筛_*.json >/dev/null 2>&1 && { GOT=1; break; }
  kill -0 $PID 2>/dev/null || break
  sleep 1
done
if [ "$GOT" = 1 ]; then
  ok "中断前已有块检查点落盘"
  kill -TERM $PID 2>/dev/null; wait $PID
  grep -q "收到 SIGTERM" "$LOG/run5.log" && ok "SIGTERM 优雅收尾" || bad "缺 SIGTERM 收尾日志"
  grep -q '"状态":"中断"' "$OUT/进度.json" && ok "进度.json 落中断态" || bad "进度.json 未落中断态"
  node "$ROOT/搜索最优队伍.js" "${ARGS[@]}" > "$LOG/run6.log" 2>&1
  [ $? -eq 0 ] && ok "中断后重跑续上并完成" || bad "中断后续跑失败"
  grep -qE "跳过 [0-9]+/[0-9]+ 块" "$LOG/run6.log" && ok "续跑跳过已完成块" || bad "续跑未跳过块"
else
  bad "未能在 90s 内等到块检查点（跑太快或异常，见 run5.log）"
fi

echo
if [ "$FAIL" = 0 ]; then echo "== 冒烟测试全部通过 =="; else echo "== 冒烟测试存在失败项（日志: $LOG/）=="; fi
exit $FAIL
