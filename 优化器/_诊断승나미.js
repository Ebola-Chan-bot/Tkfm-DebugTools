'use strict';
/*
 * 临时诊断：승나미덱 束搜索（sync 评分）下 DB 最优前缀在哪一层跌出 beam。
 * 用 排程器.束搜索 的 设置.诊断 影子跟踪（只读，不改搜索行为）：
 *   逐层输出 db排名/db评分/top评分/width线评分 → 定位误剪层与低估幅度。
 * 实验B2 教训：딜궁就位(通道任一>0) 对승나미恒真（被动/boss减益常驻渠道值），
 * 状态分支无判别力，必须靠诊断数据驱动条件化判据设计。
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const 适配 = require(path.join(__dirname, '引擎适配.js'));
const 排程器 = require(path.join(__dirname, '排程器.js'));

const BOND = [5, 5, 5, 5, 5];
const DATA_JSON = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');

// 定位 승나미덱（与 内层benchmark 选队同款：recommend 降序第 7 支 bit 级复现队）
const 特例ID = new Set([10162, 10205]);
function 找승나미() {
  const arr = JSON.parse(zlib.gunzipSync(fs.readFileSync(DATA_JSON)).toString());
  const getCharacter = 适配.角色数据().getCharacter;
  const 可模拟 = id => { const c = getCharacter(id); return c && c.ok === true && c.rarity === 3 && c.hp && c.atk; };
  const 名单 = new Map();
  for (const d of arr) {
    if (!(d.recommend > 0) || !d.description || !d.description.includes('턴')) continue;
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    if (ids.length !== 5 || ids.some(id => !id || !可模拟(id) || 特例ID.has(id))) continue;
    const 键 = ids.join(',');
    const 旧 = 名单.get(键);
    if (!旧 || d.recommend > 旧.recommend) 名单.set(键, { 队: d.name, ids, description: d.description, recommend: d.recommend });
  }
  // 部分条目无 name 字段 → 直接按 benchmark 选出的 승나미덱 ids 定位
  return [...名单.values()].find(d => d.ids.join(',') === '10177,10060,10211,10208,10197')
    || [...名单.values()].filter(d => d.ids[0] === 10177).sort((a, b) => b.recommend - a.recommend)[0];
}

const d = 找승나미();
console.log('승나미:', d.ids.join(','), 'recommend =', d.recommend.toLocaleString());
const inst = 适配.createEngine();
const 목표toks = 排程器.解析指令集(inst, d.ids, d.description, BOND);
const 真값 = 排程器.重放(inst, d.ids, 목표toks, BOND);
console.log('DB toks 重放 =', 真값.toLocaleString(), 真값 === d.recommend ? '(bit级复现✅)' : '(⚠️不一致)');

// 每回合 DB 的动作结构（分析딜궁时序：哪几回合放궁、前面有没有 buff궁）
console.log('\n---- DB 排程逐回合 ----');
const 역할 = id => { const c = 适配.角色数据().getCharacter(id); return c ? c.role : '?'; };
const 손상궁 = id => { const c = 适配.角色数据().getCharacter(id); return c && (c.ultMag > 0 || c.atkMag > 0); };
for (let t = 0; t < 13; t++) {
  const 片 = [];
  for (let k = 0; k < 5; k++) {
    const tk = 목표toks[t * 5 + k];
    const r = 역할(d.ids[tk.idx]);
    片.push(`位${tk.idx + 1}(${r})${tk.act}`);
  }
  console.log(`t${t + 1}: ` + 片.join(' '));
}
console.log('딜러伤害궁角色:', d.ids.map((id, i) => 손상궁(id) && 역할(id) === 0 ? `位${i + 1}=${id}` : null).filter(Boolean).join(' '));
console.log('buff궁角色:', d.ids.map((id, i) => !손상궁(id) ? `位${i + 1}=${id}(role${역할(id)})` : null).filter(Boolean).join(' '));

// 束搜索 + 诊断
console.log('\n---- 束搜索(w=10, sync) 诊断 ----');
const r = 排程器.束搜索(inst, d.ids, BOND, {
  width: 10, R: 4, 评分: 'sync', 时限秒: 600,
  诊断: { 目标toks: 목표toks, 真值: 真값 },
});
console.log('束结果 dmg =', r.dmg.toLocaleString(), `(${(r.dmg / 真값 * 100).toFixed(2)}%)  扩展=${r.扩展数} 深度=${r.深度}`);
console.log('\ns层\tdb排名\t存活\ttop评分\tdb评分\twidth线\t低估率');
for (const row of r.诊断报告) {
  if (row.db排名 < 0) continue;   // 父已被剪的层后面全是 -1
  const 低估 = row.top评分 > 0 ? (row.db评分 / row.top评分 * 100).toFixed(1) + '%' : '-';
  console.log(`s${row.s}\t${row.db排名}\t${row.存活 ? '✓' : '✂剪'}\t${(row.top评分 / 1e9).toFixed(2)}G\t${(row.db评分 / 1e9).toFixed(2)}G\t${(row.width선评分 / 1e9).toFixed(2)}G\t${低估}`);
}
const 首个被剪 = r.诊断报告.find(x => x.db排名 > 0 && !x.存活);
if (首个被剪) {
  console.log(`\n首个误剪层: s=${首个被剪.s} (第${首个被剪.s + 1}步, 回合${((首个被剪.s / 5) | 0) + 1}第${首个被剪.s % 5 + 1}动)`);
  console.log(`该步 DB 动作: 位${목표toks[首个被剪.s].idx + 1}${목표toks[首个被剪.s].act}`);
  console.log(`db评分 ${(首个被剪.db评分 / 1e9).toFixed(2)}G vs width线 ${(首个被剪.width선评分 / 1e9).toFixed(2)}G vs 真值 ${(真값 / 1e9).toFixed(2)}G → 填充续航低估至真值的 ${(首个被剪.db评分 / 真값 * 100).toFixed(1)}%`);
} else {
  console.log('\nDB 前缀全程存活（误剪不成立，瓶颈在最终精修）');
}
