// 通用深诊断：任意队的窗对齐天花板根因（_诊断94方差.js 的通用化+机制画像+填充结构对比）
// 用法: node _诊断队.js <ids逗号> [爬山预算=60000] [K=8]
'use strict';
const 适配器 = require('./引擎适配.js');
const 排程 = require('./排程器.js');
const 机制特征 = require('./机制特征.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const 原始 = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(path.resolve(__dirname, '..'), '../tenkaassist_data/data/data.json'))).toString('utf8'));
const ids = process.argv[2].split(',').map(Number);
const 预算 = Number(process.argv[3] || 60000);
const K = Number(process.argv[4] || 8);
const BOND = [5, 5, 5, 5, 5];
const inst = 适配器.createEngine();
const want = [...ids].sort((a, b) => a - b).join(' ');
const rec = 原始.find(x => (x.compstr || '').trim().split(/\s+/).map(Number).sort((a, b) => a - b).join(' ') === want);
if (!rec) { console.log('DB无此队', want); process.exit(1); }
const DB = Number(rec.recommend);
const dbToks = 排程.解析指令集(inst, ids, rec.description, BOND);
const dbDmg = dbToks ? 排程.重放(inst, ids, dbToks, BOND) : 0;
const pct = x => (x / DB * 100).toFixed(2) + '%';
console.log(`队 ${rec.name} [${ids}] DB=${DB.toLocaleString()} ranking=${rec.ranking}`);
console.log(`DB解重放=${dbDmg.toLocaleString()} ${pct(dbDmg)} bit复现=${dbDmg === DB}`);

// ① 机制画像
console.log('\n== ① 机制画像 ==');
console.log('位      id    role atkMag ultMag cd | 注入 门控 周期 CD操 开关 治疗 叠层 动供 延迟供给');
for (let i = 0; i < 5; i++) {
  const id = ids[i], f = 排程.特征.get(id) || {}, m = 机制特征.画像(id) || {};
  console.log(`位${i + 1}  ${id}  ${String(f.role).padEnd(4)} ${String(f.atkMag).padEnd(6)} ${String(f.ultMag).padEnd(6)} ${String(f.cd).padEnd(2)} | ${[m.注入数, m.门控数, m.周期数, m.CD操纵数, m.开关数, m.治疗数, m.叠层数, m.动态供给数].join('    ')}   ${机制特征.是延迟供给者(id)}`);
}
console.log(`需相位规划=${机制特征.需相位规划(ids)}  需窗规划=${机制特征.需窗规划(ids)}`);

// ② DB 解结构
const 回合动作 = toks => {
  const 行 = [];
  for (let t = 0; t < 13; t++) {
    const seg = toks.slice(t * 5, t * 5 + 5);
    const 计 = {}; for (const x of seg) 计[x.act] = (计[x.act] || 0) + 1;
    行.push({ t: t + 1, 计, 序: seg.map(x => (x.idx + 1) + x.act).join('>') });
  }
  return 行;
};
const DB行 = 回合动作(dbToks);
const Sdb = DB行.filter(r => r.计.궁).map(r => r.t);
console.log(`\n== ② DB解结构 == 궁齐射窗 Sdb={${Sdb.join(',')}}`);
for (const r of DB行) console.log(`  t${String(r.t).padStart(2)}: ${Object.entries(r.计).map(([k, v]) => k + '×' + v).join(' ')}  |  ${r.序}`);

// ③ 全构造枚举: Sdb 是否在族内 + dmg 排名
console.log('\n== ③ 生产全构造中的 Sdb ==');
const 全 = 排程.窗对齐构造(inst, ids, BOND, { 全部: true });
console.log(`全构造数=${全.length}`);
const SdbKey = Sdb.join(',');
const hits = 全.filter(c => [...new Set(c.S)].sort((a, b) => a - b).join(',') === SdbKey);
全.slice(0, 6).forEach((c, i) => console.log(`  dmg#${i + 1} S={${[...new Set(c.S)].sort((a,b)=>a-b).join(',')}} ${(c.dmg / DB * 100).toFixed(1)}% ${c.来源}${c.buff窗 ? '[憋]' : '[준]'}${c.방变体 ? '' : ''}`));
console.log(`  → Sdb 命中构造 ${hits.length} 个`);
hits.forEach(c => { const rk = 全.indexOf(c) + 1; console.log(`     S={${SdbKey}} dmg=${pct(c.dmg)} 全局第${rk}/${全.length} ${c.来源}${c.buff窗 ? '[憋]' : '[준]'}`); });

// ④ 结构对比: 最佳 Sdb 构造 vs DB 解
function 对比(toks, 标签) {
  let 궁차 = 0, 평방차 = 0, 순차 = 0;
  for (let i = 0; i < 65; i++) if (toks[i].act !== dbToks[i].act) { if (toks[i].act === '궁' || dbToks[i].act === '궁') 궁차++; else 평방차++; }
  for (let t = 0; t < 13; t++) {
    const a = toks.slice(t * 5, t * 5 + 5).map(x => x.idx).join('');
    if (a !== dbToks.slice(t * 5, t * 5 + 5).map(x => x.idx).join('')) 순차++;
  }
  const dmg = 排程.重放(inst, ids, toks, BOND);
  console.log(`  ${标签}: ${pct(dmg)} 궁차이=${궁차} 평/방차이=${평방차} 序차이=${순차}/13`);
  return { toks, dmg };
}
if (hits.length) {
  const 最佳 = hits.reduce((a, b) => a.dmg > b.dmg ? a : b);
  const 行 = 回合动作(最佳.toks);
  console.log(`\n== ④ 最佳Sdb构造(${最佳.来源}${最佳.buff窗 ? '[憋]' : '[준]'}) 逐回合 ==`);
  for (let i = 0; i < 13; i++) {
    const d = DB行[i], c = 行[i];
    const dS = Object.entries(d.计).map(([k, v]) => k + '×' + v).join(' ');
    const cS = Object.entries(c.计).map(([k, v]) => k + '×' + v).join(' ');
    console.log(`  t${String(i + 1).padStart(2)}: DB[${dS.padEnd(20)}] 构造[${cS.padEnd(20)}] ${dS === cS ? '' : '←差异'}`);
  }
  console.log('\n== ⑤ 爬山敏感性 ==');
  对比(最佳.toks, '构造起点    ');
  for (const [b, k] of [[预算, K], [预算 * 3, K], [预算 * 3, 32]]) {
    const t0 = Date.now();
    const h = 排程.爬山(inst, ids, 最佳.toks, BOND, b, null, null, k);
    const r = 对比(h.toks, `爬山 预算${b} K${k}`);
    console.log(`     (${((Date.now() - t0) / 1000).toFixed(0)}s 评估${h.评估} 提升${h.提升} 试探${h.谷底试探数} 采纳${h.谷底采纳数})`);
  }
  对比(排程.爬山(inst, ids, dbToks, BOND, 30000, null, null, 8).toks, 'DB解直接爬山');
}
console.log('\n完成');
