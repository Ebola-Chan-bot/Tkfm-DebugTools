'use strict';
/*
 * 临时分析4：CD操纵危险性精确分级 + 방剪枝名单精算。
 *
 * 引擎事实（deobfuscated.js）：
 *   - curCd<=0 = 궁就绪（legalActs L194）；nextTurn 每人 curCd-1（除非 stopCd，L304）。
 *   - cdChange(u,n)（L820）：n>0=升CD（就绪→非就绪，危险），n<0=降CD（非就绪→就绪，无害）。
 *   - addCurCd: curCd+=N；setCurCd: curCd=值（绝对，可能升）；stopCd旗标=冻结减CD（相对升，危险）。
 *   - clampCurCd/clampCurCdToCd: 钳制（可能升也可能降，保守归危险）。
 *
 * 「能让已就绪变非就绪」的危险通道（升向）：
 *   cdChange值>0 | addCurCd>0 | addCd>0(影响下次) | setCurCd(绝对,除非显式<=0) | setCd | clampCurCd | clampCurCdToCd | stopCd旗标(StopCd,非StopCdOff)
 * 无害（只降）：cdChange值<0 | addCurCd<0 | addCd<0 | StopCdOff | NoCdChange | CanCdOn
 *
 * 输出：
 *   1. 危险升CD角色名单（就绪回合必궁剪枝的例外集合）
 *   2. 방剪枝角色名单（无任何防守机制）+ 队级覆盖率
 *   3. 성야네덱 방使用者归因：队内谁给无방机制队友挂了방响应buff
 */
const fs = require('fs');
const path = require('path');
const 生成目录 = path.join(__dirname, '机制表', '生成');
const 特征表 = JSON.parse(fs.readFileSync(path.join(__dirname, '_防守特征表.json'), 'utf8'));

const 승CD = {};   // id → [证据串]
const 危险角色 = new Set();
const 파일 = fs.readdirSync(生成目录).filter(f => /^\d+\.json$/.test(f));


function 숫자(v) { return typeof v === 'number' ? v : null; }
function 기록(id, s) { (승CD[id] = 승CD[id] || []).push(s); 危险角色.add(id); }

function 정령(列, id) {
  for (const s of (列 || [])) {
    if (!s || typeof s !== 'object') continue;
    // cdChange{值:N}
    if (s.cdChange !== undefined) {
      const n = 숫자(s.值);
      if (n !== null && n > 0) 기록(id, `cdChange(${s.cdChange},+${n})`);
      else if (n === null) 기록(id, `cdChange(${s.cdChange},值=${JSON.stringify(s.值).slice(0,40)}动态)`);
    }
    // addCurCd / addCd：可能 数值 或 {N:}
    for (const 键 of ['addCurCd', 'addCd']) {
      if (s[键] !== undefined) {
        let n = 숫자(s[键]);
        if (n === null && s[键] && typeof s[键] === 'object') n = 숫자(s[键].N);
        if (n !== null && n > 0) 기록(id, `${键}(+${n})`);
        else if (n === null) 기록(id, `${键}(${JSON.stringify(s[键]).slice(0,40)}?)`);
      }
    }
    // setCurCd / setCd：绝对赋值，除非确认<=0否则保守记危险
    for (const 键 of ['setCurCd', 'setCd']) {
      if (s[键] !== undefined) {
        const n = 숫자(s[键]);
        if (n !== null && n <= 0) { /* 安全，置0/负=就绪 */ }
        else 기록(id, `${键}(${JSON.stringify(s[键]).slice(0,30)})绝对`);
      }
    }
    // clamp 系：钳制方向不定，保守记危险
    for (const 键 of ['clampCurCd', 'clampCurCdToCd']) {
      if (s[键] !== undefined) 기록(id, `${键}(钳制)`);
    }
    // stopCd 旗标（SetFlag StopCd=冻结减CD=相对升；StopCdOff/NoCdChange/CanCdOn=放开=无害）
    if (s.flag !== undefined) {
      const fl = String(s.flag);
      if (fl === 'StopCd') 기록(id, 'flag:StopCd(冻结减CD)');
    }
    if (s.then) 정령(s.then, id);
    if (s.else) 정령(s.else, id);
    if (s.elif) for (const e of s.elif) 정령([e], id);
    if (s.body) 정령(s.body, id);
    if (s.inject) { const i = s.inject; 정령(i.快照, id); 정령(i.前置, id); 정령(i.后置, id); }
  }
}
for (const f of 파일) {
  const 表 = JSON.parse(fs.readFileSync(path.join(生成目录, f), 'utf8'));
  const id = 表.id;
  for (const 钩名 of Object.keys(表.钩子 || {})) 정령(表.钩子[钩名], id);
}

const 위험昇 = [...危险角色].sort((a, b) => a - b);
console.log(`===== 危险升CD角色（就绪→非就绪能力）：${위험昇.length} 个 =====`);
console.log(위험昇.join(','));
console.log('\n明细：');
for (const id of 위험昇) console.log(`  ${id}: ${승CD[id].join(' | ')}`);

// 방剪枝名单（无任何防守机制）
const 有防守机制 = new Set(Object.keys(特征表).filter(k => { const f = 特征表[k]; return f.bang触发 || f.haengdong触发 || f.defense非默认; }).map(Number));
const 无防守机制 = Object.keys(特征表).map(Number).filter(i => !有防守机制.has(i)).sort((a, b) => a - b);
console.log(`\n===== 방剪枝名单 =====`);
console.log(`有防守机制=${有防守机制.size} 无防守机制=${无防守机制.length}`);

// 두 명단 교집합 통계（升CD 与 有防守机制 的关系）
const 交 = 위험昇.filter(i => 有防守机制.has(i));
console.log(`\n升CD角色中同时有防守机制=${交.length}/${위험昇.length}: ${交.join(',')}`);
console.log(`升CD角色中无防守机制=${위험昇.length - 交.length}: ${위험昇.filter(i => !有防守机制.has(i)).join(',')}`);

// 성야네덱 방-buff 授予者归因
console.log('\n===== 성야네덱[10160,10152,10125,10133,10171] 방收益归因 =====');
const 방授予扫描 = JSON.parse(fs.readFileSync(path.join(__dirname, '_방CD扫描.json'), 'utf8')).방授予;
for (const 成员 of [10160, 10152, 10125, 10133, 10171]) {
  const f = 特征表[成员];
  console.log(`  ${成员}: 防守机制=${!!有防守机制.has(成员)} bang=${f.bang触发} 授予他人방buff=${!!(방授予扫描[成员] && 방授予扫描[成员].some(r => r.给他人))}`);
  if (방授予扫描[成员]) for (const r of 방授予扫描[成员]) console.log(`      방buff: tgt=${r.tgt}${r.给他人 ? '【给他人!】' : ''} ${r.片段}`);
}

fs.writeFileSync(path.join(__dirname, '_剪枝名单.json'), JSON.stringify({ 危险升CD: 위험昇, 有防守机制: [...有防守机制], 无防守机制 }, null, 1));
console.log('\n已写 _剪枝名单.json');
