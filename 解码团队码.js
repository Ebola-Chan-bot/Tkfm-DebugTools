'use strict';
/*
 * 解码团队码.js —— 天下布魔团队码解码器（常驻工具，CLI + 可 require 双接口）
 *
 * 码格式（与 tenkaassist have.js 的 b64to10 同算法）：
 *   "<队员段>:<羁绊段>"
 *   - 队员段：b64→十进制大整数，掐掉前 2 位后每 3 位一组（+10000）即角色 id
 *   - 羁绊段：b64→十进制，每位一个羁绊数（1~5），与队员一一对应
 *
 * CLI 用法：
 *   node 解码团队码.js --码="xxxx:yyyy"        # 人读输出（含角色名，自动读 tenkaassist characterJson.js）
 *   node 解码团队码.js --码="xxxx:yyyy" --json # 机器输出 {ids, bonds}
 *   node 解码团队码.js --码="xxxx:yyyy" --角色表="D:\path\to\characterJson.js"
 * 也可以把码作为唯一位置参数传入（不带 --码=）。
 *
 * require 用法：
 *   const { 解码 } = require('./解码团队码.js');
 *   const { ids, bonds } = 解码('xxxx:yyyy');   // 非法码抛异常
 */
const fs = require('fs');
const path = require('path');

const 字母表 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_!';

function b64to10(str) {
   let result = 0n;
   for (const ch of str) {
      const v = 字母表.indexOf(ch);
      if (v < 0) throw new Error(`非法字符 "${ch}"（不在 64 字母表内）`);
      result = result * 64n + BigInt(v);
   }
   return result.toString();
}

// 解码团队码 → { ids: number[], bonds: number[] }（两者等长，一一对应）
function 解码(码) {
   if (typeof 码 !== 'string' || !码.trim()) throw new Error('空团队码');
   const 两段 = 码.replaceAll(/\s/g, '').split(':');
   if (两段.length !== 2) throw new Error('码必须恰有一个 ":" 分隔队员段与羁绊段');
   const 十进 = b64to10(两段[0]);
   if (十进.length < 5) throw new Error('队员段过短');
   const 去头 = 十进.slice(2);
   if (去头.length % 3 !== 0) throw new Error('队员段十进制长度不是 3 的倍数，码损坏');
   const ids = [];
   for (let i = 0; i < 去头.length; i += 3) ids.push(Number(去头.slice(i, i + 3)) + 10000);
   const bonds = b64to10(两段[1]).split('').map(Number);
   if (ids.length !== bonds.length) throw new Error(`队员数 ${ids.length} 与羁绊数 ${bonds.length} 不匹配`);
   return { ids, bonds };
}

// 可选：读 tenkaassist characterJson.js 拼名字（行级宽松解析；文件缺失返回 null）
function 读角色表(表路径) {
   const p = 表路径 || 'D:/天下布魔/tenkaassist/js/characterJson.js';
   if (!fs.existsSync(p)) return null;
   const 表 = new Map();
   for (const 行 of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = 行.match(/\{ok : (true|false), id : (\d+),/);
      if (!m) continue;
      const r = 行.match(/name\s*:\s*"([^"]*)"/);
      const ro = 行.match(/role\s*:\s*(\d+)/);
      表.set(+m[2], { name: r ? r[1] : String(m[2]), role: ro ? +ro[1] : undefined });
   }
   return 表;
}

// ---------------- CLI ----------------
if (require.main === module) {
   const 参数 = process.argv.slice(2);
   let 码 = null, 表路径 = null, 出json = false;
   for (const a of 参数) {
      if (a.startsWith('--码=')) 码 = a.slice(4);
      else if (a.startsWith('--角色表=')) 表路径 = a.slice('--角色表='.length);
      else if (a === '--json') 出json = true;
      else if (!a.startsWith('--')) 码 = a;
   }
   if (!码) { console.error('用法: node 解码团队码.js --码="<团队码>" [--json] [--角色表=路径]'); process.exit(1); }
   let 结果;
   try { 结果 = 解码(码); } catch (e) { console.error('解码失败:', e.message); process.exit(1); }
   if (出json) {
      console.log(JSON.stringify(结果));
      process.exit(0);
   }
   const 表 = 读角色表(表路径);
   const { ids, bonds } = 结果;
   console.log(`角色数=${ids.length}  羁绊数=${bonds.length}`);
   const 羁绊分布 = {};
   for (const b of bonds) 羁绊分布[b] = (羁绊分布[b] || 0) + 1;
   console.log('羁绊分布:', JSON.stringify(羁绊分布));
   const role名 = { 0: '攻', 1: '治', 2: '守', 3: '辅', 4: '妨' };
   console.log('--- 全员（id 名字(类型) 羁绊） ---');
   for (let i = 0; i < ids.length; i++) {
      const 角 = 表 ? 表.get(ids[i]) : null;
      const 行 = 表 ? `${ids[i]} ${角 ? 角.name : '?'}${角 && 角.role !== undefined ? `(${role名[角.role] || '?'})` : ''} 羁绊${bonds[i]}` : `${ids[i]} 羁绊${bonds[i]}`;
      console.log(行);
   }
   process.exit(0);
}

module.exports = { 解码, 读角色表, b64to10 };
