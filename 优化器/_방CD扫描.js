'use strict';
/*
 * 临时分析3：방-buff 授予流向扫描。
 * 问题：无防守机制角色的방为什么可能有收益？——可能是名单内角色给**他人**挂了响应"방"的 buff
 *   （角色 X 挂 buff type=방발동·/div含방 给队友 Y → Y 防守时触发）。
 * 扫描机制表中每个 buff 类指令的 [目标, 是否含방串]：
 *   - 目标只含 self → 방响应局限于本人（队级剪枝规则成立的前提）
 *   - 目标含 $i/boss以外队友/全队 → 방-buff可授他人 → 角色级剪枝(非名单角色剪방)不安全
 * 另：扫描各角色 curCd 操纵指令明细（cdChange 值正负/addCurCd/setCurCd/setCd），产出 CD操纵名单（分升/降两向）。
 */
const fs = require('fs');
const path = require('path');
const 生成目录 = path.join(__dirname, '机制表', '生成');

const buff键 = new Set(['tbf', 'nbf', 'anbf', 'atbf', 'ptbf', 'pnbf']);
const 방授予 = {};  // id → [{键, 目标串, 片段}]
const CD操纵 = {};  // id → [{字段, 目标, 值, 方向}]
const 파일 = fs.readdirSync(生成目录).filter(f => /^\d+\.json$/.test(f));

function 目标串(v) {
  // buff 族目标 = 数组首元素或 具名形的 tbf 字段值
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return JSON.stringify(v && v[0]);
}
function 含방串(v) {
  const 串 = [];
  (function 收(x) {
    if (typeof x === 'string') 串.push(x);
    else if (Array.isArray(x)) x.forEach(收);
    else if (x && typeof x === 'object') for (const k of Object.keys(x)) if (k !== '注释') 收(x[k]);
  })(v);
  return 串.some(s => s === '방' || s.includes('방발동') || s === '방추가' || s.includes('방뎀') || s === '방' );
}

function 扫指令(列, 角色, ctx) {
  for (const s of (列 || [])) {
    if (!s || typeof s !== 'object') continue;
    for (const 键 of buff键) {
      if (s[键] !== undefined) {
        const v = s[键];
        const 串含방 = 键 === 'tbf' ? (typeof s.type === 'string' && (s.type === '방' || s.type.includes('방발동') || s.type.includes('방뎀') || s.type.includes('방추가'))) : 含방串(v);
        if (串含방) {
          const tgt = 键 === 'tbf' ? String(s.tbf) : 目标串(v);
          const 给他人 = tgt !== 'self' && tgt !== '"self"';
          (방授予[角色.id] = 방授予[角色.id] || []).push({ 键, tgt, 给他人, 片段: JSON.stringify(v).replace(/\s+/g, '').slice(0, 160) });
        }
      }
    }
    // setBuffOn 族也可能开关 방-buff（on=true 挂起）
    for (const 键 of ['setBuffOn', 'setBuffOnAll', 'setBuffOnExtra']) {
      if (s[键] !== undefined) {
        const 이름 = String(s.name || '');
        const div = String(s.div || '');
        if (이름.includes('방') || div.includes('방')) {
          (방授予[角色.id] = 방授予[角色.id] || []).push({ 键, tgt: String(s[键]), 给他人: s[键] !== 'self', 片段: JSON.stringify(s).replace(/\s+/g, '').slice(0, 160) });
        }
      }
    }
    // CD 操纵
    if (s.cdChange !== undefined) {
      const 值 = s.值;
      const 向 = typeof 值 === 'number' ? (值 > 0 ? '升' : 值 < 0 ? '降' : '零') : JSON.stringify(值).slice(0, 40);
      (CD操纵[角色.id] = CD操纵[角色.id] || []).push({ 字段: 'cdChange', tgt: String(s.cdChange), 值, 向 });
    }
    for (const 键 of ['addCurCd', 'setCurCd', 'setCd', 'addCd', 'clampCurCd', 'clampCurCdToCd']) {
      if (s[键] !== undefined) {
        (CD操纵[角色.id] = CD操纵[角色.id] || []).push({ 字段: 键, tgt: String(s[键].tgt ?? s.tgt ?? '?'), 值: JSON.stringify(s[键]).slice(0, 80), 向: '待定' });
      }
    }
    if (s.flag !== undefined && /Cd/.test(String(s.flag))) {
      (CD操纵[角色.id] = CD操纵[角色.id] || []).push({ 字段: 'flag:' + s.flag, tgt: '', 值: '', 向: '旗标' });
    }
    if (s.then) 扫指令(s.then, 角色, ctx);
    if (s.else) 扫指令(s.else, 角色, ctx);
    if (s.elif) for (const e of s.elif) 扫指令([e], 角色, ctx);
    if (s.body) 扫指令(s.body, 角色, ctx);
    if (s.inject) { const inj = s.inject; 扫指令(inj.快照, 角色, ctx); 扫指令(inj.前置, 角色, ctx); 扫指令(inj.后置, 角色, ctx); }
  }
}

for (const f of 파일) {
  const 表 = JSON.parse(fs.readFileSync(path.join(生成目录, f), 'utf8'));
  for (const 钩名 of Object.keys(表.钩子 || {})) 扫指令(表.钩子[钩名], 表, 钩名);
}

console.log('===== 방-buff 授予扫描 =====');
let 授他방 = 0;
for (const id of Object.keys(방授予).map(Number).sort((a, b) => a - b)) {
  const 행 = 방授予[id];
  const 他人 = 행.filter(r => r.给他人);
  console.log(`${id}: 共${행.length}条방相关buff${他人.length ? ` 其中授予他人 ${他人.length} 条:` : '（全部self）'}`);
  for (const r of 他人) console.log(`   [${r.键}] tgt=${r.tgt} ${r.片段}`);
  if (他人.length) 授他방++;
}
console.log(`방-buff涉及角色=${Object.keys(방授予).length}，其中授予他人=${授他방}`);

console.log('\n===== CD操纵扫描 =====');
let 升CD角色 = [], 仅降CD = [], 旗标类 = [];
for (const id of Object.keys(CD操纵).map(Number).sort((a, b) => a - b)) {
  const 행 = CD操纵[id];
  const 有升 = 행.some(r => r.向 === '升' || r.向 === '待定');
  const 有旗标 = 행.some(r => r.向 === '旗标');
  if (有升) 升CD角色.push(id); else if (有旗标) 旗标类.push(id); else 仅降CD.push(id);
}
console.log(`涉及CD操纵角色=${Object.keys(CD操纵).length}`);
console.log(`含升CD/待定值: ${升CD角色.length} 个 → ${升CD角色.join(',')}`);
console.log(`仅旗标(StopCd/NoCdChange/CanCdOn等): ${旗标类.length} 个 → ${旗标类.join(',')}`);
console.log(`仅降CD(负值cdChange): ${仅降CD.length} 个 → ${仅降CD.join(',')}`);
console.log('\n== 每角色明细(升/待定与旗标) ==');
for (const id of [...升CD角色, ...旗标类]) {
  console.log(`${id}: ${CD操纵[id].map(r => `${r.字段}(${r.tgt},${r.值},${r.向})`).join(' | ')}`);
}
fs.writeFileSync(path.join(__dirname, '_방CD扫描.json'), JSON.stringify({ 방授予, CD操纵 }, null, 1));
console.log('\n已写 _방CD扫描.json');
