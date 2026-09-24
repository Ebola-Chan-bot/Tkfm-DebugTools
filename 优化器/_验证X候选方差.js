// Task A/B: 实证 R9c 新最低队(94.85%, 束搜索方差崩) 的窗对齐天花板根因
//   假说: DB 解 궁齐射窗 Sdb={5,9,13} 是 T=4 窗(因 10197 注入-3CD 压真实节奏到4),
//         而生产节拍族 T 只取队内名义 궁 cd(=5) → T=4 窗不在构造族 → Sdb 不可表达 → 兜底封顶94.85%。
// 实证三步: ①DB解toks真值复现+궁回合集 确认Sdb ②生产全构造中Sdb的dmg排名(证不在族内/在族底) ③显式S族={Sdb}爬山可达率(证修复后能救)
// 用法: node _验证X候选方差.js [ids] [爬山预算]
'use strict';
const 适配器 = require('./引擎适配.js');
const 排程 = require('./排程器.js');
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const 根 = path.resolve(__dirname, '..');
const 原始 = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(根, '../tenkaassist_data/data/data.json'))).toString('utf8'));

const ids = (process.argv[2] || '10197,10152,10096,10177,10163').split(',').map(Number);
const 预算 = Number(process.argv[3] || 60000);
const wantKey = [...ids].sort((a, b) => a - b).join(' ');
const rec = 原始.find(x => (x.compstr || '').trim().split(/\s+/).map(Number).sort((a, b) => a - b).join(' ') === wantKey);
if (!rec) { console.log('DB找不到', wantKey); process.exit(1); }
const DB真值 = Number(rec.recommend);
const bonds = [5, 5, 5, 5, 5];
const inst = 适配器.createEngine();
console.log(`队 name=${rec.name} [${ids}] DB真值=${DB真值.toLocaleString()}`);

// ① DB 解解码 → toks, 重放复现, 궁齐射窗 Sdb
const dbToks = 排程.解析指令集(inst, ids, rec.description, bonds);
if (!dbToks) { console.log('解析指令集失败'); process.exit(1); }
const dbDmg = 排程.重放(inst, ids, dbToks, bonds);
console.log(`\n① DB解重放=${dbDmg.toLocaleString()} (===recommend? ${dbDmg === DB真值}) dmg率=${(dbDmg / DB真值 * 100).toFixed(2)}%`);
const SdbAll = new Set();
for (let i = 0; i < 65; i++) if (dbToks[i].act === '궁') SdbAll.add((i / 5 | 0) + 1);
const Sdb = [...SdbAll].sort((a, b) => a - b);
console.log(`   DB解궁(齐射)回合集 Sdb={${Sdb.join(',')}}`);
if (Sdb.length >= 2) { const d0 = Sdb[1] - Sdb[0]; const 等差 = Sdb.every((v, i) => i === 0 || v - Sdb[i - 1] === d0); console.log(`   Sdb等差? ${等差} 公差T=${d0}`); }
// 名义 궁 cd
const cds = ids.map(id => { const f = 排程.特征.get(id); return f ? f.cd : '?'; });
console.log(`   队内名义궁cd=[${cds}] → 生产节拍族T只取这些值`);

// ② 生产全构造: Sdb 是否存在 + dmg 排名
console.log(`\n② 生产生成S族 全构造(含buff窗憋/准点两族)...`);
const 全 = 排程.窗对齐构造(inst, ids, bonds, { 全部: true });
const 键 = t => 排程.toks键(t);
const db键 = 键(dbToks);
// 找 S 命中 Sdb 的构造(不论toks是否=DB解)
const SdbKey = Sdb.join(',');
const 命中Sdb = 全.filter(c => [...new Set(c.S)].sort((a, b) => a - b).join(',') === SdbKey);
console.log(`   全构造数=${全.length}; S=${SdbKey} 的构造数=${命中Sdb.length}`);
if (命中Sdb.length) {
  const 最好 = 命中Sdb.reduce((a, b) => a.dmg > b.dmg ? a : b);
  const 排名 = 全.findIndex(c => c === 最好) + 1;
  console.log(`   ✓ Sdb 在族内! dmg最优=${最好.dmg.toLocaleString()} (${(最好.dmg / DB真值 * 100).toFixed(1)}%DB) 全局第${排名}/${全.length} 来源=${最好.来源}`);
} else {
  console.log(`   ✗ Sdb {${SdbKey}} 不在生产节拍/周期/联合/加扰四族内 → 证实根因: T=${Sdb.length >= 2 ? Sdb[1] - Sdb[0] : '?'}窗无法由名义cd=5的节拍族生成`);
  // 最接近Sdb的构造(前3)
  console.log('   全构造dmg前3:', 全.slice(0, 3).map(c => `S{${[...new Set(c.S)].sort((a,b)=>a-b).join(',')}}:${(c.dmg / DB真值 * 100).toFixed(1)}%`).join(' '));
}

// ③ 显式 S族={Sdb} 爬山(证 Task B 扩T后能救)
if (预算 > 0 && Sdb.length >= 2) {
  console.log(`\n③ 显式 S族={${SdbKey}} 爬山预算=${预算}...`);
  const 构 = 排程.窗对齐构造(inst, ids, bonds, { S族: [{ S: Sdb, 来源: '手工T' }], 爬山预算: 预算, 谷底试探: 8 });
  if (构) console.log(`   => 显式S族爬山真值=${构.dmg.toLocaleString()} (${(构.dmg / DB真值 * 100).toFixed(2)}%DB) 来源=${构.来源}`);
  else console.log('   显式S族构造返回null');
  // 参照: 直接从DB解toks爬山(应≈100%, DB解是局部极大)
  const h = 排程.爬山(inst, ids, dbToks, bonds, 预算, null, null, 8);
  console.log(`   参照 DB解toks直接爬山=${(h.dmg / DB真值 * 100).toFixed(2)}% (证DB解可达)`);
}
console.log('\n完成');
