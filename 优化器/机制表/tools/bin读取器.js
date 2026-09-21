'use strict';
/*
 * 机制表 bin 读取器 —— mechanisms.bin → JS 对象数组（与压平器输出的 flat.json 同构）。
 *
 * 设计：
 *   - 根 table（MechanismTable：version/charCount/records/names）用 flatbuffers 库的 ByteBuffer
 *     辅助方法读 vtable 偏移（table 是变长布局，必须经库解析）；
 *   - CharacterRecord / Cmd / Cond / Param 都是 **struct（定长内联）**，用 DataView 按 flatc 生成的
 *     TS 绑定硬编码偏移直读——不生成 JS 类，避开 flatc 25.12 无 --js 目标；偏移来源 ts/tkfm-mech/*.ts。
 *   - 读出的 op/tgt/tag/kind/cmp 一律转回**字符串名**（与 flat.json 完全一致），便于 diff 验证 reader。
 *
 * ABI（K=256，flatc 生成，改 schema 必须重新生成 TS 并同步这些常量）：
 *   CharacterRecord sizeOf=26776 = 152 + 256×104（批次E-4：mnc 改 [double:10] 无损存储 FP 噪声字面量，Record 26732→26776）
 *     id@0 rarity@4 element@5 role@6 cd@7 hp@8 atk@12 atkMag@16 ultMag@18 seq@20 usedCmds@22
 *     exclCount@24 _pad3@25 exclTypes@26(4×2) mnc@40(10×8 double) slotInit@120(4×4) flags@136(16) cmds@152(256×104)
 *   Cmd sizeOf=104: op@0 tgt@1 tgtN@2 _pad@3 cond@4(16B对齐区,实占12) ps@16(11×8)
 *   Cond sizeOf=12: kind@0 cmp@1 nameIdx@2 a@4 b@8
 *   Param sizeOf=8 : tag@0 _pad@1 _pad2@2 i@4
 * 根 table 字段 vtable 槽（flatc 生成）：version=4 charCount=6 records=8 names=10
 *
 * 用法：const 读 = require('./bin读取器.js'); const {records, names, version} = 读.读取bin('build/flat.bin');
 */
const fs = require('fs');
const path = require('path');
const flatbuffers = require('flatbuffers');   // 机制表/node_modules/flatbuffers（官方运行时）
const { OP, TAG, TGT, CK, CMP } = require('./flatten_core.js');

// ---- struct 尺寸与偏移（flatc 硬事实）----
const RECORD_SIZE = 26776;   // 批次E-4：mnc [int:10]→[double:10]（40B→80B）+对齐垫 6B
const CMD_SIZE = 104;
const CMD_OFFSET = 152;      // mnc double 后移：exclTypes@26(8B)+pad6=40 起 mnc@40(80B) slotInit@120 flags@136 cmds@152
const K_CMD = 256;

// 数字 → 字符串名反查表（与 flat.json 的 enum 字符串一致）
const 反OP = Object.fromEntries(Object.entries(OP).map(([k, v]) => [v, k]));
const 反TAG = Object.fromEntries(Object.entries(TAG).map(([k, v]) => [v, k]));
const 反TGT = Object.fromEntries(Object.entries(TGT).map(([k, v]) => [v, k]));
const 反CK = Object.fromEntries(Object.entries(CK).map(([k, v]) => [v, k]));
const 反CMP = Object.fromEntries(Object.entries(CMP).map(([k, v]) => [v, k]));

