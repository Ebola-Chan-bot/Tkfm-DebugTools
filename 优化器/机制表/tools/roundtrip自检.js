'use strict';
/*
 * FlatBuffers 工具链 + schema 合法性自检（阶段 0 验收#2）。
 * 作用：构造一个结构完整的 CharacterRecord（覆盖 enum/定长 struct 数组/嵌套 Cond+Param/统一字典/定点数值），
 *   走 flatc --binary 编成 .bin，再 flatc --json 反解，逐字段语义对拍，证明：
 *   ① schema.fbs 能被 flatc 编译成二进制；② .bin 能无损反解回 flat JSON（定长布局/字典/enum 全链路通）。
 * 注意：本脚本直接构造 flat 层、不经"src DSL→flat 压平器"（压平器是阶段 2 产物）。
 *
 * 用法：node tools/roundtrip自检.js
 * 依赖：tools/flatc.exe（25.12.19）、schema.fbs
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const D = path.resolve(__dirname, '..');            // .../机制表
const build = path.join(D, 'build');
const FLATC = path.join(D, 'tools', 'flatc.exe');
const SCHEMA = path.join(D, 'schema.fbs');
fs.mkdirSync(build, { recursive: true });

// ---- 字典（示意，正式字典由压平器从全量源码生成）----
const names = ['공퍼증', '가성비 좌석~!1', '궁뎀증', '기내 서비스', 'all'];
const idx = Object.fromEntries(names.map((s, i) => [s, i]));
const FIX = x => Math.round(x * 1e4);

const None = () => ({ tag: 'None', _pad: 0, _pad2: 0, i: 0 });
const F = v => ({ tag: 'Fix', _pad: 0, _pad2: 0, i: FIX(v) });
const NI = s => ({ tag: 'NameIdx', _pad: 0, _pad2: 0, i: idx[s] });
const T = t => ({ tag: 'Target', _pad: 0, _pad2: 0, i: t });
const PAD = n => { const a = []; for (let k = 0; k < n; k++) a.push(None()); return a; };
const Cond0 = () => ({ kind: 'None', cmp: 'Eq', nameIdx: 0, a: 0, b: 0 });
function Cmd(op, tgt, args, cond) {
  const ps = args.concat(PAD(11 - args.length));
  if (ps.length !== 11) throw new Error('ps 必须 11 项');
  return { op, tgt, tgtN: 0, _pad: 0, cond: cond || Cond0(), ps };
}

const cmds = [];
cmds.push(Cmd('LibIf', 'None', [F(3)]));                                              // 解放等级==3（定点 30000）
cmds.push(Cmd('Tbf', 'All', [T(2), NI('공퍼증'), F(60), NI('가성비 좌석~!1'), F(1)])); // 공퍼증 60→600000
cmds.push(Cmd('If', 'None', [], { kind: 'CmpGT', cmp: 'Eq', nameIdx: 0, a: FIX(1), b: 0 }));
cmds.push(Cmd('Tbf', 'Self', [T(1), NI('궁뎀증'), F(24), NI('기내 서비스'), F(1)]));
cmds.push(Cmd('EndIf', 'None', []));
cmds.push(Cmd('EndFor', 'None', []));
const usedCmds = cmds.length;
while (cmds.length < 256) cmds.push(Cmd('Nop', 'None', []));   // K=256（与 schema.fbs 同步）

const rec = {
  id: 10177, rarity: 3, element: 4, role: 3, cd: 3,
  hp: 1084618, atk: 248899, atkMag: 0, ultMag: 0, seq: 147,
  usedCmds, exclCount: 1, _pad3: 0,
  exclTypes: [idx['기내 서비스'], 0, 0, 0],
  mnc: [0, 3, 0, 3, 0, 3, 0, 3, 0, 3].map(FIX),
  slotInit: [0, 0, 0, 0],
  flags: new Array(16).fill(0),
  cmds,
};
const flat = { version: 1, charCount: 1, records: [rec], names };
const flatPath = path.join(build, 'rt_自检.json');
fs.writeFileSync(flatPath, JSON.stringify(flat));

function flatc(args) { return execFileSync(FLATC, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
// 正向：flat JSON → .bin
flatc(['-o', build, '--binary', '--strict-json', '--no-warnings', SCHEMA, flatPath]);
// 反向：.bin → JSON（bin 必须放 `--` 之后）
const rtDir = path.join(build, 'rt自检');
fs.rmSync(rtDir, { recursive: true, force: true });
flatc(['-o', rtDir, '--json', '--strict-json', '--no-warnings', SCHEMA, '--', path.join(build, 'rt_自检.bin')]);

const bin = fs.readFileSync(path.join(build, 'rt_自检.bin'));
const b = JSON.parse(fs.readFileSync(path.join(rtDir, 'rt_自检.json'), 'utf8'));
let 错 = 0;
const 报 = (w, x, y) => { if (JSON.stringify(x) !== JSON.stringify(y)) { console.log(`  ✗ ${w}: ${JSON.stringify(x)} ≠ ${JSON.stringify(y)}`); 错++; } };
console.log('=== round-trip 语义对拍（flat vs bin反解）===');
报('version', flat.version, b.version);
报('charCount', flat.charCount, b.charCount);
报('names字典', flat.names, b.names);
const ra = flat.records[0], rb = b.records[0];
for (const k of ['id', 'rarity', 'element', 'role', 'cd', 'hp', 'atk', 'atkMag', 'ultMag', 'seq', 'usedCmds', 'exclCount', '_pad3']) 报(`record.${k}`, ra[k], rb[k]);
报('exclTypes', ra.exclTypes, rb.exclTypes);
报('mnc定点', ra.mnc, rb.mnc);
报('slotInit', ra.slotInit, rb.slotInit);
报('flags', ra.flags, rb.flags);
for (let i = 0; i < ra.cmds.length; i++) {
  const ca = ra.cmds[i], cb = rb.cmds[i];
  if (!cb) { console.log(`  ✗ cmds[${i}] 缺失`); 错++; continue; }
  if (ca.op !== cb.op || ca.tgt !== cb.tgt || ca.tgtN !== cb.tgtN) { console.log(`  ✗ cmds[${i}] op/tgt: ${ca.op}/${ca.tgt} ≠ ${cb.op}/${cb.tgt}`); 错++; }
  if (JSON.stringify(ca.cond) !== JSON.stringify(cb.cond)) { console.log(`  ✗ cmds[${i}].cond`); 错++; }
  for (let k = 0; k < 11; k++) {
    const pa = ca.ps[k] || { tag: 'None', i: 0 }, pb = cb.ps[k] || { tag: 'None', i: 0 };
    if ((pa.tag || 'None') !== (pb.tag || 'None') || (pa.i || 0) !== (pb.i || 0)) { console.log(`  ✗ cmds[${i}].ps[${k}]: ${JSON.stringify(pa)}≠${JSON.stringify(pb)}`); 错++; }
  }
}
const magic = String.fromCharCode(bin[4], bin[5], bin[6], bin[7]);
console.log(`\n=== 结果: bin=${bin.length}字节 magic="${magic}" 差异=${错} ===`);
if (错 === 0 && magic === 'TKFM') {
  // 定点抽查
  const libIf = rb.cmds.find(c => c.op === 'LibIf'), tbf = rb.cmds.find(c => c.op === 'Tbf');
  const okFixed = libIf.ps[0].i === 30000 && tbf.ps[2].i === 600000 && rb.mnc[1] === 30000;
  console.log(`定点抽查: LibIf=${libIf.ps[0].i}(30000) 공퍼증=${tbf.ps[2].i}(600000) mnc[1]=${rb.mnc[1]}(30000) → ${okFixed ? '✓' : '✗'}`);
  console.log(okFixed ? '✅ round-trip 完全无损，schema+工具链验收通过' : '✗ 定点对不上');
  process.exit(okFixed ? 0 : 1);
} else {
  console.log('✗ round-trip 有损或 magic 错');
  process.exit(1);
}
