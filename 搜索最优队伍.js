'use strict';
/*
 * 搜索最优队伍.js —— 团队码 → 最优 5 人队 + 可读中文指令 + 总伤（端到端自动化，常驻工具）
 *
 * 输入一个天下布魔团队码（"队员段:羁绊段"），自动完成全链路：
 *   解码（解码团队码.js）
 *   → 机制表 bin 保障（缺失则自动跑 flatten_core.js 构建）
 *   → 真羁绊三段筛选（复用 优化器/排程器.js）：
 *       A 全部合法 5 人名单 × 120 站位先验贪心粗评
 *       B 每名单最优站位 前瞻贪心 + 爬山 精排
 *       C Top 名单 × Top-K 站位 爬山深搜（含谷底试探）
 *   → Top 队伍完整深搜（跑 优化器/搜索队伍.js 全管线：束搜索 + 相位/节拍/窗对齐/独立相位兜底
 *     + 自然收敛 + 编辑球 r≤2 邻域穷举验证）
 *   → 输出最优队伍、逐回合可读中文指令、按角色汇总、站点 description 格式、总伤。
 *
 * 与生产链路的唯一差别：全程按码里的**真实羁绊**评估（主程序/团队搜索器硬编码全 5）。
 * 实现方式：包一层 inst.increment.initBattle / fastReplay，按 ids 查表重写 bondList
 * （排程器内部无论传什么 bonds，最终都从这两个口进引擎）。
 *
 * 用法：
 *   node 搜索最优队伍.js --码="xxxx:yyyy"
 *   node 搜索最优队伍.js "xxxx:yyyy" --终搜=3 --束时限=120 --导出=结果.json
 *   node 搜索最优队伍.js --码="xxxx:yyyy" --只解析      # 只解码打印候选池
 *
 * 选项：
 *   --码=          团队码（也可作为唯一位置参数传入）
 *   --终搜=        进入完整深搜的候选队数（默认 3；0=只跑 A/B/C 不终搜）
 *   --束时限=      终搜束搜索秒数（默认 120）
 *   --爬山预算=    终搜单次爬山评估上限（默认 10000）
 *   --TopN=        阶段 C 深搜名单数（默认 6）
 *   --K=           阶段 C 每名单深搜站位数（默认 3）
 *   --粗预算=      阶段 B 爬山预算（默认 2500）
 *   --深预算=      阶段 C 爬山预算（默认 8000）
 *   --禁用种子     终搜不读 data.json 种子（种子库缺失时本就自动跳过）
 *   --只解析       只解码打印候选池，不搜索
 *   --出目录=      产物目录（默认当前工作目录）
 *   --导出=        最优结果 JSON 路径（默认 <出目录>/最优队_结果.json）
 *
 * 产物：最优队_结果.json（结构化结果）、最优队_结果.txt（全输出镜像）、
 *       最优队_终搜N.json/.txt（搜索队伍.js 逐队导出与镜像）。
 *
 * 退出码：0=成功；2=参数/解码/池校验错误；3=无合法队伍；4=全部搜索路径零伤害。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const 优化器 = p => path.join(__dirname, '优化器', p);
const 适配 = require(优化器('引擎适配.js'));
const 排程器 = require(优化器('排程器.js'));
const 团队搜索器 = require(优化器('团队搜索器.js'));
const { 解码 } = require(path.join(__dirname, '解码团队码.js'));

// ===================== 输出：既打印又收集，最后镜像到文件（本机终端回显不可靠时的兜底）=====================
const 缓冲行 = [];
const 说 = (...a) => { const s = a.join(' '); console.log(s); 缓冲行.push(s); };
let 镜像文件 = null;
const 落盘 = () => { if (镜像文件) { try { fs.writeFileSync(镜像文件, 缓冲行.join('\n'), 'utf8'); } catch (e) {} } };
process.on('uncaughtException', e => { 说('\n!!! 未捕获异常: ' + (e && e.stack || e)); 落盘(); process.exit(1); });

// ===================== 参数 =====================
const 参 = {};
const 位置参数 = [];
for (const a of process.argv.slice(2)) {
  const m = typeof a === 'string' && a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) 参[m[1]] = m[2] === undefined ? true : m[2];
  else 位置参数.push(a);
}
const 码 = 参.码 != null ? String(参.码) : (位置参数[0] || null);
if (!码) {
  console.error('用法: node 搜索最优队伍.js --码="<团队码>" [--终搜=3 --束时限=120 --只解析 …]');
  process.exit(2);
}
const 出目录 = path.resolve(String(参.出目录 || process.cwd()));
fs.mkdirSync(出目录, { recursive: true });
const 导出路径 = 参.导出 ? path.resolve(String(参.导出)) : path.join(出目录, '最优队_结果.json');
镜像文件 = path.join(出目录, '最优队_结果.txt');
const 数 = (v, d) => (v == null ? d : Number(v));
const 终搜N = 数(参.终搜, 3), 束时限 = 数(参.束时限, 120), 终搜爬山预算 = 数(参.爬山预算, 10000);
const TopN = 数(参.TopN, 6), K站位 = 数(参.K, 3), 粗预算 = 数(参.粗预算, 2500), 深预算 = 数(参.深预算, 8000);
const t0 = Date.now();
const 时 = () => `[${((Date.now() - t0) / 1000).toFixed(1)}s]`;

// ===================== 机制表 bin 保障（缺失自动构建，含 flatc 编译）=====================
const bin路径 = 优化器(path.join('机制表', 'build', 'mechanisms.bin'));
function 保障机制表() {
  if (fs.existsSync(bin路径)) return;
  说(`${时()} 机制表 bin 缺失（${bin路径}），自动构建（首次含依赖安装，约 1-2 分钟）…`);
  const r = spawnSync(process.execPath,
    [优化器(path.join('机制表', 'tools', 'flatten_core.js')), '--全量', '--srcDir', '生成', '--bin'],
    { stdio: 'inherit', cwd: 优化器('机制表') });
  if (r.status !== 0 || !fs.existsSync(bin路径)) {
    说('机制表构建失败。请手动执行：node 优化器/机制表/tools/flatten_core.js --全量 --srcDir 生成 --bin（cwd=优化器/机制表）');
    落盘(); process.exit(2);
  }
  说(`${时()} 机制表构建完成: ${fs.statSync(bin路径).size} 字节`);
}

// ===================== 候选池：解码 + 校验 + 中文名 =====================
function 建池() {
  let 解;
  try { 解 = 解码(码); } catch (e) { 说('解码失败: ' + e.message); 落盘(); process.exit(2); }
  const 表 = new Map(适配.角色表().filter(c => c && c.id != null).map(c => [c.id, c]));
  const 见 = new Set(), 池 = [];
  for (let i = 0; i < 解.ids.length; i++) {
    const id = 解.ids[i];
    if (见.has(id)) { 说(`警告: 角色 ${id} 重复出现，保留首次`); continue; }
    见.add(id);
    const c = 表.get(id);
    if (!c) { 说(`警告: 角色 ${id} 不在角色表，剔除`); continue; }
    const 可模拟 = c.ok === true && c.rarity === 3 && c.hp && c.atk;
    if (!可模拟) { 说(`警告: 角色 ${id} 不可模拟（ok=${c.ok} rarity=${c.rarity}），剔除`); continue; }
    池.push({ id, 羁绊: 解.bonds[i], role: c.role });
  }
  if (池.length < 5) { 说(`有效角色 ${池.length} < 5，无法组队`); 落盘(); process.exit(2); }
  // 中文名（common.js translate，sc 优先回退 tc/韩文名）
  const common = fs.readFileSync(path.join(__dirname, '..', 'tenkaassist', 'js', 'common.js'), 'utf8');
  for (const p of 池) {
    const c = 表.get(p.id);
    const m = common.match(new RegExp('"' + String(c.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*\\{([^}]*)\\}'));
    const 体 = m ? m[1] : '';
    p.名 = (体.match(/\bsc\s*:\s*"([^"]*)"/) || [])[1] || (体.match(/\btc\s*:\s*"([^"]*)"/) || [])[1] || c.name;
  }
  return 池;
}

const role名 = { 0: '攻', 1: '治', 2: '守', 3: '辅', 4: '妨' };
function 打印池(池) {
  说(`团队码: ${码}`);
  说(`候选池 ${池.length} 人（id 名称(类型) 羁绊）：`);
  for (const p of 池) 说(`  ${p.id} ${p.名}(${role名[p.role] || '?'}) 羁绊${p.羁绊}`);
}

// ===================== 引擎：边界包一层换真羁绊（对排程器透明）=====================
let _羁绊表 = null;
function 建引擎(池) {
  _羁绊表 = new Map(池.map(p => [p.id, p.羁绊]));
  const inst = 适配.createEngine({ 启用机制表: { binPath: bin路径 } });
  const inc = inst.increment;
  const 原init = inc.initBattle, 原fast = inc.fastReplay;
  const 真 = ids => ids.map(id => (_羁绊表.has(id) ? _羁绊表.get(id) : 5));
  inc.initBattle = (ids, bonds, be, ol) => 原init(ids, 真(ids), be, ol);
  inc.fastReplay = (ids, toks, bonds, be, ol) => 原fast(ids, toks, 真(ids), be, ol);
  return inst;
}
const 羁绊序 = ids => ids.map(id => (_羁绊表.has(id) ? _羁绊表.get(id) : 5));
const 画像 = 池 => 池.map(p => `${p.id}${p.名}`).join(',');
const 画像ids = (ids, 池) => ids.map(id => { const p = 池.find(x => x.id === id); return `${id}${p ? p.名 : ''}`; }).join(',');

// ===================== 组合枚举 =====================
function* 组合(arr, k, 起 = 0, 挑 = []) {
  if (挑.length === k) { yield 挑.slice(); return; }
  for (let i = 起; i <= arr.length - (k - 挑.length); i++) { 挑.push(arr[i]); yield* 组合(arr, k, i + 1, 挑); 挑.pop(); }
}

// ===================== 阶段 A：全部合法名单 × 120 站位，先验贪心粗评 =================
function 阶段A(inst, 池) {
  const ids池 = 池.map(p => p.id);
  const 结果 = [];
  let n站位 = 0;
  for (const S of 组合(ids池, 5)) {
    const 站位们 = [];
    for (const P of 团队搜索器.排列升序(S)) {
      if (!适配.isValidComp(P)) continue;
      const g = 排程器.先验贪心(inst, P, 羁绊序(P));
      n站位++;
      if (!g || !g.toks || g.toks.length < 65) continue;
      站位们.push({ perm: P, dmg: g.dmg, toks: g.toks });
    }
    if (!站位们.length) continue;
    站位们.sort((a, b) => b.dmg - a.dmg);
    结果.push({ ids: S.slice().sort((x, y) => x - y), 站位: 站位们.slice(0, 5) });
  }
  结果.sort((a, b) => b.站位[0].dmg - a.站位[0].dmg);
  说(`${时()} A 完成：合法名单 ${结果.length}，有效站位评估 ${n站位}`);
  for (const r of 结果.slice(0, 10)) 说(`  ${r.站位[0].dmg.toLocaleString().padStart(15)}  ${画像ids(r.站位[0].perm, 池)}`);
  return 结果;
}

// ===================== 阶段 B：每名单最优站位 前瞻贪心 + 爬山 =================
function 阶段B(inst, 池, A) {
  const 结果 = [];
  for (let i = 0; i < A.length; i++) {
    const P = A[i].站位[0].perm;
    const 前 = 排程器.先验前瞻贪心(inst, P, 羁绊序(P));
    let h = null;
    if (前 && 前.toks) h = 排程器.爬山(inst, P, 前.toks, 羁绊序(P), 粗预算);
    const r = { ids: A[i].ids, perm: P, dmg: h ? h.dmg : (前 ? 前.dmg : 0), toks: h ? h.toks : (前 ? 前.toks : null) };
    结果.push(r);
    说(`${时()} B ${i + 1}/${A.length}  ${r.dmg.toLocaleString().padStart(15)}  ${画像ids(P, 池)}`);
  }
  结果.sort((a, b) => b.dmg - a.dmg);
  说(`${时()} B 完成（爬山预算=${粗预算}）`);
  for (const r of 结果.slice(0, 10)) 说(`  ${r.dmg.toLocaleString().padStart(15)}  ${画像ids(r.perm, 池)}`);
  return 结果;
}

// ===================== 阶段 C：Top 名单 × Top-K 站位 深搜（含谷底试探）=====================
function 阶段C(inst, 池, A, B) {
  const 结果 = [];
  for (let i = 0; i < Math.min(TopN, B.length); i++) {
    const 名单 = B[i];
    const A项 = A.find(r => r.ids.join() === 名单.ids.join()) || { 站位: [{ perm: 名单.perm }] };
    const 候选 = A项.站位.slice(0, K站位).map(s => s.perm);
    if (!候选.some(p => p.join() === 名单.perm.join())) 候选.unshift(名单.perm);
    let best = null;
    for (const P of 候选) {
      if (!适配.isValidComp(P)) continue;
      const 前 = 排程器.先验前瞻贪心(inst, P, 羁绊序(P));
      if (!前 || !前.toks) continue;
      const h = 排程器.爬山(inst, P, 前.toks, 羁绊序(P), 深预算, null, null, 8);
      const r = { perm: P, dmg: h ? h.dmg : 前.dmg, toks: h ? h.toks : 前.toks };
      说(`${时()} C[${i + 1}/${Math.min(TopN, B.length)}]  ${r.dmg.toLocaleString().padStart(15)}  ${画像ids(P, 池)}`);
      if (!best || r.dmg > best.dmg) best = r;
    }
    if (best) 结果.push({ ids: 名单.ids, ...best });
  }
  结果.sort((a, b) => b.dmg - a.dmg);
  说(`${时()} C 完成（K=${K站位} 爬山预算=${深预算} 谷底试探=8）`);
  for (const r of 结果) 说(`  ${r.dmg.toLocaleString().padStart(15)}  ${画像ids(r.perm, 池)}`);
  return 结果;
}

// ===================== 终搜：跑 搜索队伍.js 全管线（子进程，逐队导出 JSON）=====================
function 终搜队(池, 项, 序号) {
  const ids = 项.perm || 项.ids;
  const 名称 = ids.map(id => 池.find(p => p.id === id).名);
  const 导出 = path.join(出目录, `最优队_终搜${序号}.json`);
  const 镜像 = path.join(出目录, `最优队_终搜${序号}.txt`);
  fs.rmSync(导出, { force: true });
  说(`${时()} 终搜 ${序号}: ${画像ids(ids, 池)}  羁绊[${羁绊序(ids)}]`);
  const r = spawnSync(process.execPath, [
    优化器('搜索队伍.js'),
    `--ids=${ids.join(',')}`, `--羁绊=${羁绊序(ids).join(',')}`,
    `--束时限=${束时限}`, `--爬山预算=${终搜爬山预算}`,
    ...(参.禁用种子 ? ['--禁用种子'] : []),
    `--导出=${导出}`, `--输出=${镜像}`,
  ], { stdio: 'inherit' });
  if (!fs.existsSync(导出)) { 说(`  终搜 ${序号} 无导出（退出码 ${r.status}），跳过`); return null; }
  const j = JSON.parse(fs.readFileSync(导出, 'utf8'));
  说(`  终搜 ${序号} 完成: ${Number(j.dmg).toLocaleString()} 来源=${j.来源}${j.部分完成 ? '(部分完成)' : ''}（退出码 ${r.status}）`);
  return { ids: j.ids, 名称: j.名称, 羁绊: j.羁绊, dmg: j.dmg, 来源: j.来源, toks: j.toks, description: j.description };
}

// ===================== 可读中文指令 =====================
const 动作名 = { 평: '普攻', 궁: '大招', 방: '防守' };
function 渲染指令(ids, 名称, toks) {
  if (!toks || toks.length < 65) { 说('\n（无指令数据可渲染）'); return; }
  const 回合数 = Math.round(toks.length / 5);
  说('\n===== 最优指令（可读中文，按出手顺序）=====');
  for (let r = 0; r < 回合数; r++) {
    const 段 = toks.slice(r * 5, r * 5 + 5).map(t => `${名称[t.idx]}(${t.idx + 1}号位)${动作名[t.act] || t.act}`);
    说(`第${String(r + 1).padStart(2)}回合：` + 段.join(' → '));
  }
  说('\n===== 按角色汇总 =====');
  for (let i = 0; i < 5; i++) {
    const 大招 = [], 防守 = [], 普攻 = [];
    for (let s = 0; s < toks.length; s++) {
      const 回合 = Math.floor(s / 5) + 1;
      if (toks[s].idx !== i) continue;
      (toks[s].act === '궁' ? 大招 : toks[s].act === '방' ? 防守 : 普攻).push(回合);
    }
    const 大招串 = 大招.length ? `第${大招.join('、')}回合` : '无';
    const 防守串 = 防守.length ? `第${防守.join('、')}回合` : '无';
    说(`${名称[i]}(${i + 1}号位)：大招=${大招串}；防守=${防守串}；其余${普攻.length}回合普攻`);
  }
  const 计 = { 평: 0, 궁: 0, 방: 0 };
  for (const t of toks) 计[t.act] = (计[t.act] || 0) + 1;
  说(`\n动作统计: 普攻=${计.평} 大招=${计.궁} 防守=${计.방}`);
  说('\n===== 站点 description 格式（可直接粘贴模拟器）=====');
  说(排程器.导出指令集(toks));
  说('\n===== 紧凑串 =====');
  说(排程器.toks键(toks));
}

// ===================== 主流程 =====================
function main() {
  说('===== 解码候选池 =====');
  const 池 = 建池();
  打印池(池);
  if (参.只解析) { 说('\n[--只解析 干跑结束，未搜索]'); 落盘(); process.exit(0); }
  if (池.length < 5) { 落盘(); process.exit(2); }

  保障机制表();
  const inst = 建引擎(池);

  说('\n===== 阶段 A：全名单×站位 粗评（先验贪心）=====');
  const A = 阶段A(inst, 池);
  if (!A.length) {
    说('无合法队伍（isValidComp 全不过）：通常因池内无治疗，或队长技兼容白名单无解。');
    落盘(); process.exit(3);
  }
  说('\n===== 阶段 B：精排（前瞻贪心+爬山）=====');
  const B = 阶段B(inst, 池, A);
  说('\n===== 阶段 C：深搜（Top 名单×Top 站位+谷底试探）=====');
  const C = 阶段C(inst, 池, A, B);

  // 终搜（完整管线）：取 C 榜前 终搜N 支；终搜=0 则以 C 榜首兜底
  let 最优 = null, 终搜们 = [];
  for (let i = 0; i < Math.min(终搜N, C.length); i++) {
    说(`\n===== 终搜 ${i + 1}/${Math.min(终搜N, C.length)}（搜索队伍.js 全管线）=====`);
    const r = 终搜队(池, C[i], i + 1);
    if (r) 终搜们.push(r);
    if (r && (!最优 || r.dmg > 最优.dmg)) 最优 = r;
    落盘(); // 每队终搜完即落盘，长跑中断不丢成绩
  }
  if (!最优) { // 兜底：C 榜首（含 toks）
    const c0 = C[0];
    最优 = { ids: c0.perm, 名称: c0.perm.map(id => 池.find(p => p.id === id).名), 羁绊: 羁绊序(c0.perm), dmg: c0.dmg, 来源: '阶段C兜底', toks: c0.toks, description: c0.toks ? 排程器.导出指令集(c0.toks) : null };
  }

  说('\n====================================================');
  说(`===== 最优队伍: ${最优.dmg.toLocaleString()}（来源=${最优.来源}）=====`);
  说('====================================================');
  for (let i = 0; i < 5; i++) {
    const p = 池.find(x => x.id === 最优.ids[i]);
    说(`  ${i + 1}号位${i === 0 ? '（队长）' : '（队员）'}: ${最优.名称[i]}  id=${最优.ids[i]}  ${role名[p ? p.role : '?']}  羁绊${最优.羁绊[i]}`);
  }
  渲染指令(最优.ids, 最优.名称, 最优.toks);

  // 导出结构化结果
  fs.writeFileSync(导出路径, JSON.stringify({
    码, 候选池: 池, 阶段排名: { A: A.slice(0, 10).map(r => ({ ids: r.站位[0].perm, dmg: r.站位[0].dmg })), B: B.slice(0, 10).map(r => ({ ids: r.perm, dmg: r.dmg })), C: C.map(r => ({ ids: r.perm, dmg: r.dmg })) },
    终搜: 终搜们.map(r => ({ ids: r.ids, 羁绊: r.羁绊, dmg: r.dmg, 来源: r.来源 })),
    最优: { ids: 最优.ids, 名称: 最优.名称, 羁绊: 最优.羁绊, dmg: 最优.dmg, 来源: 最优.来源, toks: 最优.toks, description: 最优.description },
  }, null, 2), 'utf8');
  说(`\n已导出 JSON: ${导出路径}`);
  说(`总耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  说(`[全输出镜像: ${镜像文件}]`);
  落盘();
}

main();
