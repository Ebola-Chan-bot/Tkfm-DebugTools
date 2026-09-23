'use strict';
/*
 * 临时诊断F：两支 88% 队（29.90G/29.58G）的内层缺口定位。
 * 三步：
 *   ① 按 benchmark 同款选队逻辑列 8 队 ids/recommend（纠正此前"同名单"误记，确认两队真实构成）；
 *   ② DB 排程逐回合结构：딜궁出手回合 vs buff궁出手回合的时序关系（sync 判据的适用性）；
 *   ③ 束搜索+诊断影子跟踪：DB 前缀死亡层、该层 db评分 vs top/width线、低估率。
 * 状态继承 bug 已修（规则快填 扫前缀本回合 buff궁），승나미 84.43→97.96%；两队仍 88% 纹丝不动，
 * 说明其瓶颈另有其因——本脚本找出来。
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
console.log('===== ① benchmark 8 队（按 recommend 降序）=====');
队.forEach((d, i) => console.log(`  [${i}] ${d.ids.join(',')}  DB=${d.recommend.toLocaleString()}`));

// 两支 88% 队：recommend = 29,902,664,856 / 29,581,413,492
const 목표 = 队.filter(d => d.recommend === 29902664856 || d.recommend === 29581413492);
const inst = 适配.createEngine();
const getCharacter = 适配.角色数据().getCharacter;
const 손  = id => { const c = getCharacter(id); return c && (c.ultMag > 0 || c.atkMag > 0); };
const 역 = id => { const c = getCharacter(id); return c ? c.role : -1; };

for (const d of 목표) {
  console.log(`\n\n########## ${d.ids.join(',')}  DB=${d.recommend.toLocaleString()} ##########`);
  const 목표toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
  const 真값 = 排程器.重放(inst, d.ids, 목표toks, BOND);
  // 角色构成
  console.log('---- ② 构成与 DB 排程结构 ----');
  console.log('角色: ' + d.ids.map((id, i) => `位${i + 1}=${id}(role${역(id)}${손(id) ? ',伤害궁,cd' + getCharacter(id).cd : ',buff궁,cd' + getCharacter(id).cd})`).join(' '));
  console.log('DB 逐回合:');
  for (let t = 0; t < 13; t++) {
    const 片 = [];
    for (let k = 0; k < 5; k++) { const tk = 목표toks[t * 5 + k]; 片.push(`位${tk.idx + 1}${tk.act}`); }
    // 标注：딜궁出手回合 是否有 buff궁 先行；딜궁在 buff궁 之前的违例
    const seq = [];
    for (let k = 0; k < 5; k++) { const tk = 목표toks[t * 5 + k]; if (tk.act === '궁') seq.push(손(d.ids[tk.idx]) ? 'D' : 'B'); }
    let 위배 = false, 첫B = -1;
    seq.forEach((x, i) => { if (x === 'B' && 첫B < 0) 첫B = i; });
    seq.forEach((x, i) => { if (x === 'D' && 첫B >= 0 && i < 첫B) 위배 = true; if (x === 'D' && 첫B < 0) 위배 = true; });
    const 마크 = seq.length ? ('  궁열=' + seq.join('') + (위배 ? ' ⚠딜궁先于buff궁/无buff' : '')) : '';
    console.log(`  t${t + 1}: ${片.join(' ')}${마크}`);
  }

  // ③ 束搜索 + 诊断（w10 sync，与 benchmark 同口径）
  console.log('---- ③ DB 前缀存活诊断（w10 sync）----');
  const r = 排程器.束搜索(inst, d.ids, BOND, {
    width: 10, R: 4, 评分: 'sync', 时限秒: 600,
    诊断: { 目标toks: 목표toks, 真值: 真값 },
  });
  console.log(`束 = ${r.dmg.toLocaleString()} (${(r.dmg / 真값 * 100).toFixed(2)}%)`);
  let 死层 = -1;
  const 轮廓 = [];
  for (const row of r.诊断报告) {
    if (row.db排名 < 0) { if (死层 < 0) 死层 = row.s; 轮廓.push('✂'); }
    else 轮廓.push(row.存活 ? String(row.db排名) : `[${row.db排名}]`);
  }
  console.log('排名轨迹(前24层): ' + 轮廓.slice(0, 24).join(' '));
  if (死层 >= 0) {
    // 死亡层前一层与死亡层的细节
    for (const row of r.诊断报告) {
      if (row.s < 死层 - 2 || row.s > 死层) continue;
      if (row.db排名 < 0) { console.log(`s${row.s}: 前缀未生成(父已死)`); continue; }
      const tk = 목표toks[row.s];
      console.log(`s${row.s} (t${((row.s / 5) | 0) + 1}.${row.s % 5 + 1}, DB动作=位${tk.idx + 1}${tk.act}${손(d.ids[tk.idx]) && tk.act === '궁' ? '=딜궁' : (tk.act === '궁' ? '=buff궁' : '')}): db排名=${row.db排名} db评分=${(row.db评分 / 1e9).toFixed(3)}G top=${(row.top评分 / 1e9).toFixed(3)}G width线=${(row.width线评分 / 1e9).toFixed(3)}G 低估率=${(row.db评分 / 真값 * 100).toFixed(1)}%`);
    }
  } else console.log('DB 前缀全程存活');
}
