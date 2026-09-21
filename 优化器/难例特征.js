'use strict';
/*
 * 难例特征提取器：从"静态角色数据(role/cd/ultMag/atkMag)"算出一支队伍的"回合同步画像"，
 * 用于给搜索做**闸门/路由**——判断该队是否属于"딜러궁需延迟到 buff 窗口齐射"的同步型难例，
 * 进而决定是否加大束宽/换更强填充策略（而非盲目全局加 sync 权重）。
 *
 * ⚠️ 判别力的诚实边界（8 队 benchmark 实证，见 session plan）：
 *   - 能判別：buff 富余队（딜궁数/buff窗口密度 ≤0.5，如후지카/신이카）→ sync 天然满足，易达 100%。
 *   - 部分判別：密度 ≈1.5（buff2+딜3, CD 相位对齐）是"疑似同步难例"区，但同区内 칼리버/얀코A=100%、
 *     얀코D=71.5% 静态特征逐位相同 → 静态特征能圈"疑似难例"，**无法在难例内部分级**；难度差源于
 *     setDefault 硬编码技能机制(叠层/定值/궁缩放)，不在任何静态字段。
 *   ⇒ 定位：这是"闸门"(要不要多花算力)，不是"银彈"(保证达最优)。
 *
 * 特征（全部静态可算）：
 *   buff궁数 / 딜伤害궁数 / 各自 CD 列表
 *   딜/buff 数比、딜궁数/buff窗口密度（窗口=13回合内某CD的궁可出手回合数之和）
 *   buff窗口覆盖回合集、딜러궁理想出手回合集 → 二者"对齐度"（딜러궁落在 buff 窗口内的比例）
 *   同步难度分（0~1，综合密度+对齐缺口，越高越像难例）
 */

// 该角色 궁 是否直伤型（ultMag 或 atkMag>0）；否则为 buff/辅助型 궁
function 是伤害궁(c) { return (c.ultMag > 0 || c.atkMag > 0); }

// 13 回合内某 CD 的궁"理想最早出手回合"集合：首次需充能 cd 回合，之后每 cd 回合一次
//   例 cd=3 → 回合 3,6,9,12；cd=4 → 4,8,12；cd=50 → 只 12（几乎不可用，视作长驻被动型 buff）
function 궁窗口回合(cd) {
  const out = [];
  let t = (cd >= 1 && cd <= 13) ? cd : 13;   // cd 异常大(如50) → 视作末回合才出手一次
  while (t <= 13) { out.push(t); t += (cd >= 1 ? cd : 13); }
  return out;
}

/*
 * 计算一支队伍（ids，站位序）的同步画像。
 * @param {Function} 取角色  (id) => 角色对象（含 role/cd/ultMag/atkMag）
 * @returns {{buff궁수, 딜伤害궁수, 딜数比, 密度, 对齐度, 同步难度, buffCDs, 딜CDs, 分级}}
 */
function 同步画像(ids, 取角色) {
  const cs = ids.map(取角色);
  const buffs = cs.filter(c => !是伤害궁(c));
  const 딜스 = cs.filter(c => 是伤害궁(c));

  // buff 窗口（所有 buff 角色궁可出手的回合，去重合并成"哪些回合有 buff"）
  const buff窗口集 = new Set();
  for (const c of buffs) for (const t of 궁窗口回合(c.cd)) buff窗口集.add(t);
  const buff窗口数 = buff窗口集.size;

  // 딜러궁理想出手回合（每个伤害딜러按其 CD）
  const 딜궁回合 = [];
  for (const c of 딜스) for (const t of 궁窗口回合(c.cd)) 딜궁回合.push(t);
  const 딜궁수 = 딜궁回合.length;

  // 对齐度：딜러궁落在 buff 窗口回合内的比例（高=buff 供给充足，딜러궁能吃到 buff）
  const 对齐 = 딜궁回合.filter(t => buff窗口集.has(t)).length;
  const 对齐度 = 딜궁수 ? 对齐 / 딜궁수 : 1;

  // 密度：딜러궁수 / buff窗口数（>1 = buff 窗口不够分，딜러궁要挤/延迟 → 同步难）
  const 密度 = buff窗口数 ? 딜궁수 / buff窗口数 : 딜궁수;
  const 딜数比 = buffs.length ? 딜스.length / buffs.length : 딜스.length;

  // 同步难度分（0~1）：密度越高、对齐缺口越大 → 越难。密度>2 封顶 1。
  const 密度项 = Math.min(1, Math.max(0, (密度 - 0.5) / 1.5));
  const 对齐缺口项 = 1 - 对齐度;
  const 同步难度 = Math.min(1, 0.6 * 密度项 + 0.4 * 对齐缺口项);

  // 分级（闸门用）：'易'(buff富余) / '疑'(疑似同步难例) / '离群'(极端，如승나미 buff cd异常)
  let 分级;
  if (密度 <= 0.6 && 딜스.length <= 1) 分级 = '易';
  else if (同步难度 >= 0.7 || buffs.some(c => c.cd > 13 || c.cd < 3)) 分级 = '离群';
  else if (딜스.length >= 3) 分级 = '疑';
  else 分级 = '中';

  return {
    buff궁수: buffs.length, 딜伤害궁수: 딜스.length, 딜数比: +딜数比.toFixed(2),
    密度: +密度.toFixed(2), buff窗口数, 딜궁수, 对齐度: +对齐度.toFixed(2),
    同步难度: +同步难度.toFixed(2),
    buffCDs: buffs.map(c => c.cd), 딜CDs: 딜스.map(c => c.cd), 分级,
  };
}

module.exports = { 同步画像, 是伤害궁, 궁窗口回合 };