function 读取bin(binPath) {
  const bytes = new Uint8Array(fs.readFileSync(binPath));
  const bb = new flatbuffers.ByteBuffer(bytes);

  // magic 校验（bytes[4..7]）
  const magic = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  if (magic !== 'TKFM') throw new Error(`bin magic 错: "${magic}" ≠ "TKFM"（schema/bin 不匹配）`);

  // 根 table：bb_pos = 根 table 起始偏移（getRootAs 语义 = bb.readInt32(bb.position()) + bb.position()）
  const rootPos = bb.readInt32(bb.position()) + bb.position();

  // vtable 偏移读取辅助（复刻 ByteBuffer.__offset：从 rootPos 读 vtable，再取第 slot 项）
  const off = (slot) => bb.__offset(rootPos, slot);
  const version = off(4) ? bb.readUint16(rootPos + off(4)) : 0;
  const charCount = off(6) ? bb.readUint16(rootPos + off(6)) : 0;

  // records 向量：__vector(vec_off) = 向量数据起点；元素为定长 struct，直接按 index×RECORD_SIZE 定位
  const recVecSlot = off(8);
  const recVecBegin = recVecSlot ? bb.__vector(rootPos + recVecSlot) : 0;
  const recLen = recVecSlot ? bb.__vector_len(rootPos + recVecSlot) : 0;
  if (recLen !== charCount) throw new Error(`records 长度 ${recLen} ≠ charCount ${charCount}`);

  // names 字典向量（string 向量：uoffset 槽 → __string 解引用）
  const nameVecSlot = off(10);
  const 字典 = nameVecSlot ? decodeNames(bb, rootPos + nameVecSlot) : [];

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const records = [];
  for (let r = 0; r < recLen; r++) {
    const base = recVecBegin + r * RECORD_SIZE;
    const rec = 读Record(dv, base, 字典);
    records.push(rec);
  }
  return { version, charCount, records, names: 字典 };
}

// names 向量解码（string 向量：每元素是自身相对的 uoffset；__string 内部先 resolve 再 UTF8 decode。
//   注意：传 Encoding.UTF8_BYTES 会返回原始 Uint8Array 而非字符串——必须省略 encoding 参数）
function decodeNames(bb, vecPos) {
  if (!vecPos) return [];
  const n = bb.__vector_len(vecPos);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(bb.__string(bb.__vector(vecPos) + i * 4));
  }
  return out;
}

function 读Record(dv, b, 字典) {
  const usedCmds = dv.getUint16(b + 22, true);
  const exclCount = dv.getUint8(b + 24);
  const exclTypes = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) exclTypes[i] = dv.getUint16(b + 26 + i * 2, true);
  const mnc = [];
  for (let i = 0; i < 10; i++) mnc.push(dv.getFloat64(b + 40 + i * 8, true));   // 批次E-4：double 无损（10173 FP 噪声字面量）
  const slotInit = [];
  for (let i = 0; i < 4; i++) slotInit.push(dv.getInt32(b + 120 + i * 4, true));
  const flags = [];
  for (let i = 0; i < 16; i++) flags.push(dv.getUint8(b + 136 + i));
  const cmds = [];
  for (let c = 0; c < K_CMD; c++) cmds.push(读Cmd(dv, b + CMD_OFFSET + c * CMD_SIZE, 字典));
  return {
    id: dv.getUint32(b, true),
    rarity: dv.getUint8(b + 4),
    element: dv.getUint8(b + 5),
    role: dv.getUint8(b + 6),
    cd: dv.getUint8(b + 7),
    hp: dv.getUint32(b + 8, true),
    atk: dv.getUint32(b + 12, true),
    atkMag: dv.getUint16(b + 16, true),
    ultMag: dv.getUint16(b + 18, true),
    seq: dv.getUint16(b + 20, true),
    usedCmds, exclCount, _pad3: dv.getUint8(b + 25),
    exclTypes, mnc, slotInit, flags, cmds,
  };
}

function 读Cmd(dv, b, 字典) {
  const ps = [];
  for (let i = 0; i < 11; i++) {
    const pb = b + 16 + i * 8;
    ps.push({ tag: 反TAG[dv.getUint8(pb)], _pad: dv.getUint8(pb + 1), _pad2: dv.getUint16(pb + 2, true), i: dv.getInt32(pb + 4, true) });
  }
  const cb = b + 4;
  return {
    op: 反OP[dv.getUint8(b)],
    tgt: 反TGT[dv.getUint8(b + 1)],
    tgtN: dv.getUint8(b + 2),
    _pad: dv.getUint8(b + 3),
    cond: { kind: 反CK[dv.getUint8(cb)], cmp: 反CMP[dv.getUint8(cb + 1)], nameIdx: dv.getUint16(cb + 2, true), a: dv.getInt32(cb + 4, true), b: dv.getInt32(cb + 8, true) },
    ps,
  };
}

module.exports = { 读取bin, RECORD_SIZE, CMD_SIZE, K_CMD };
