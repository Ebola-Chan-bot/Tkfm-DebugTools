// 一次性计时脚本：测 解析指令集 与 fastReplay 的单次成本，估算全库 ELV 优化预算
'use strict';
const fs = require('fs'), zlib = require('zlib');
const 适配 = require('./引擎适配.js'), 排程 = require('./排程器.js');

// data.json 可能是 gzip 或明文，两种都兼容
const _buf = fs.readFileSync(require('path').resolve(__dirname, '..', '..', 'tenkaassist_data/data/data.json'));
const _txt = (_buf[0] === 0x1f && _buf[1] === 0x8b) ? zlib.gunzipSync(_buf).toString('utf8') : _buf.toString('utf8');
const 原始 = JSON.parse(_txt);

// 取 recommend 最高的 8 支不同队伍做样本
const 键 = new Set(); const 样本 = [];
for (const x of 原始) {
  if (!(x.recommend > 0) || !x.description || !x.description.includes('턴')) continue;
  const k = String(x.compstr).trim();
  if (键.has(k)) continue; 键.add(k);
  样本.push(x);
  if (样本.length >= 8) break;
}
样本.sort((a, b) => b.recommend - a.recommend);

const inst = 适配.createEngine();

// 1) 解析成本
let t0 = process.hrtime.bigint();
const toks集 = 样本.map(r => 排程.解析指令集(inst, String(r.compstr).trim().split(/\s+/).map(Number), r.description, [5,5,5,5,5]));
let t1 = process.hrtime.bigint();
console.log(`解析指令集: ${Number(t1 - t0) / 1e6 / 样本.length} ms/队 (样本${样本.length}队)`);

// 2) fastReplay 成本（现有路径，ELV关）
const ids0 = String(样本[0].compstr).trim().split(/\s+/).map(Number);
const toks0 = toks集[0];
const dmg0 = 排程.重放(inst, ids0, toks0, [5,5,5,5,5]);
console.log(`校验: 重放dmg=${dmg0.toLocaleString()} DB=${样本[0].recommend.toLocaleString()} 比=${(dmg0/样本[0].recommend*100).toFixed(2)}%`);
let N = 2000;
t0 = process.hrtime.bigint();
for (let i = 0; i < N; i++) 排程.重放(inst, ids0, toks0, [5,5,5,5,5]);
t1 = process.hrtime.bigint();
const 每次ms = Number(t1 - t0) / 1e6 / N;
console.log(`fastReplay: ${每次ms.toFixed(4)} ms/次 (${N}次, 共${(Number(t1-t0)/1e6).toFixed(0)}ms)`);

// 3) 预算推算
const 队数 = 48785, 条数 = 52066;
for (const [名, 每队评估] of [['单遍贪心', 36], ['坐标上升3遍收敛', 120], ['坐标上升+互补对', 160], ['全空间枚举(上限)', 14000]]) {
  const 总秒 = 条数 * 每队评估 * 每次ms / 1000;
  console.log(`${名}: ${每队评估}评估/队 → 单线程 ${(总秒/3600).toFixed(2)}h, 24线程 ${(总秒/3600/24*60).toFixed(1)}min`);
}
