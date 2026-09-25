// _验证引擎重写.js —— deobfuscated.js 性能改写 bit-exact 验证（改写后 vs 改写前原始备份）
// 原理：createEngine({calcSrc}) 可注入任意引擎源码文本。同一组负载分别用 改写版(默认) 与
//   原始备份(.bak-perf) 各建实例跑，fastReplay 结果 dmg + getState 全字段 JSON 必须逐位相同。
// 负载矩阵：
//   A. DB Top 真实队（按recommend降序取前N支可模拟队）各重放其 canonical/描述 toks
//   B. 随机合法排程：随机5人队 × legalActs 随机走子 65 步（覆盖 do_atk/do_ult/do_def/buff 全分支）
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const 适配 = require('./引擎适配.js');

const 原始源 = fs.readFileSync(path.join(__dirname, '..', '逆向-模拟器', 'deobfuscated.js.bak-perf'), 'utf8');
const 引擎改写 = 适配.createEngine();                                  // 默认 = 改写版
const 引擎原始 = 适配.createEngine({ calcSrc: 原始源 });                  // 原始备份
const 改写inc = 引擎改写.increment, 原始inc = 引擎原始.increment;

const N_DB = Number(process.argv.find(a => /^--db=\d+$/.test(a))?.split('=')[1] || 60);
const N_RAND = Number(process.argv.find(a => /^--rand=\d+$/.test(a))?.split('=')[1] || 400);
const SEED = Number(process.argv.find(a => /^--seed=\d+$/.test(a))?.split('=')[1] || 12345);

// 确定性伪随机（两引擎同序列）
let _s = SEED >>> 0;
function rnd(n) { _s = (_s * 1664525 + 1013904223) >>> 0; return _s % n; }

const 全SSR = 适配.可模拟SSR清单().map(c => c.id);
const bonds = [5, 5, 5, 5, 5];

function 稳定序列化(st) {
  // getState 返回全字段对象；buff 里 from/who 是对象引用 → 用 id 替换，防循环/引用抖动
  const 净 = obj => {
    const o = {};
    for (const k of Object.keys(obj).sort()) {
      const v = obj[k];
      if (v && typeof v === 'object') {
        if (v.id !== undefined && v.getCurAtk) o[k] = '@ref:' + v.id;       // Champ/Boss 引用
        else if (Array.isArray(v)) o[k] = v.map(净);
        else o[k] = 净(v);
      } else o[k] = v;
    }
    return o;
  };
  return JSON.stringify(净(st));
}

let diff = 0, 场 = 0;
function 对拍(ids, toks, 标签) {
  const d改 = 改写inc.fastReplay(ids, toks, bonds, -1, null);
  const d原 = 原始inc.fastReplay(ids, toks, bonds, -1, null);
  场++;
  if (d改 !== d原) { diff++; console.log(`❌ dmg不一致 [${标签}] ${ids} 改写=${d改} 原始=${d原}`); return; }
  // 状态级：各自再跑一遍后 getState 全字段对比（fastReplay 不留可 getState 的终态？battle 后才有——用 initBattle+step 走完整场再 getState）
  const run = inc => {
    inc.initBattle(ids, bonds, -1, null);
    for (const t of toks) inc.step(t.idx, t.act);
    return inc;
  };
  run(改写inc); const s改 = 稳定序列化(引擎改写.getState());
  run(原始inc); const s原 = 稳定序列化(引擎原始.getState());
  if (s改 !== s原) { diff++; console.log(`❌ 状态不一致 [${标签}] ${ids}`); const i = [...s改].findIndex((c, k) => c !== s原[k]); console.log('   首异@' + i + ' 改写…' + s改.slice(Math.max(0, i - 40), i + 40) + ' | 原始…' + s原.slice(Math.max(0, i - 40), i + 40)); }
}

// ---- A. DB Top 真实队 ----
const DB = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname, '..', '..', 'tenkaassist_data', 'data', 'data.json'))).toString());
const 键 = new Set(); const 队 = [];
for (const d of DB) {
  if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
  const ds = String(d.compstr).trim().split(/\s+/).filter(Boolean).map(Number).join(' ');
  const ids = String(d.compstr).trim().split(/\s+/).filter(Boolean).map(Number);
  if (ids.length !== 5 || 键.has(ds)) continue;
  键.add(ds); 队.push({ ids, tok文本: d.description, recommend: d.recommend, name: d.name });
}
队.sort((a, b) => b.recommend - a.recommend);
let db跑 = 0;
for (const q of 队) {
  if (db跑 >= N_DB) break;
  // 解析 toks（只读 description，与引擎版本无关；用改写引擎实例走一遍解析）
  const 排程 = require('./排程器.js');
  const toks = 排程.解析指令集(引擎改写, q.ids, q.tok文本, bonds);
  if (!toks || toks.length < 65) continue;
  对拍(q.ids, toks, 'DB:' + q.name);
  db跑++;
}
console.log(`A层 DB真实队: ${db跑} 支`);

// ---- B. 随机合法排程 ----
let rand跑 = 0;
while (rand跑 < N_RAND) {
  const ids = Array.from({ length: 5 }, () => 全SSR[rnd(全SSR.length)]);
  if (new Set(ids).size !== 5) continue;
  // 用改写引擎走子生成合法 65 步（legalActs 随机采样）
  if (!改写inc.initBattle(ids, bonds, -1, null)) continue;
  const toks = [];
  for (let i = 0; i < 65; i++) {
    // 收集当前所有未行动角色的合法动作
    const 选 = [];
    for (let c = 0; c < 5; c++) { for (const a of 改写inc.legalActs(c)) 选.push({ idx: c, act: a }); }
    if (!选.length) break;
    toks.push(选[rnd(选.length)]);
    改写inc.step(toks[toks.length - 1].idx, toks[toks.length - 1].act);
  }
  if (toks.length < 65) continue;
  对拍(ids, toks, 'RAND' + rand跑);
  rand跑++;
}
console.log(`B层 随机合法排程: ${rand跑} 条`);
console.log(`======== 总计 ${场} 场对照, 不一致 ${diff} 场 → ${diff === 0 ? '✅ bit-exact 通过' : '❌ 存在分歧,禁止落地'} ========`);
