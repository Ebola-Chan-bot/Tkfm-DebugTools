'use strict';
/*
 * 临时实验H：验证"88% 缺口 = 跨 basin 需 2 处 token 改动、爬山 r=1 邻域跨不过去"假说。
 * 实验G 实锤：束搜索把 位4(10193) 的 t9 궁 延后到 t10 放 → t9 少 2.31G（缺口 3.58G 的主体）。
 * 假说链：
 *   ① 单改 t9.2 位4평→位4궁 会令 t10 的 位4궁 CD 未就绪 → fastReplay=0 → 爬山此邻域全废；
 *   ② 必须同时把 t10 的 位4궁 改掉（→평）才合法 → 编辑球 r=2 才覆盖，爬山 r=1 跨不过去；
 *   ③ 若手动做这 2 处改动后伤害大幅回升 → 证实是"搜索邻域"问题而非"评分失真"问题，
 *      解法 = 爬山邻域扩展 / 主程序 --加深≥2，而非再改填充评分。
 * 全部用公开 API（重放/编辑球层），不改核心。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
const 特例ID = new Set([10162, 10205]);

function 选队(N) {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const inst = 适配.createEngine();
  const getCharacter = 适配.角色数据().getCharacter;
  const 缓存 = new Map();
  const 角色 = id => { if (!缓存.has(id)) 缓存.set(id, getCharacter(id)); return 缓存.get(id); };
  const 可模拟 = id => { const c = 角色(id); return c && c.ok === true && c.rarity === 3 && c.hp && c.atk; };
  const 名单 = new Map();
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5 || ids.some(id => !id || !可模拟(id) || 特例ID.has(id))) continue;
    const 键 = ids.join(',');
    const 旧 = 名单.get(键);
    if (!旧 || d.recommend > 旧.recommend) 名单.set(键, { 队: d.name || 键, ids, description: d.description, recommend: d.recommend });
  }
  const 强队 = [...名单.values()].sort((a, b) => b.recommend - a.recommend);
  const 用队 = [];
  for (const d of 强队) {
    if (用队.length >= N) break;
    const toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
    if (!toks || 排程器.重放(inst, d.ids, toks, BOND) !== d.recommend) continue;
    用队.push(d);
  }
  return 用队;
}

const 队 = 选队(8);
const 目标 = 队.filter(d => d.recommend === 29902664856 || d.recommend === 29581413492);
const inst = 适配.createEngine();
const 位4 = 3;   // idx=3 = 位4 = 10193

for (const d of 目标) {
  console.log(`\n########## ${d.ids.join(',')}  DB=${d.recommend.toLocaleString()} ##########`);
  const 목표toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
  const 真값 = 排程器.重放(inst, d.ids, 목표toks, BOND);
  const r = 排程器.束搜索(inst, d.ids, BOND, { width: 10, R: 4, 评分: 'sync', 时限秒: 600 });
  console.log(`束=${r.dmg.toLocaleString()} (${(r.dmg / 真값 * 100).toFixed(2)}%)`);

  // 束结果里 位4 = 10193 的所有 궁 位置
  const 位4궁们 = r.toks.map((t, k) => (t.idx === 位4 && t.act === '궁') ? k : -1).filter(k => k >= 0);
  console.log(`束结果 位4궁 位置: ${位4궁们.map(k => `s${k}(t${((k / 5) | 0) + 1}.${k % 5 + 1})`).join(' ')}`);
  const db位4궁们 = 목표toks.map((t, k) => (t.idx === 位4 && t.act === '궁') ? k : -1).filter(k => k >= 0);
  console.log(`DB     位4궁 位置: ${db位4궁们.map(k => `s${k}(t${((k / 5) | 0) + 1}.${k % 5 + 1})`).join(' ')}`);

  // ① 单 token 改动：把束结果中 t9 的 位4평 改成 位4궁 → 是否非法(=0)？
  const t9起 = 40;   // t9 = s40..s44
  const 平位 = [];
  for (let k = t9起; k < t9起 + 5; k++) if (r.toks[k].idx === 位4 && r.toks[k].act !== '궁') 平位.push(k);
  console.log(`\n束 t9 中 位4 的非궁动作位置: ${平位.map(k => `s${k}=${r.toks[k].act}`).join(' ') || '(无)'}`);
  for (const k of 平位) {
    const nb = r.toks.map(t => ({ idx: t.idx, act: t.act }));
    nb[k].act = '궁';
    const dmg = 排程器.重放(inst, d.ids, nb, BOND);
    console.log(`  ①单改 s${k}(t9.${k % 5 + 1}) 位4${r.toks[k].act}→궁: dmg=${dmg.toLocaleString()} ${dmg === 0 ? '⚠️非法(0)——爬山此邻域全废' : (dmg > r.dmg ? '✅提升 +' + ((dmg - r.dmg) / 1e9).toFixed(3) + 'G' : '无提升 Δ' + ((dmg - r.dmg) / 1e9).toFixed(3) + 'G')}`);
  }

  // ② 编辑球 r=2（以束结果为球心，穷举恰好 2 处偏离）能否达 DB？
  let 最优2 = r.dmg, 最优2toks = null, 计数2 = 0;
  const t0 = Date.now();
  for (let rr = 1; rr <= 2; rr++) {
    排程器.编辑球层(inst, d.ids, r.toks, BOND, rr, (toks, dmg) => {
      计数2++;
      if (dmg > 最优2) { 最优2 = dmg; 最优2toks = toks; }
    }, Infinity, () => false);
    console.log(`  ②编辑球 r=${rr}: 候选${计数2} 最优=${最优2.toLocaleString()} (${(最优2 / 真값 * 100).toFixed(2)}%) 耗时${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  if (最优2toks) {
    const 差 = 最优2toks.map((t, k) => (t.idx !== r.toks[k].idx || t.act !== r.toks[k].act) ? `s${k}:${r.toks[k].act}→${t.act}` : null).filter(Boolean);
    console.log(`     改动位置: ${差.join(' ')}`);
    // ③ 编辑球最优 + 爬山（10000 预算）能否继续爬到 DB？
    const h = 排程器.爬山(inst, d.ids, 最优2toks, BOND, 10000);
    console.log(`  ③编辑球r2 + 爬山: ${h.dmg.toLocaleString()} (${(h.dmg / 真값 * 100).toFixed(2)}%) DB=${(真값 / 1e9).toFixed(2)}G 缺口${((真값 - h.dmg) / 1e9).toFixed(3)}G`);
  }

  // ④ 直接从束结果爬山（benchmark 口径，BENCH_CLIMB=3000）对照
  const h0 = 排程器.爬山(inst, d.ids, r.toks, BOND, 3000);
  console.log(`  ④仅爬山(3000预算, benchmark口径): ${h0.dmg.toLocaleString()} (${(h0.dmg / 真값 * 100).toFixed(2)}%) 提升${h0.提升}次`);
}
