'use strict';
/*
 * 临时分析：从机制表（生成/*.json 可读 DSL）为全部 191 角色提取"防守/大招"机制特征。
 *
 * 防守特征（决定该角色 방 是否可能有正收益）：
 *   - 방触发buff：任何 buff 指令的 参数含 "방"（div/type/act 位，如 atbf(…,"방",…)/buff(…,"방발동*"…)/anbf(…,"방",…)）
 *   - 행동触发buff：参数含 "행동"（防守属于行动也会触发）
 *   - 피격触发buff：参数含 "피격"（防守不减伤也不吃伤——打桩环境无 boss 反击，피격 与防守无关，仅记录）
 *   - defense钩子非默认：钩子.defense 存在且不是单纯 {actDefense:true}（角色自定义防守逻辑）
 * 大招特征（决定"全就绪必全员开大"是否成立）：
 *   - 伤害궁：ultMag>0||atkMag>0（characterJson 静态字段，沿用排程器口径）
 *   - 궁直伤指令：ultimate/ultbefore 钩子内出现 直伤证据难以静态判定 → 用 nbf/atbf/anbf/ptbf 的 "궁" act 位近似（궁触发 buff=大招给队友挂 buff，仍属"开大有收益"）；关键区分是 **大招完全无对外作用**（治疗/护盾型）
 *   - 治疗/护盾궁：钩子内出现 heal/heal2/heal3/"힐"/"아머"/"받속뎀" 等防守向 buff 且无伤害向 buff
 * 输出：_防守特征表.json（id→特征），供动态实验引用。
 */
const fs = require('fs');
const path = require('path');
const 生成目录 = path.join(__dirname, '机制表', '生成');
const 适配 = require('./引擎适配.js');
const 静态 = new Map();
for (const c of 适配.角色表()) if (c && c.id != null) 静态.set(c.id, c);

const 伤害向类型 = new Set(['공퍼증', '일뎀증', '가뎀증', '궁뎀증', '발효증', '평추가*', '궁추가*', '공발동*', '궁발동*', '평발동*', '방발동*', '공격+', '받아증', '받는피해증가', '약점', '공고증', '받뎀증', '받속뎀', '받궁뎀', '일폭뎀', '평타추가', '추가', '행동']);
function 扫指令列(列, 出) {
  for (const s of (列 || [])) {
    if (!s || typeof s !== 'object') continue;
    // buff 族：具名形 tbf / 定位形 buff 数组
    const 串列 = [];
    const 收串 = v => {
      if (typeof v === 'string') 串列.push(v);
      else if (Array.isArray(v)) v.forEach(收串);
      else if (v && typeof v === 'object') { for (const k of Object.keys(v)) if (k !== '注释') 收串(v[k]); }
    };
    for (const key of ['tbf', 'nbf', 'anbf', 'atbf', 'ptbf', 'pnbf', 'buff', 'setBuffOn', 'setBuffOnAll', 'setBuffOnExtra', 'setBuffSize', 'setBuffSizeAll', 'setBuffNest', 'setBuffSizeUp', 'deleteBuff', 'keepOnlyLastBuff']) {
      if (s[key] !== undefined) 收串(s[key]);
      if (s.type !== undefined && key === 'tbf') 收串(s.type);
      if (s.div !== undefined && ['setBuffOn', 'setBuffOnAll', 'setBuffOnExtra', 'setBuffSize', 'setBuffSizeAll', 'setBuffNest', 'setBuffSizeUp', 'deleteBuff', 'keepOnlyLastBuff'].includes(key)) 收串(s.div);
    }
    for (const 串 of 串列) {
      if (串 === '방' || 串.endsWith('방발동*') || 串.includes('방발동')) 出.bang触发 = true;
      if (串 === '방' && (s.tbf !== undefined || s.type === '방')) 出.bang触发 = true;
      if (串 === '행동') 出.haengdong触发 = true;
      if (串 === '피격') 出.pigyeok触发 = true;
      if (伤害向类型.has(串)) 出.伤害向buff = true;
      if (['힐', '아머', '보호막', '치유'].some(x => 串.includes(x)) || 串 === '힐') 出.治疗护盾向 = true;
    }
    if (s.heal || s.heal2 || s.heal3) 出.治疗护盾向 = true;
    // 递归 if/for/lib 块
    if (s.then) 扫指令列(s.then, 出);
    if (s.else) 扫指令列(s.else, 出);
    if (s.elif) for (const e of s.elif) 扫指令列([e], 出);
    if (s.body) 扫指令列(s.body, 出);
    if (s.lib !== undefined && s.then) 扫指令列(s.then, 出);
    if (s.inject) { const inj = s.inject; 扫指令列(inj.快照, 出); 扫指令列(inj.前置, 出); 扫指令列(inj.后置, 出); }
  }
}

const 结果 = {};
const 文件 = fs.readdirSync(生成目录).filter(f => /^\d+\.json$/.test(f));
for (const f of 文件) {
  const 表 = JSON.parse(fs.readFileSync(path.join(生成目录, f), 'utf8'));
  const id = 表.id;
  const 出 = { id, bang触发: false, haengdong触发: false, pigyeok触发: false, 伤害向buff: false, 治疗护盾向: false, defense非默认: false };
  for (const 钩名 of Object.keys(表.钩子 || {})) 扫指令列(表.钩子[钩名], 出);
  // defense 钩子非默认骨架（{actDefense:true} 单指令=默认）
  const d = (表.钩子 || {}).defense;
  if (d && !(d.length === 1 && d[0].actDefense === true)) 出.defense非默认 = true;
  const st = 静态.get(id) || {};
  出.role = st.role; 出.ultMag = st.ultMag || 0; 出.atkMag = st.atkMag || 0; 出.atk = st.atk || 0;
  出.伤害궁 = 出.ultMag > 0 || 出.atkMag > 0;
  结果[id] = 出;
}
fs.writeFileSync(path.join(__dirname, '_防守特征表.json'), JSON.stringify(结果, null, 1));
// 摘要
const ids = Object.keys(结果).map(Number);
const 计 = k => ids.filter(i => 结果[i][k]).length;
console.log(`角色数=${ids.length}`);
console.log(`방触发buff角色=${计('bang触发')}  행동触发=${计('haengdong触发')}  defense非默认=${计('defense非默认')}`);
console.log(`伤害궁=${计('伤害궁')}  buff궁(非伤害)=${ids.filter(i => !结果[i].伤害궁).length}`);
const 无任何防守机制 = ids.filter(i => !结果[i].bang触发 && !结果[i].haengdong触发 && !结果[i].defense非默认);
console.log(`无任何防守机制角色数=${无任何防守机制.length}`);
console.log('방触发角色清单:', ids.filter(i => 结果[i].bang触发).join(','));
