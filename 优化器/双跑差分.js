'use strict';
/*
 * 阶段1 硬闸门：新旧装配路径双跑 bit-exact 差分（施工计划约束 2 / 3.3）。
 *
 * 旧路径 = 原 setDefault（硬编码闭包）；新路径 = 机制表解释器装配（bin → 钩子闭包）。
 * 同一角色 × 同一解放等级 × 同一排程，两路径的 dmg13（及 dmgSoFar）必须逐位相同。
 *
 * 测试矩阵（三层，逐层加严）：
 *   A. DB 真实排程重放：试点角色所在 DB 队伍记录（description 解析成 65 tok），双引擎各 battle 一遍。
 *      → 最忠实（真实队伍站位/羁绊/排程），覆盖 5 解放等级自然分布（bonds 记录里就有）。
 *   B. 随机合法排程：随机 5 SSR 队伍（试点角色固定在每个站位试一遍）× 每角色 lib=1..5 ×
 *      随机走子（legalActs 中均匀采样 65 步）→ 同序列双路径 fastReplay。
 *      → 覆盖 DB 不会出现的角落（全 lib、全站位、罕见动作序）。
 *   C. 状态级 diff（A/B 抽样）：battle 后 getState() 全字段 JSON 对拍（buff 逐条、五路伤害计数、
 *      isOverflowed、curHp/curCd 等）——dmg13 相同但中间态不同 = 隐性分歧，也要抓。
 *
 * 性能红线（约束 3）：新路径单场评估耗时 / fastReplay 耗时 > 2 → 打印诊断并 exit 3（停止等用户指示）。
 *
 * 用法：node 双跑差分.js [--db N] [--rand N] [--角色 id列表] [--状态]
 *   --db N    每角色最多取 N 条 DB 记录（默认 40）
 *   --rand N  每角色×lib×站位 生成 N 条随机排程（默认 8）
 *   --角色    默认 build/mechanisms.bin 里全部角色
 *   --状态    抽样做 C 层状态 diff
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const 适配 = require('./引擎适配.js');

// ---- 参数 ----
const argv = process.argv.slice(2);
const 取参 = (名, 默认) => { const i = argv.indexOf('--' + 名); return i >= 0 && argv[i + 1] ? argv[i + 1] : 默认; };
const N_DB = Number(取参('db', 40));
const N_RAND = Number(取参('rand', 8));
const 做状态diff = argv.includes('--状态');
const BIN = path.join(__dirname, '机制表', 'build', 'mechanisms.bin');
const FLAT = path.join(__dirname, '机制表', 'build', 'flat.json');
const SCHEMA = path.join(__dirname, '机制表', 'schema.fbs');
// 陈旧防护（2026-09-20 事故：flatc 编译失败时静默沿用旧 mechanisms.bin 跑差分 → "假通过"）：
//   bin 比 flat.json 或 schema.fbs 旧 = 上游改了没重编 bin；报错并终止，绝不拿旧 bin 冒充新结果。
if (fs.existsSync(BIN)) {
  const tBin = fs.statSync(BIN).mtimeMs;
  for (const 上游 of [[FLAT, 'flat.json'], [SCHEMA, 'schema.fbs']]) {
    if (fs.existsSync(上游[0]) && tBin < fs.statSync(上游[0]).mtimeMs) {
      console.error(`❌ 陈旧 bin：mechanisms.bin 比 ${上游[1]} 旧（${上游[1]} ${new Date(fs.statSync(上游[0]).mtimeMs).toLocaleString()} > bin ${new Date(tBin).toLocaleString()}）。`);
      console.error('   flatc 可能编译失败沿用了旧 bin。请先：cd 机制表; tools\\flatc.exe --binary --strict-json --no-warnings -o build schema.fbs build\\flat.json; Move-Item build\\flat.bin build\\mechanisms.bin -Force');
      process.exit(3);
    }
  }
}
// 源码既有 bug 角色（10089 leader 体内 `hpUpAll(c, 30)` 的 `c` 全文件无声明——webcrack 反混淆残留）：
//   旧引擎 initBattle 即抛 ReferenceError，无法常规双跑对照；批次E-5c 机制表用 ThrowRef op 忠实复刻（两侧同抛同消息）。
//   排除范围：随机队友（可用ids）+常规试点（A/B/C 层，否则随机合法toks 生成期就崩）；由 D 层专项验证异常忠实性。
const 源码bug黑名单 = new Set([10089]);
const 数据 = 适配.机制数据(BIN);
// 试点排除源码bug角色（它们在常规对照层必崩两侧；批次E-5c 改由 D 层异常忠实验证）
const 试点ids = (argv.includes('--角色')
  ? 取参('角色').split(',').map(Number)
  : 数据.records.map(r => r.id)).filter(id => !源码bug黑名单.has(id));
// 定向角色必须在表内（否则走回落原 setDefault，差分对的是同一条旧路径 → 恒 0 不一致的假通过）
if (argv.includes('--角色')) {
  const 表内 = new Set(数据.records.map(r => r.id));
  const 缺失 = 试点ids.filter(id => !表内.has(id));
  if (缺失.length) {
    console.error(`❌ 定向角色不在机制表内（会回落原 setDefault，差分无意义）：${缺失.join(',')}。表内共 ${表内.size} 角色。`);
    process.exit(3);
  }
}
console.log(`机制表: ${数据.records.length} 角色, 版本 ${数据.version}, 字典 ${数据.names.length} 项`);
console.log(`试点: ${试点ids.join(',')}  DB条/角色≤${N_DB}  随机排程=${N_RAND}/lib/站位  状态diff=${做状态diff}`);

// ---- 两引擎：旧(无机制表) vs 新(机制表) ----
const 旧 = 适配.createEngine();
const 新 = 适配.createEngine({ 启用机制表: { binPath: BIN } });

// ---- DB 加载（gzip + BOM 容错）----
function 加载队伍库() {
  const p = path.resolve(适配.路径.autocalc, '..', '..', '..', 'tenkaassist_data', 'data', 'data.json');
  const buf = fs.readFileSync(p);
  let raw;
  try { raw = zlib.gunzipSync(buf); } catch (e) { raw = zlib.inflateSync(buf); }
  let txt = raw.toString('utf8');
  if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
  return JSON.parse(txt);
}

const 可用 = 适配.可模拟SSR清单();
const 可用ids = 可用.map(c => c.id).filter(id => !源码bug黑名单.has(id));   // 随机队友排除 10089（黑名单定义在上方 试点ids 处）
// 可装配 = getCharacter 存在且有 hp（setDefault 能建出单位即可；不限 rarity——
//   10012 是 SR(rarity=2) 但有完整 case，旧引擎能跑，双跑同样能验；队友无表角色新旧都走原 setDefault）
const 可装配 = id => { const c = 适配.角色数据().getCharacter(id); return c && !!c.hp && !!c.atk; };
const 可模拟 = id => { const c = 适配.角色数据().getCharacter(id); return c && c.ok === true && c.rarity === 3 && !!c.hp; };   // 仅用于随机队友选取（主流 SSR 队形）

// 简单可复现伪随机（种子固定 → 双跑脚本可重放同批用例）
function 随机源(种子) { let s = 种子 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---- 确定性 Math.random（10038(안닌) ultimate 里有 `if (Math.random() < 0.5) cdChange(-2)`）----
// 差分 v3 的 3 条"假不一致"根因：全局 Math.random 使同一场同 toks 两次重放值不同（全新实例也不稳）。
// 处理：每次 fastReplay/随机合法toks 前打桩同种子伪随机（同步调用包裹，单线程安全），新旧引擎抽取同一序列
//   → bit 比较公平且样本不丢（比黑名单 10038 更优）。stub 用引擎闭包外的全局 Math，工厂体内直接可见。
const _原生random = Math.random;
let _随机态 = 0;
function _种子random() { _随机态 = (_随机态 * 1664525 + 1013904223) >>> 0; return _随机态 / 4294967296; }
function 定随机(种子) { _随机态 = 种子 >>> 0; Math.random = _种子random; }
function 还原随机() { Math.random = _原生random; }
// 每次重放固定种子 20260919（新旧两边一致即可；值本身不重要，重要的是两引擎走同一抽取序列）
const 场种子 = 20260919;
function 确定性重放(inst, ids, toks, bonds) {
  定随机(场种子);
  try { return inst.increment.fastReplay(ids, toks, bonds, -1, null); } finally { 还原随机(); }
}

let 不一致 = 0, 总场 = 0;
const 分歧样例 = [];
// 批次E-5b：NaN 安全比较（10138 `comp[W]*30` 对象乘法=NaN 忠实复刻→NaN 传播进伤害值；
//   NaN!==NaN 会假不一致，双侧同 NaN=行为一致；不用 Object.is 避免 -0!==0 假不一致）
function 同值(o, n) { return o === n || (Number.isNaN(o) && Number.isNaN(n)); }
function 报差异(层, 案, 旧值, 新值) {
  不一致++;
  if (分歧样例.length < 10) 分歧样例.push({ 层, ...案, 旧: 旧值, 新: 新值 });
}

// ========== A 层：DB 真实排程 ==========
console.log('\n========== A: DB 真实排程双跑 ==========');
const DB = 加载队伍库();
let dbA场 = 0;
for (const id of 试点ids) {
  const 记录 = DB.filter(d => String(d.compstr).split(/\s+/).filter(Boolean).map(Number).includes(id))
    .filter(d => d.description && String(d.compstr).split(/\s+/).filter(Boolean).map(Number).every(可装配))
    .filter(d => !String(d.compstr).split(/\s+/).filter(Boolean).map(Number).some(x => 源码bug黑名单.has(x)))
    .slice(0, N_DB);
  let 符 = 0, 跑 = 0;
  for (const d of 记录) {
    const ids = String(d.compstr).split(/\s+/).filter(Boolean).map(Number);
    const BOND = [5, 5, 5, 5, 5];   // DB recommend 口径 = 羁绊全 5（自检.js 同款）
    // 用 fastReplay 而非 battle 对照：① 这是优化器/排程器实际走的评估路径；
    //   ② battle() 在旧引擎上存在跨场振荡缺陷（同一记录连跑 49.4亿→0→49.4亿，多例引擎.js 的
    //      战斗清理不完整所致——旧引擎对自己都不确定，用它做基准会制造假分歧；
    //      fastReplay→initBattle 每场完整清理，无此问题）。
    const 序列 = (旧.internals.setCommandCustom(ids, d.description, BOND) || []).slice(0, 65);
    if (序列.length < 65) continue;   // 非法/过短排程无法对照
    const toks = 序列.map(t => ({ idx: Number(t[0]) - 1, act: t[1] }));
    const o = 确定性重放(旧, ids, toks, BOND);
    const n = 确定性重放(新, ids, toks, BOND);
    跑++; dbA场++; 总场++;
    if (同值(o, n)) 符++;
    else 报差异('DB', { id, 队: d.name, ids, rec: d.recommend }, o, n);
  }
  const 跳 = 记录.length - 跑;
  console.log(`  id=${id}: ${符}/${跑} 全等${符 === 跑 ? ' ✅' : ' ❌'}${跳 ? `（${跳} 场排程<65步跳过）` : ''}`);
}
console.log(`  A层合计 ${dbA场} 场`);

// ========== B 层：随机队伍 × 全 lib × 全站位 × 随机排程 ==========
console.log('\n========== B: 随机排程双跑 ==========');
const rnd = 随机源(20260919);
function 随机合法toks(inst, ids, bonds) {
  // 生成也打桩同种子确定性 random：使生成期的 10038(안닌) 随机CD演化 ≡ 重放期，
  // 保证生成的 궁 在重放时仍合法（否则随机错位→궁非法→o===n===0 空比较，白跑样本）。
  // rnd() 是脚本自有 RNG，与 Math.random stub 互不影响。
  定随机(场种子);
  try {
    if (!inst.increment.initBattle(ids, bonds, -1, null)) return null;
    const toks = [];
    for (let k = 0; k < 65; k++) {
      // 汇总当前所有角色合法动作
      const 候选 = [];
      for (let i = 0; i < 5; i++) for (const a of inst.increment.legalActs(i)) 候选.push({ idx: i, act: a });
      if (!候选.length) return null;   // 卡死（不该发生：평/방 恒合法）
      const t = 候选[Math.floor(rnd() * 候选.length)];
      if (!inst.increment.step(t.idx, t.act)) return null;
      toks.push(t);
    }
    return toks;
  } finally { 还原随机(); }
}
let b场 = 0;
for (const id of 试点ids) {
  const 队列表 = [];
  for (let 站位 = 0; 站位 < 5; 站位++) {
    // 随机 4 个队友（可模拟 SSR，避免与试点重复）
    const 队友 = [];
    while (队友.length < 4) {
      const c = 可用ids[Math.floor(rnd() * 可用ids.length)];
      if (c !== id && !队友.includes(c)) 队友.push(c);
    }
    const ids = [];
    for (let i = 0; i < 5; i++) ids.push(i === 站位 ? id : 队友.shift());
    队列表.push({ 站位, ids });
  }
  let 符 = 0, 场 = 0;
  for (const { 站位, ids } of 队列表) {
    for (const lib of [1, 2, 3, 4, 5]) {
      const bonds = [5, 5, 5, 5, 5];
      bonds[站位] = lib;                       // 试点角色按被测 lib，其余全解放（DB 主流口径）
      const toks = 随机合法toks(旧, ids, bonds);   // 用旧引擎生成合法序列（其 legalActs 权威）
      if (!toks) continue;
      for (let 轮 = 0; 轮 < N_RAND; 轮++) {
        const o = 确定性重放(旧, ids, toks, bonds);
        const n = 确定性重放(新, ids, toks, bonds);
        场++; b场++; 总场++;
        if (同值(o, n)) 符++;
        else 报差异('随机', { id, 站位, lib, toks: toks.slice(0, 8).map(t => t.idx + t.act).join('') + '…' }, o, n);
      }
    }
  }
  console.log(`  id=${id}: ${符}/${场} 全等${符 === 场 ? ' ✅' : ' ❌'}`);
}
console.log(`  B层合计 ${b场} 场`);

// ========== C 层：状态级 diff（抽样）==========
if (做状态diff) {
  console.log('\n========== C: 状态级 diff（抽样） ==========');
  let c场 = 0, c符 = 0;
  for (const id of 试点ids) {
    const ids = [id, ...可用ids.filter(x => x !== id).slice(0, 4)];
    const bonds = [5, 5, 5, 5, 5];
    const toks = 随机合法toks(旧, ids, bonds);
    if (!toks) continue;
    确定性重放(旧, ids, toks, bonds);
    const so = JSON.stringify(旧.getState());
    确定性重放(新, ids, toks, bonds);
    const sn = JSON.stringify(新.getState());
    c场++; 总场++;
    if (so === sn) c符++;
    else {
      报差异('状态', { id }, '(状态不同)', '(状态不同)');
      // 找第一个差异字段便于定位
      const ao = 旧.getState(), an = 新.getState();
      for (const k of ['dmg13', 'GLOBAL_TURN', 'lastDmg', 'lastAddDmg', 'lastAtvDmg', 'lastDotDmg', 'lastRefDmg']) {
        if (ao[k] !== an[k]) console.log(`    字段 ${k}: 旧=${ao[k]} 新=${an[k]}`);
      }
      for (let i = 0; i < 5; i++) {
        const co = ao.comp[i] || {}, cn = an.comp[i] || {};
        if (JSON.stringify(ao.comp[i]) !== JSON.stringify(an.comp[i])) {
          console.log(`    comp[${i}] (id=${co.id}) 不同:`);
          for (const k of Object.keys(co)) {
            if (JSON.stringify(co[k]) !== JSON.stringify(cn[k])) {
              console.log(`      ${k}: 旧=${JSON.stringify(co[k]).slice(0, 150)}`);
              console.log(`         新=${JSON.stringify(cn[k]).slice(0, 150)}`);
            }
          }
        }
      }
      if (JSON.stringify(ao.boss) !== JSON.stringify(an.boss)) {
        console.log('    boss 不同:');
        for (const k of Object.keys(ao.boss)) {
          if (JSON.stringify(ao.boss[k]) !== JSON.stringify(an.boss[k])) {
            console.log(`      ${k}: 旧=${JSON.stringify(ao.boss[k]).slice(0, 200)}`);
            console.log(`         新=${JSON.stringify(an.boss[k]).slice(0, 200)}`);
          }
        }
      }
    }
  }
  console.log(`  C层合计 ${c场} 场, 全等 ${c符}`);
}

// ========== 性能红线 ==========
console.log('\n========== 性能: 新路径 vs fastReplay ==========');
{
  // 用 DB 里含승나미(10177) 的最大记录做基准场（重负载：注入+多钩子）
  const 基准id = 试点ids.includes(10177) ? 10177 : 试点ids[0];
  const 基准记录 = DB.find(d => String(d.compstr).split(/\s+/).filter(Boolean).map(Number).includes(基准id)
    && String(d.compstr).split(/\s+/).filter(Boolean).map(Number).every(可装配));
  if (基准记录) {
    const ids = String(基准记录.compstr).split(/\s+/).filter(Boolean).map(Number);
    const toks = 旧.increment.parseOnly ? null : null;
    const 序列 = (旧.internals.setCommandCustom(ids, 基准记录.description, [5, 5, 5, 5, 5]) || []).slice(0, 65);
    const tok序列 = 序列.map(t => ({ idx: Number(t[0]) - 1, act: t[1] }));
    const R = 300;
    let t0 = process.hrtime.bigint();
    for (let i = 0; i < R; i++) 旧.increment.fastReplay(ids, tok序列, [5, 5, 5, 5, 5], -1, null);
    const t旧 = Number(process.hrtime.bigint() - t0) / 1e6;
    t0 = process.hrtime.bigint();
    for (let i = 0; i < R; i++) 新.increment.fastReplay(ids, tok序列, [5, 5, 5, 5, 5], -1, null);
    const t新 = Number(process.hrtime.bigint() - t0) / 1e6;
    const 比 = t新 / t旧;
    console.log(`  基准场(含 id=${基准id}) ×${R}: 旧=${t旧.toFixed(1)}ms 新=${t新.toFixed(1)}ms 比=${比.toFixed(3)}x`);
    if (比 > 2) {
      console.log('  ❌ 性能红线突破（>2x）——按约束3停止，等待诊断指示');
      process.exit(3);
    }
    console.log(`  ✅ 性能在红线内（≤2x）`);
  } else console.log('  （无可用基准 DB 记录，跳过）');
}

// ========== D 层：源码 bug 异常忠实（批次E-5c：10089 ThrowRef） ==========
// 探针实证（_10089探针.js）：两引擎均为 **initBattle 直抛** ReferenceError: c is not defined（leader 装配期即炸），
//   而 fastReplay 内部吞异常返回 0（两侧同现 0，A/B 层无法区分忠实性）→ D 层必须直接调 initBattle。
// 验证：双侧同抛且 name/message 逐字一致（栈不可比：旧=闭包内直读未声明，新=编译闭包树 throw new ReferenceError；
//   V8 消息格式均为 `<name> is not defined`）——异常抛出后续指令两侧同样不执行，语义逐位忠实。
{
  const 表内 = new Set(数据.records.map(r => r.id));
  const D角色 = [...源码bug黑名单].filter(id => 表内.has(id));
  if (D角色.length) {
    console.log('\n========== D: 源码bug异常忠实 ==========');
    for (const id of D角色) {
      const ids = [id, ...可用ids.filter(x => x !== id).slice(0, 4)];
      const bonds = [5, 5, 5, 5, 5];
      let 旧异常 = null, 新异常 = null, 旧ret = '(未跑)', 新ret = '(未跑)';
      try { 定随机(场种子); 旧ret = 旧.increment.initBattle(ids, bonds, -1, null); } catch (e) { 旧异常 = e; } finally { 还原随机(); }
      try { 定随机(场种子); 新ret = 新.increment.initBattle(ids, bonds, -1, null); } catch (e) { 新异常 = e; } finally { 还原随机(); }
      总场++;
      const 异常同 = (旧异常 === null) === (新异常 === null) &&
        (旧异常 === null || (旧异常.name === 新异常.name && 旧异常.message === 新异常.message));
      if (异常同 && 旧异常) {
        console.log(`  id=${id}: 双侧同抛 ${旧异常.name}: "${旧异常.message}" 逐字一致 ✅`);
      } else if (异常同 && !旧异常 && 旧ret === 新ret) {
        console.log(`  id=${id}: 双侧均无异常且 initBattle 返回一致(${旧ret}) ✅`);
      } else {
        console.log(`  id=${id}: ❌ 异常不一致 旧=${旧异常 ? 旧异常.name + ': ' + 旧异常.message : '(无,ret=' + 旧ret + ')'} 新=${新异常 ? 新异常.name + ': ' + 新异常.message : '(无,ret=' + 新ret + ')'}`);
        报差异('异常忠实', { id }, 旧异常 ? String(旧异常.name + ': ' + 旧异常.message) : '(无)', 新异常 ? String(新异常.name + ': ' + 新异常.message) : '(无)');
      }
    }
  }
}

// ========== 结论 ==========
console.log(`\n========== 结论: ${总场} 场双跑, 不一致 ${不一致} ==========`);
if (分歧样例.length) { console.log(JSON.stringify(分歧样例, null, 1)); process.exit(1); }
console.log(不一致 === 0 ? '✅ bit-exact 硬闸门通过' : '❌ 有分歧');
process.exit(不一致 === 0 ? 0 : 1);
