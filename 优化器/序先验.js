'use strict';
/*
 * 序先验：回合内"딜러伤害궁出手先后"的静态强度分（从 DB 挖掘，角色 id → 分数，越大越该先出手）
 *
 * 挖掘与验证（%TEMP%\序先验挖掘.js，data.json 名单键去重后 58,234 条 DB 最优排程，
 * 取"同回合内 ≥2 个딜러伤害궁"的 149,264 个回合作样本，方法 = 成对胜负 Zermelo/Bradley-Terry 强度分）：
 *
 *   路线                        序完全一致   首位命中   逆序对率
 *   原规则(atk·ultMag 降序)        25.4%      31.1%      59.3%   ← ≈随机（0.5 为纯随机）
 *   Copeland 加权胜率-全体         71.9%      79.0%      14.4%
 *   Zermelo-全体                 72.3%      79.5%      14.2%   ← 采用
 *   Zermelo-按有大/无大分类         72.4%      79.6%      14.1%   ← 分类无增益(+0.1pp)，故用单一全序表
 *
 * 【重要结论】按"有大回合(该回合有 buff궁)/无大回合"分类分表**几乎没有增益**（72.4% vs 72.3%，
 *   共同 pair 里"常先者相同"84.7%）——顺序主要由角色自身的伤害机制决定，与当回合是否已铺 buff 无关。
 *   故默认只用 '全体' 单表：更简单、覆盖角色更全（分类表因样本摊薄，长尾角色更容易缺值）。
 *   分类表仍保留在数据里，供后续实验（序分(id,'有大')）。
 *
 * 【定位】这是**软优先级**，不是剪枝：只改同档内的 tie-break 次序，不增删任何动作档位，
 *   搜索空间与渐近完备性完全不变。作用是"把更可能是优解的候选排在前面搜"，
 *   使受限时间/预算下命中率更高（无限时间下仍会搜到其余全部）。
 */
const fs = require('fs');
const path = require('path');

const 数据文件 = path.join(__dirname, '序先验数据.json');

let _已载 = false;
let _全体 = new Map();        // id → 分数
const _分类 = { 有大: new Map(), 无大: new Map() };
let _元 = null;

function 装载() {
  if (_已载) return _全体;
  _已载 = true;
  try {
    const j = JSON.parse(fs.readFileSync(数据文件, 'utf8'));
    for (const [id, v] of Object.entries(j.类.全体)) _全体.set(Number(id), v);
    for (const 类 of ['有大', '无大']) {
      const src = (j.类 && j.类[类]) || {};
      for (const [id, v] of Object.entries(src)) _分类[类].set(Number(id), v);
    }
    _元 = j;
  } catch (e) {
    // 数据文件缺失/损坏 → 空表，序分() 返回 null，调用方回落既有规则（不影响可用性）
    _全体 = new Map(); _分类.有大 = new Map(); _分类.无大 = new Map();
  }
  return _全体;
}

/*
 * 取某角色的序先验分；无数据返回 null（调用方须回落旧规则）。
 * @param {number} id 角色 id
 * @param {'全体'|'有大'|'无大'} [类] 默认 '全体'（分类无增益，见文件头）
 */
function 序分(id, 类) {
  装载();
  if (id == null) return null;
  if (类 !== undefined && 类 !== '全体') {
    const v = _分类[类] && _分类[类].get(id);
    if (v != null) return v;
  }
  const v = _全体.get(id);
  return v == null ? null : v;
}

/*
 * 饱和归一化：把 Zermelo 强度分 v(>0，量级跨度大，如신란≈16.7、얀코≈0.01) 单调压到 [0,1)。
 *   sat(v) = v/(v+1)。单调于 v ⇒ 排序完全保留；供排程器嵌入"伤害궁档内 tie-break"用
 *   （档 = [1e6, 2e6)，取 1e6 + sat·9e5 严格 < buff궁档 2e6，绝不越档）。
 * @returns {number|null} 无数据返回 null（调用方回落既有规则）
 */
function 饱和(id, 类) {
  const v = 序分(id, 类);
  return v == null ? null : v / (v + 1);
}

// 表规模 / 挖掘元信息（自检与日志用）
function 信息() {
  装载();
  return { 全体: _全体.size, 有大: _分类.有大.size, 无大: _分类.无大.size, 元: _元 };
}

module.exports = { 装载, 序分, 饱和, 信息 };
