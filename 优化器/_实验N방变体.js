// Task B验证: 实测 방优先填充变体 vs 평优先变体 对 94.85队(Sdb={5,9,13}) 的效果
//   出 loop 已加 [평优先,방优先]×[憋,준] 四变体; 用 {S族:[Sdb],全部:true} 取全构造, 各爬山对比。
//   判据: 방变体构造或爬山 dmg > 평变体(94.85%) 才算有效修复, 否则回退。
'use strict';
const 适配器 = require('./引擎适配.js');
const 排程 = require('./排程器.js');
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const 原始 = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(path.resolve(__dirname, '..'), '../tenkaassist_data/data/data.json'))).toString('utf8'));
const ids = [10197, 10152, 10096, 10177, 10163];
const bonds = [5, 5, 5, 5, 5];
const inst = 适配器.createEngine();
const rec = 原始.find(x => (x.compstr || '').trim().split(/\s+/).map(Number).sort((a, b) => a - b).join(' ') === [...ids].sort((a, b) => a - b).join(' '));
const DB真值 = Number(rec.recommend);
const dbToks = 排程.解析指令集(inst, ids, rec.description, bonds);
const Sdb = [...new Set(Array.from({ length: 65 }, (_, i) => i).filter(i => dbToks[i].act === '궁').map(i => (i / 5 | 0) + 1))].sort((a, b) => a - b);
console.log(`DB=${DB真值.toLocaleString()} Sdb={${Sdb.join(',')}} (全员궁齐射窗)`);
console.log('== 四变体 构造→爬山 对比 (S族仅注入Sdb,全部:true取全构造) ==');
const t0 = Date.now();
const 变体 = 排程.窗对齐构造(inst, ids, bonds, { S族: [{ S: Sdb, 来源: 'T4t0=5' }], 全部: true });
console.log(`全构造数=${变体.length} (构造耗时${((Date.now() - t0) / 1000).toFixed(1)}s)`);
for (const v of 变体) {
  const th = Date.now();
  const h = 排程.爬山(inst, ids, v.toks, bonds, 60000, null, null, 8);
  console.log(`  ${v.来源}${v.buff窗 ? '[憋]' : '[준]'}: 构造=${(v.dmg / DB真值 * 100).toFixed(1)}% → 爬山=${(h.dmg / DB真值 * 100).toFixed(2)}%  (${((Date.now() - th) / 1000).toFixed(0)}s)`);
}
const hdb = 排程.爬山(inst, ids, dbToks, bonds, 30000, null, null, 8);
console.log(`  [参照]DB解直接爬山=${(hdb.dmg / DB真值 * 100).toFixed(2)}%`);
console.log('完成');
