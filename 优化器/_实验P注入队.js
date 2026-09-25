// 实验P: 后지카队(98.02%,全员是伤害궁=false注入型) 序重排能否补救 + 构造通道失效量化
//   诊断后지카实证: 爬山60k/180k×K8/K32全卡98.02(궁차6 평/방차9 序차8/13采纳0); DB解直接爬山100
//   假说: ①序重排可能救部分(序差8) ②但평/방差9是动作错,重排只换序→可能救不动 ③根因是伤害궁判定全false
'use strict';
const 适配器 = require('./引擎适配.js');
const 排程 = require('./排程器.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const 原始 = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(path.resolve(__dirname, '..'), '../tenkaassist_data/data/data.json'))).toString('utf8'));
const ids = (process.argv[2] || '10213,10190,10167,10164,10155').split(',').map(Number);
const BOND = [5, 5, 5, 5, 5];
const inst = 适配器.createEngine();
const want = [...ids].sort((a, b) => a - b).join(' ');
const rec = 原始.find(x => (x.compstr || '').trim().split(/\s+/).map(Number).sort((a, b) => a - b).join(' ') === want);
const DB = Number(rec.recommend);
const dbToks = 排程.解析指令集(inst, ids, rec.description, BOND);
const pct = x => (x / DB * 100).toFixed(2) + '%';
console.log(`队 ${rec.name} [${ids}] DB=${DB.toLocaleString()} 是伤害궁=[${ids.map(i => 排程.是伤害궁(排程.特征.get(i) || {})).join(',')}]`);
function 差(toks) { let c = 0, pf = 0, s = 0; for (let i = 0; i < 65; i++) if (toks[i].act !== dbToks[i].act) { if (toks[i].act === '궁' || dbToks[i].act === '궁') c++; else pf++; } for (let t = 0; t < 13; t++) if (toks.slice(t * 5, t * 5 + 5).map(x => x.idx).join('') !== dbToks.slice(t * 5, t * 5 + 5).map(x => x.idx).join('')) s++; return `궁차${c} 평/방차${pf} 序차${s}`; }

console.log('\n== A: 窗对齐最佳构造 → 爬山 → 序重排 ==');
const 全 = 排程.窗对齐构造(inst, ids, BOND, { 全部: true });
const 起 = 全.slice().sort((a, b) => b.dmg - a.dmg)[0];
console.log(`构造起点 ${pct(起.dmg)} ${起.来源}${起.buff窗 ? '[憋]' : '[준]'} ${差(起.toks)}`);
let t0 = Date.now();
const h = 排程.爬山(inst, ids, 起.toks, BOND, 90000, null, null, 8);
console.log(`爬山(90k,K8) ${pct(h.dmg)} ${差(h.toks)} [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
t0 = Date.now();
const o = 排程.整回合序重排(inst, ids, h.toks, BOND);
console.log(`+序重排 ${pct(o.dmg)} ${差(o.toks)} 评估${o.评估}轮${o.轮数} [${((Date.now() - t0) / 1000).toFixed(0)}s] ${o.dmg > h.dmg ? '★序重排有效+' + ((o.dmg - h.dmg) / DB * 100).toFixed(2) + 'pp' : '×序重排无效(填充错为主)'}`);
// 交替
let 交 = o, 交d = o.dmg;
for (let i = 0; i < 3; i++) { const hh = 排程.爬山(inst, ids, 交.toks, BOND, 40000, null, null, 8); if (hh.dmg <= 交d) break; 交 = hh; 交d = hh.dmg; const oo = 排程.整回合序重排(inst, ids, 交.toks, BOND); if (oo.dmg <= 交d) break; 交 = oo; 交d = oo.dmg; }
console.log(`序↔爬交替3轮 ${pct(交d)} ${差(交.toks)}`);

console.log('\n== B: 束搜索+爬山 → 序重排(对照) ==');
t0 = Date.now();
const b = 排程.束搜索(inst, ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限秒: 300 });
const bh = b ? 排程.爬山(inst, ids, b.toks, BOND, 3000) : null;
const 束爬 = Math.max(b ? b.dmg : 0, bh ? bh.dmg : 0);
const 束toks = (bh && bh.dmg > (b ? b.dmg : 0)) ? bh.toks : (b ? b.toks : null);
console.log(`束+爬 ${pct(束爬)} ${差(束toks)} [${((Date.now() - t0) / 1000).toFixed(0)}s]`);
if (束toks) { const ob = 排程.整回合序重排(inst, ids, 束toks, BOND); console.log(`+序重排 ${pct(ob.dmg)} ${差(ob.toks)}`); }

console.log('\n== C: DB解天花板参照 ==');
console.log(`DB解直接爬山 ${pct(排程.爬山(inst, ids, dbToks, BOND, 30000, null, null, 8).dmg)}`);
console.log('完成');
