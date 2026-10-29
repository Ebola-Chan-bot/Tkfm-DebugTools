'use strict';
/*
 * 搜索队伍.js —— 单队最优指令搜索入口（给定 5 个角色，输出中文最优指令）
 *
 * 定位：与 主程序.js（worker 跨队换人搜索）互补；本脚本是"名单固定（5 人不换）、找最优站位+出手排程"的轻量入口。
 *
 * 站位排列（2026-10-28 起默认启用）：旧版只优化"用户输入站位"的动作顺序，而队长技在位 1、部分技能 po 随站位
 * 生效，同 5 人换个站位上限可能差很多（典型：娜莉 10202 队长技在队内有治疗时给全队 가뎀증 −500%，娜莉当队长
 * 全路径 0 伤害、换个队长立刻恢复）。故默认对 5! = 120 种站位排列做两遍搜索，--原排列 可回到旧行为。
 *   第一遍 粗评：120 站位各跑 先验贪心（约 1 秒），加 DB 同集合种子接种，按伤害排序；
 *   第二遍 深搜：TopK 站位（外加原输入站位保底）各跑完整管线（贪心/前瞻/DB种子/束/四类构造兜底/收敛验证），
 *                按真值 max 取全局最优。总耗时 ≈ 粗评 1s + TopK × 单站位管线耗时，可用 --排列TopK=1 或 --束时限= 控制。
 *   粗评口径与生产 团队搜索器.js 第 2 层一致：必须用 先验贪心 而非 贪心基线（生产 120 站位×精修真值实证：
 *   贪心基线对站位排序≈随机，Top10 命中 0/10、Spearman ρ=-0.031；先验贪心 Top10 命中 10/10、ρ=0.998，成本同级）。
 *   排列用**索引**排列而非值排列：--羁绊= 与角色名必须跟随角色，不能错绑在槽位上（生产链路羁绊全 5 无需处理这点）。
 *
 * 用法（角色 token 可用：id / tenkaassist 简体中文别称(sc) / 繁中(tc) / 英文(en) / 韩文名，任意混合）：
 *   node 搜索队伍.js 莉可菈 苏珊 花矮 暑伊 丧娜
 *   node 搜索队伍.js --ids=10206,10152,10196,10171,10191
 *   node 搜索队伍.js 圣剑 古勇 拉尤 丧伊 觉勇 --束时限=120 --导出=结果.json
 *   node 搜索队伍.js --从文件=队伍.txt        # 文件内每行一个角色，或逗号/空格分隔
 *   node 搜索队伍.js 娜莉 血魔 花魁 兔妈 夜凯 --只粗评      # 1 秒看 120 站位谁最强（含换队长）
 *   node 搜索队伍.js 娜莉 血魔 花魁 兔妈 夜凯 --排列TopK=1 --束时限=60   # 只深搜粗评冠军站位
 *
 * 选项：
 *   --ids=          5 个角色 id，逗号分隔（等价于位置参数，便于绕开 PowerShell 中文参数问题）
 *   --从文件=        从文本文件读角色 token（每行一个，或逗号/空格分隔）
 *   --羁绊=         5 个羁绊等级，逗号分隔（默认 5,5,5,5,5）
 *   --束时限=        束搜索墙钟秒数（默认 180；0=跳过束搜索，仅贪心+爬山，最快）
 *   --束宽=          束搜索宽度（默认 20）
 *   --评分=          束搜索评分口径（默认 sync）
 *   --爬山预算=       单次爬山评估上限（默认 10000）
 *   --禁用种子        不读 data.json 的 DB 种子（纯算法搜索）
 *   --独立相位全相位  独立相位兜底额外启用 A 族（P_k∈[cd_k,2cd_k] × off_k∈[0,cd_k) 全笛卡尔积 =
 *                    ∏(cd_k+1)×cd_k 变体；cd=[3,3,4,4,4] → 1,152,000 变体 ≈1小时/队，仅终搜确认用。
 *                    默认只跑 B 族 13 变体，实测 ≈0.06s/队）
 *   --排列TopK=      粗评后进入完整管线深搜的站位数（默认 3；1=只深搜粗评冠军站位，最快）
 *   --原排列        只优化用户输入站位的动作顺序，不做站位排列（旧行为）
 *   --只粗评        干跑：只打印 120 站位粗评 Top10 就退出（约 1 秒，用于快速看排列空间）
 *   --只解析        干跑：只打印角色映射与队伍画像就退出，不搜索（用于核对别称/排查歧义）
 *   --强制            跳过 isValidComp 生存闸门校验（默认不通过即退出）
 *   --导出=          结果 JSON 输出路径
 *   --输出=          stdout 镜像文本输出路径（默认 %TEMP%/<队名>最优指令.txt）
 *
 * 输出：最优站位（槽1=队长）、站位对比汇总、中文逐回合（槽N+角色名+普攻/大招/防守）、站点 description 格式、紧凑串。
 *       因终端回显在本机不稳定，脚本会把全部输出同时镜像写入 --输出 文件。
 *
 * 退出码：0=成功；2=参数/角色解析错误；3=生存闸门未过且未加 --强制（排列模式=120 站位全部 isValidComp=false）；
 *       4=全部已搜站位零伤害（自动诊断原因后终止）；5=部分完成（某阶段抛异常，已输出+导出崩溃前的跨站位最优，不丢成绩）。
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const 适配 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');
const 名单 = require('./防守名单.js');
const 机制特征 = require('./机制特征.js');
// 兜底口径与 团队搜索器.js（生产链路）一致：谷底试探 K=8、兜底爬山预算≥30000（验证P5：K=8 两轮谷需 ~14-18k 评估，旧预算会撞顶）
const 谷底试探 = 8;
function 兜底爬山预算(爬山预算) { return Math.max(爬山预算 || 0, 30000); }

// ---- 工程内相对路径（随 DebugTools 仓库可移植，不硬编码盘符）----
const 路径 = {
  common: path.resolve(__dirname, '..', '..', 'tenkaassist', 'js', 'common.js'),
  DB: path.resolve(__dirname, '..', '..', 'tenkaassist_data', 'data', 'data.json'),
  机制bin: path.resolve(__dirname, '机制表', 'build', 'mechanisms.bin'),
};

// ---- 输出：既打印又收集，最后整体镜像到文件（本机终端回显不可靠时的兜底）----
const 缓冲行 = [];
const 说 = (...a) => { const s = a.join(' '); process.stdout.write(s + '\n'); 缓冲行.push(s); };
let 输出文件 = null;
// ★ 崩溃兜底（2026-10-09）：任一阶段抛异常时，用这两个模块级变量把「已经找到的最好解」照样输出+导出。
//   历史动机：含 10214万巴 的队曾在**束搜索**深处 RangeError 爆栈（真因＝step/undo 撤销路径不回滚
//   猴子补丁 wrapper/注入表致链深无界累积，已在 多例引擎.js 修复，详见 束搜索 处注释），旧行为＝整支
//   CLI exit 1、该队成绩全丢（全库对标 30 支里丢 2 支）。修复后此兜底转为防御纵深。
let 全局最好 = null;
let 全局上下文 = null;
const 落盘 = () => { if (输出文件) { try { fs.writeFileSync(输出文件, 缓冲行.join('\n'), 'utf8'); } catch (e) {} } };
process.on('uncaughtException', e => { 说('\n!!! 未捕获异常: ' + (e && e.stack || e)); 落盘(); process.exit(1); });
process.on('SIGINT', () => { 说('\n[用户中断，落盘已算部分]'); 落盘(); process.exit(130); });

// ===================== 参数解析 =====================
function 解析参数(argv) {
  const 位置 = [], 选项 = {};
  for (const a of argv.slice(2)) {
    if (typeof a === 'string' && a.startsWith('--')) {
      const m = a.match(/^--([^=]+)(?:=(.*))?$/);
      if (m) 选项[m[1]] = m[2] === undefined ? true : m[2];
    } else 位置.push(a);
  }
  return { 位置, 选项 };
}

// ===================== 别称解析（tenkaassist 口径）=====================
// 数据源：common.js 的 translate 对象（"韩文名":{en,sc,tc,jp}）+ 引擎角色表 chJSON.data（id↔韩文name↔fullname）。
// 不 new Function 求值 common.js（它依赖 localStorage/document 等浏览器 API），改用文本正则精确提取 translate。
let _别名索引 = null;
function 建别名索引() {
  if (_别名索引) return _别名索引;
  const 表 = 适配.角色表();                                  // [{id,name(韩文短名),fullname,role,element,rarity,...}]
  const 韩名指id = new Map(), id指全名 = new Map(), 角色韩名集 = new Set();
  for (const c of 表) {
    if (!c || c.id == null || !c.name) continue;
    韩名指id.set(c.name, c.id); id指全名.set(c.id, c.fullname || c.name); 角色韩名集.add(c.name);
  }
  // translate：键为韩文名，值含 sc/tc/en；只取键∈角色韩名集的条目（精确过滤掉 UI 文案）
  const 韩名指别名 = new Map();                               // 韩文名 → {sc,tc,en}
  const common = fs.readFileSync(路径.common, 'utf8');
  const re = /"([^"]+)"\s*:\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(common))) {
    const 韩名 = m[1], 体 = m[2];
    if (!角色韩名集.has(韩名)) continue;
    const sc = (体.match(/\bsc\s*:\s*"([^"]*)"/) || [])[1];
    const tc = (体.match(/\btc\s*:\s*"([^"]*)"/) || [])[1];
    const en = (体.match(/\ben\s*:\s*"([^"]*)"/) || [])[1];
    韩名指别名.set(韩名, { sc, tc, en });
  }
  // id → 中文别称（优先 sc，回退 tc、fullname）
  const id指别称 = new Map();
  for (const [韩名, b] of 韩名指别名) {
    const id = 韩名指id.get(韩名);
    if (id != null) id指别称.set(id, b.sc || b.tc || id指全名.get(id) || 韩名);
  }
  // 反查索引：小写别名 → 命中 id 集合（sc/tc/en 各建一路）
  const 别称指ids = new Map();
  const 加 = (键, id) => { if (!键) return; const k = String(键).toLowerCase(); if (!别称指ids.has(k)) 别称指ids.set(k, new Set()); 别称指ids.get(k).add(id); };
  for (const [韩名, b] of 韩名指别名) { const id = 韩名指id.get(韩名); if (id == null) continue; 加(b.sc, id); 加(b.tc, id); 加(b.en, id); 加(韩名, id); }
  // 全部 (id, 别名列表) 供子串兜底
  const 全体 = [];
  for (const [韩名, b] of 韩名指别名) { const id = 韩名指id.get(韩名); if (id != null) 全体.push({ id, 名: [b.sc, b.tc, b.en, 韩名].filter(Boolean) }); }
  _别名索引 = { 韩名指id, id指全名, id指别称, 别称指ids, 全体 };
  return _别名索引;
}

// 解析单个角色 token → {id, 别称} 或 {错误} 或 {歧义:[...]}
function 解析角色(token) {
  const 索 = 建别名索引();
  const s = String(token).trim();
  if (/^\d+$/.test(s)) {                                      // 纯数字 = id
    const id = Number(s);
    if (!索.id指全名.has(id)) return { 错误: `id ${id} 不在角色表中` };
    return { id, 别称: 索.id指别称.get(id) || 索.id指全名.get(id) };
  }
  const k = s.toLowerCase();
  if (索.别称指ids.has(k)) {                                   // 精确命中（sc/tc/en/韩文名）
    const set = [...索.别称指ids.get(k)];
    if (set.length === 1) { const id = set[0]; return { id, 别称: 索.id指别称.get(id) || s }; }
    return { 歧义: `"${s}" 命中多个角色: ` + set.map(id => `${id}(${索.id指别称.get(id) || 索.id指全名.get(id)})`).join(' ') };
  }
  const 命中 = 索.全体.filter(e => e.名.some(n => n && n.toLowerCase().includes(k)));   // 子串兜底
  if (命中.length === 1) { const id = 命中[0].id; return { id, 别称: 索.id指别称.get(id) || s, 子串: true }; }
  if (命中.length > 1) return { 歧义: `"${s}" 子串命中多个角色: ` + 命中.slice(0, 12).map(e => `${e.id}(${索.id指别称.get(e.id) || '?'})`).join(' ') + (命中.length > 12 ? ' …' : '') };
  return { 错误: `"${s}" 未匹配到任何角色（tenkaassist sc/tc/en/韩文名/id）` };
}

// ===================== 零伤害自动诊断 =====================
/* 全路径 dmg=0 的自动归因：
 * 1) 扫永久负值伤害 buff（队长技/被动常挂的 가뎀증 等，size≤-100% 会把伤害乘区打负 → 引擎按公式归 0）；
 * 2) 队长轮换隔离：把每个角色轮流放到槽1（队长位），固定全普攻重放，观察伤害是否恢复——恢复=原队长技
 *    与当前阵容冲突（实证案例：娜莉10202 队长技「악의 왕의 명령3」在队内有힐治疗时给全队 가뎀증 −500%）；
 * 3) 阵容画像：힐(治疗) 计数——多数"禁治疗"队长技的触发条件。 */
function 零伤害诊断(inst, ids, 名称, 羁绊) {
  说('\n===== 零伤害诊断 =====');
  const ROLE中文 = ['딜主C', '힐治疗', '탱坦克', '섶辅助', '디减益'];
  const 角色 = ids.map(id => 适配.角色数据().getCharacter(id) || {});
  说(`阵容画像: ` + ids.map((id, i) => `${名称[i]}=${ROLE中文[角色[i].role] ?? 角色[i].role}`).join(' '));
  const 治疗数 = 角色.filter(c => c.role === 1).length;

  const ok = inst.increment.initBattle(ids, 羁绊, -1, null);
  if (!ok) { 说('initBattle 失败：该队无法构建（角色数据缺失或 ok=false）'); return; }

  // 1) 永久负值伤害 buff 扫描
  let 抓到减益 = false;
  for (let i = 0; i < 5; i++) {
    const u = inst.internals.comp[i];
    if (!u || !Array.isArray(u.buff)) continue;
    for (const b of u.buff) {
      if (typeof b.size === 'number' && b.size <= -100 && b.on !== false && /뎀증|발효증/.test(b.type || '')) {
        说(`[发现] 槽${i + 1}${名称[i]} 挂永久减益: [${b.type} size=${b.size}% name=${b.name}] → 伤害乘区为负，引擎按公式强制归 0`);
        抓到减益 = true;
        break;   // 每人报一条即可，全队共享的 buff 会逐人命中
      }
    }
  }

  // 2) 队长轮换隔离（固定全普攻重放，绕过排程因素）
  const 全普攻 = [];
  for (let s = 0; s < 65; s++) 全普攻.push({ idx: s % 5, act: '평' });
  说('\n队长轮换隔离（全队固定普攻重放 13 回合）:');
  let 可恢复 = null;
  for (let L = 0; L < 5; L++) {
    const 轮换ids = ids.slice(L).concat(ids.slice(0, L));
    const 轮换名 = 名称.slice(L).concat(名称.slice(0, L));
    const d = inst.increment.fastReplay(轮换ids, 全普攻, 羁绊, -1, null);
    const 标记 = L === 0 ? '(原队长)' : '';
    说(`  ${轮换名[0]} 当队长${标记}: dmg=${d.toLocaleString()}`);
    if (L > 0 && d > 0 && !可恢复) 可恢复 = { 队长: 轮换名[0], 站位id: 轮换ids[0] };
  }

  // 3) 结论
  说('\n诊断结论:');
  if (抓到减益 && 可恢复) {
    说(`  原队长（${名称[0]}）的队长技与当前阵容冲突：给全队挂了永久负值伤害 buff（常见条件如"队内含힐治疗≥1"，本队治疗数=${治疗数}）。`);
    说(`  → 建议：换队长试算（实测 ${可恢复.队长} 当队长时伤害恢复正常），或把 ${名称[0]} 挪到队员位，或移除队内治疗。`);
  } else if (抓到减益) {
    说(`  存在永久负值伤害 buff（治疗数=${治疗数}），且任意队长轮换均未恢复——减益可能被多个角色共享条件触发，需人工排查机制表。`);
  } else if (可恢复) {
    说(`  未发现负值 buff 但换队长可恢复（${可恢复.队长}）——原队长的其它机制（非 buff 形态）抑制了全队输出，需人工排查。`);
  } else {
    const 全无倍率 = ids.every((id, i) => !角色[i].atkMag && !角色[i].ultMag);
    if (全无倍率) 说('  全队 atkMag 与 ultMag 均为 0（无输出型角色）——该队天生打不出伤害。');
    else 说('  未发现单一归因：任意队长+全普攻重放均为 0，可能是被动触发型机制（如按行动/回合挂减益），需人工排查机制表与 buff 轨迹。');
  }
}

// ===================== DB 种子 =====================
// 模块级缓存：排列模式下 TopK 站位各跑一次完整管线，每站位的 DB 种子阶段都会调 读DB()，不能重复解压 67563 条目
let _DB缓存 = null;
function 读DB() {
  if (_DB缓存) return _DB缓存;
  try {
    const b = fs.readFileSync(路径.DB);
    let r; try { r = zlib.gunzipSync(b); } catch (e) { r = zlib.inflateSync(b); }
    _DB缓存 = JSON.parse(r.toString('utf8').replace(/^﻿/, ''));
    return _DB缓存;
  } catch (e) { return null; }
}

// ===================== 站位排列 =====================
// 索引排列生成器：产出 [0..n-1] 的全部 n! 种排列（字典序）。用索引而不用角色 id 值，是为了让名称/羁绊
// 能按同一排列同步重排（跟随角色），且重复 id 也不会产生重复站位。
function* 索引排列(n) {
  const used = new Array(n).fill(false), cur = [];
  function* rec() {
    if (cur.length === n) { yield cur.slice(); return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(i);
      yield* rec();
      cur.pop(); used[i] = false;
    }
  }
  yield* rec();
}

// 把某个站位的 ids 映射回用户输入的角色信息（名称/羁绊跟随角色而非槽位）。
// 仅 DB 种子路径使用（索引排列路径有精确索引，无需反查）；同 id 重复时取第一个匹配位。
function 站位信息(站位ids, ids, 名称, 羁绊) {
  const 名 = [], 羁 = [];
  for (const id of 站位ids) {
    const j = ids.indexOf(id);
    名.push(j >= 0 ? 名称[j] : String(id));
    羁.push(j >= 0 ? 羁绊[j] : 5);
  }
  return { 名称: 名, 羁绊: 羁 };
}

/* 站位粗评：120 站位 × 先验贪心 + DB 同集合种子接种，按伤害降序返回候选池。
 * 返回 {列:[{ids,名称,羁绊,toks,dmg,来源}], 合法站位数, 评估数}；列已按 dmg 降序。
 * 与生产 团队搜索器.js 同口径的两点：isValidComp 按站位过滤（队长技依赖位 1）、粗评用 先验贪心。
 * DB 同集合种子额外入池的价值：先验贪心排名不高的站位，可能正是 DB 玩家验证过的强站位（种子里带真实排程），
 * 只靠贪心粗评会把这类站位剪在 TopK 之外；接种成本仅是同集合几条记录的解析+重放。 */
function 排列粗评(inst, ids, 名称, 羁绊, 设置) {
  const t0 = Date.now();
  const 池 = new Map();   // 站位键 → {ids,名称,羁绊,toks,dmg,来源}（同站位保留伤害更高者）
  const 收 = (站位ids, 信息, toks, dmg, 来源) => {
    if (!toks || !(dmg > 0)) return;
    const k = 站位ids.join(',');
    const 旧 = 池.get(k);
    if (!旧 || dmg > 旧.dmg) 池.set(k, { ids: 站位ids, 名称: 信息.名称, 羁绊: 信息.羁绊, toks, dmg, 来源 });
  };
  let 合法站位数 = 0, 评估数 = 0;
  for (const 序 of 索引排列(5)) {
    const pIds = 序.map(i => ids[i]);
    if (!设置.强制 && !适配.isValidComp(pIds)) continue;   // S1 生存闸门按站位（队长技依赖位 1）
    合法站位数++;
    const 信息 = { 名称: 序.map(i => 名称[i]), 羁绊: 序.map(i => 羁绊[i]) };
    const g = 排程器.先验贪心(inst, pIds, 信息.羁绊);
    评估数++;
    if (g && g.toks && g.toks.length >= 65) 收(pIds, 信息, g.toks, g.dmg, '先验贪心');
  }
  // DB 同集合种子接种（站位可能与贪心 TopK 不同；羁绊按种子站位上的角色重排）
  let 种子条数 = 0;
  if (!设置.禁用种子) {
    const DB = 读DB();
    if (DB) {
      const 目标键 = ids.slice().sort((a, b) => a - b).join(',');
      for (const d of DB) {
        const a = String(d.compstr).trim().split(/\s+/).map(Number);
        if (a.length !== 5) continue;
        if (a.slice().sort((x, y) => x - y).join(',') !== 目标键) continue;
        if (!设置.强制 && !适配.isValidComp(a)) continue;
        const 信息 = 站位信息(a, ids, 名称, 羁绊);
        const t = 排程器.解析指令集(inst, a, d.description || '', 信息.羁绊);
        if (!t) continue;
        const dmg = 排程器.重放(inst, a, t, 信息.羁绊);
        if (dmg > 0) { 收(a, 信息, t, dmg, `DB条目${d.id}`); 种子条数++; }
      }
    }
  }
  const 列 = [...池.values()].sort((a, b) => b.dmg - a.dmg);
  说(`\n站位粗评完成: 合法站位=${合法站位数}/120 贪心评估=${评估数} DB同集合种子=${种子条数}条 有效候选=${列.length}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return { 列, 合法站位数, 评估数 };
}

// ===================== 搜索管线 =====================
function 搜索队伍(inst, ids, 名称, 羁绊, 设置) {
  const 重放 = toks => 排程器.重放(inst, ids, toks, 羁绊);
  let 最好 = null;
  const 取优 = (来源, r) => { if (r && r.dmg > 0 && (!最好 || r.dmg > 最好.dmg)) { 最好 = { 来源, toks: r.toks, dmg: r.dmg }; 全局最好 = 最好; } };

  说('\n===== 搜索管线 =====');
  const g = 排程器.先验贪心(inst, ids, 羁绊); 取优('先验贪心', g);
  说(`先验贪心        = ${g ? g.dmg.toLocaleString() : '失败'}`);

  const f = 排程器.先验前瞻贪心(inst, ids, 羁绊, {}); 取优('前瞻贪心', f);
  说(`前瞻贪心        = ${f ? f.dmg.toLocaleString() : '失败'}${f ? ' 前瞻=' + f.前瞻次数 : ''}`);
  if (f) { const h = 排程器.爬山(inst, ids, f.toks, 羁绊, 设置.爬山预算); 取优('前瞻+爬山', h); 说(`前瞻+爬山       = ${h.dmg.toLocaleString()} 评估=${h.评估}`); }

  // DB 种子（同站位同序条目）
  if (!设置.禁用种子) {
    const DB = 读DB();
    if (DB) {
      const 种子 = [];
      for (const d of DB) {
        const a = String(d.compstr).trim().split(/\s+/).map(Number);
        if (a.length !== 5 || a.join(',') !== ids.join(',')) continue;
        const t = 排程器.解析指令集(inst, ids, d.description || '', 羁绊);
        const dmg = t ? 重放(t) : 0;
        if (t && dmg > 0) 种子.push({ 来源: `DB条目${d.id}(${d.name})`, toks: t, dmg, ranking: d.ranking });
      }
      if (种子.length) {
        说(`\nDB种子(${种子.length}条同站位):`);
        for (const s of 种子) {
          说(`  ${s.来源} ranking=${s.ranking} 重放=${s.dmg.toLocaleString()}`);
          const h = 排程器.爬山(inst, ids, s.toks, 羁绊, 设置.爬山预算); 取优(s.来源 + '+爬山', h);
          说(`  → +爬山=${h.dmg.toLocaleString()} 评估=${h.评估}`);
        }
      } else 说('\nDB种子: 无同站位同序条目');
    } else 说('\nDB种子: data.json 读取失败，跳过');
  }

  // 束搜索（0=跳过）
  // ★ 阶段级降级（2026-10-09；**根因已于同日修复，此保护转为防御纵深**）：
  //   当初含 10214万巴 的队在此崩（RangeError 爆栈，A机制表/B原生两口径 6/6 全崩；探索深度达标即崩：
  //   w20/180s 必崩 32~135s、w20/30s 侥幸不崩、w6/20s 不崩但返回垃圾值 2.05亿 vs 先验 283亿）。
  //   真因＝step/undo 撤销路径不回滚猴子补丁 wrapper 与机制表注入表（多例引擎.js 的 saveCur/loadBefore
  //   快照只含数据字段），链深随探索次数无界增长（实测单场 8918 层）——**不是**「追加攻击链无限递归」。
  //   已在 多例引擎.js 补方法层快照回滚（与 P0 的 captureState 修复同构）⇒ 修复后同配置束搜索 9~20s
  //   正常完成（崩队1 束搜索 293.10亿 +爬山 293.27亿 ≥ DB 293.26亿；崩队2 束搜索 293.15亿 ≈ DB 293.17亿）。
  //   此 try/catch 保留：崩了只跳过本阶段、其余阶段照常跑（真值 max 取优不影响正确性），防其它未知爆栈点。
  if (设置.束时限 > 0) {
    const t0 = Date.now();
    try {
      const b = 排程器.束搜索(inst, ids, 羁绊, { width: 设置.束宽, 评分: 设置.评分, 时限秒: 设置.束时限 });
      说(`\n束搜索(w${设置.束宽},${设置.束时限}s) = ${b ? b.dmg.toLocaleString() : '失败'} 扩展=${b ? b.扩展数 : 0} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      if (b) { 取优('束搜索', b); const h = 排程器.爬山(inst, ids, b.toks, 羁绊, 设置.爬山预算); 取优('束搜索+爬山', h); 说(`束搜索+爬山     = ${h.dmg.toLocaleString()} 评估=${h.评估}`); }
    } catch (e) {
      说(`\n束搜索(w${设置.束宽},${设置.束时限}s) = ★异常降级 ${e && e.constructor.name}: ${String(e && e.message || e).slice(0, 70)}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      说('  → 本阶段跳过，其余阶段照常（真值 max 取优）。注意：含 10214(万巴) 队的爆栈根因已于 2026-10-09 修复（step/undo 方法层回滚，多例引擎.js），此提示仅在其它未知爆栈点触发时出现。');
      说('  → 若确需束搜索参与，可降 --束时限（实测 30s 不崩）或降 --束宽；根因修复属引擎侧另行处理。');
    }
  } else 说('\n束搜索: 已跳过（--束时限=0）');

  // ===== 构造兜底（与 团队搜索器.js 生产链路同口径，按真值 max 取优 → 只增不减零回退）=====
  // 闸门同生产：需相位规划（注入/CD改写队）跑相位兜底；需窗规划（周期∧CD改写）跑窗对齐兜底。
  // 窗对齐构造含 {憋,准}×{평,방} 四变体/S（방优先变体：_실험N/94队实证 94.85→99.65，生产TopK3下自动入选）。
  const 兜底预算 = 兜底爬山预算(设置.爬山预算);
  if (机制特征.需相位规划(ids)) {
    // 档间去重（同 内层benchmark/团队搜索器）：实验L 实证 5/8/99 同解，_探针相位重复 坐实 toks 级相同
    //   （5/5 样本队档5=档99 构造完全一致）⇒ 第二档爬山是纯重复。max 取优不变，只省时间。
    const 见构 = new Set();
    for (const 憋 of [5, 99]) {   // 相位对齐档位（实验L：5/8/99几乎同解）
      const t0 = Date.now();
      const g2 = 排程器.相位对齐构造(inst, ids, 羁绊, { 最大憋: 憋 });
      if (!g2 || !(g2.dmg > 0)) continue;
      const 键 = 排程器.toks键(g2.toks);
      if (见构.has(键)) { 说(`相位兜底(憋${憋})   = 与憋5构造相同，跳过重复爬山`); continue; }
      见构.add(键);
      const gh = 排程器.爬山(inst, ids, g2.toks, 羁绊, 兜底预算, null, null, 谷底试探);
      const 终 = (gh && gh.dmg > g2.dmg) ? gh.dmg : g2.dmg;
      取优(`相位对齐(憋${憋})`, 终 > g2.dmg ? gh : g2);
      说(`相位兜底(憋${憋})   = ${终.toLocaleString()} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    // 节拍对齐兜底（与生产同闸门：需相位规划；节拍兜底=保守兜底子档，见 团队搜索器.js line130）
    const t0b = Date.now();
    const 节拍候选 = 排程器.节拍对齐构造(inst, ids, 羁绊, { TopK: 3 });
    let 节拍最好 = 0;
    for (const 构 of 节拍候选) {
      const gh = 排程器.爬山(inst, ids, 构.toks, 羁绊, 兜底预算, null, null, 谷底试探);
      const 终 = (gh && gh.dmg > 构.dmg) ? gh.dmg : 构.dmg;
      if (终 > 节拍最好) 节拍最好 = 终;
      取优('节拍对齐', 终 > 构.dmg ? gh : 构);
    }
    说(`节拍兜底(TopK${节拍候选.length}) = ${节拍最好.toLocaleString()} ${((Date.now() - t0b) / 1000).toFixed(0)}s`);
  }
  if (机制特征.需相位规划(ids)) {   // 闸门放宽: 与保守兜底同闸门(97.9队实证需窗规划=false会漏窗对齐兜底)
    const t0c = Date.now();
    // 窗对齐爬山预算模式：内部对全部爬山候选({憋,准}×{평,방}四变体/S, dmgTopK∪机制窗Top6)逐个爬山取真值max（与内层benchmark/团队搜索器同口径）
    const r0 = 排程器.窗对齐构造(inst, ids, 羁绊, { TopK: 3, 爬山预算: 兜底预算, 谷底试探 });
    let r = r0;
    if (r0 && r0.dmg > 0) {
      // +终局整回合序重排（_实验O：窗对齐+爬山后仍卡的序深谷，~10s；真值max取优）
      const o = 排程器.整回合序重排(inst, ids, r0.toks, 羁绊);
      if (o && o.dmg > r0.dmg) r = { toks: o.toks, dmg: o.dmg, 来源: '窗对齐+序重排:' + r0.来源 };
      取优('窗对齐', r);
      说(`窗对齐兜底      = ${r.dmg.toLocaleString()} [${r.来源}] ${((Date.now() - t0c) / 1000).toFixed(0)}s`);
    } else 说('窗对齐兜底      = 无有效构造');
  } else 说('窗对齐兜底: 跳过（需相位规划=false，队内无CD改写/注入机制）');

  // 独立相位兜底（混窗起点族：伤害角色按自身 cd 放满 + buff/治疗按全局窗憋招；详见 排程器.独立相位构造 文件头）。
  //   CLI 是单队定向深搜，成本可承受 ⇒ 此处**无闸门**（生产 团队搜索器.js 为控海量名单成本默认跟保守兜底闸门）。
  //   2026-10-08 实证：DB 对标 4 支未达标队的缺口是"起点族不完整"（邻域不可达：束 45s→300s 一字不变、
  //   编辑球 r=1/r=2 无更优、全局序重排↔爬山∞ 零提升），补 B族 13 变体后 4/4 达标（+3.74~+13.62亿）。
  {
    const t0d = Date.now();
    const 独候 = 排程器.独立相位构造(inst, ids, 羁绊, { TopK: 3, 全相位: !!设置.独立相位全相位 });
    let 独终 = null, 独源 = '';
    for (const 构 of 独候) {
      const gh = 排程器.爬山(inst, ids, 构.toks, 羁绊, 兜底预算, null, null, 谷底试探);
      const 终 = (gh && gh.dmg > 构.dmg) ? gh : 构;
      if (!独终 || 终.dmg > 独终.dmg) { 独终 = 终; 独源 = 构.族; }
    }
    let 独最 = 0;
    if (独终) {
      独最 = 独终.dmg;
      取优('独立相位:' + 独源, 独终);
      // 终局整回合序重排（与窗对齐兜底同构：混窗解常伴随回合内序深谷）
      const o = 排程器.整回合序重排(inst, ids, 独终.toks, 羁绊);
      if (o && o.dmg > 独最) { 独最 = o.dmg; 取优('独立相位+序重排:' + 独源, o); }
    }
    说(`独立相位兜底(TopK${独候.length}) = ${独最.toLocaleString()}${独源 ? ' [' + 独源 + ']' : ''} ${((Date.now() - t0d) / 1000).toFixed(0)}s`);
  }

  // 全路径 0 伤害：不是排程问题，继续爬山/编辑球无意义，直接返回 null 由主流程给出可诊断提示
  if (!最好) {
    说('\n所有搜索路径 dmg=0（引擎模拟该队造不出伤害），跳过收敛验证。');
    return null;
  }

  // 自然收敛 + 编辑球邻域验证
  const hi = 排程器.爬山(inst, ids, 最好.toks, 羁绊, Infinity); 取优(最好.来源 + '+自然收敛', hi);
  说(`自然收敛        = ${hi.dmg.toLocaleString()} 评估=${hi.评估} 提升=${hi.提升}`);
  for (const r of [1, 2]) {
    let n = 0, best = 最好.dmg;
    排程器.编辑球层(inst, ids, 最好.toks, 羁绊, r, (t, d) => { n++; if (d > best) best = d; }, Infinity);
    说(`编辑球r=${r}       穷举=${n} 最高=${best.toLocaleString()} 更优=${best > 最好.dmg ? '有' : '无'}`);
  }
  return 最好;
}

// ===================== 结果输出 =====================
function 输出结果(最好, ids, 名称) {
  const 动作 = { '평': '普攻', '궁': '大招', '방': '防守' };
  说(`\n===== 最终最优: ${最好.dmg.toLocaleString()} 来源=${最好.来源} =====`);

  说('\n---- 中文逐回合 ----');
  const 回合数 = Math.round(最好.toks.length / 5);
  for (let r = 0; r < 回合数; r++) {
    const 段 = 最好.toks.slice(r * 5, r * 5 + 5).map(t => `槽${t.idx + 1}${名称[t.idx]}${动作[t.act] || t.act}`);
    说(`第${String(r + 1).padStart(2)}回合: ` + 段.join(' > '));
  }

  说('\n---- 站点 description 格式（可直接粘贴模拟器）----');
  说(排程器.导出指令集(最好.toks));

  说('\n---- 紧凑串 ----');
  说(排程器.toks键(最好.toks));

  // 动作统计
  const 计 = { 평: 0, 궁: 0, 방: 0 };
  for (const t of 最好.toks) 计[t.act] = (计[t.act] || 0) + 1;
  说(`\n动作统计: 普攻=${计.평} 大招=${计.궁} 防守=${计.방}`);
}

// ===================== 主流程 =====================
function main() {
  const { 位置, 选项 } = 解析参数(process.argv);

  // 收集角色 token：位置参数 + --ids= + --从文件=
  let tokens = [];
  if (选项.ids) tokens.push(...String(选项.ids).split(/[,\s]+/).filter(Boolean));
  tokens.push(...读角色文件(选项.从文件));
  tokens.push(...位置);
  if (tokens.length !== 5) {
    console.error(`需要恰好 5 个角色，当前收到 ${tokens.length} 个: [${tokens.join(', ')}]`);
    console.error('用法: node 搜索队伍.js 角色1 角色2 角色3 角色4 角色5   或   --ids=id1,id2,...   或   --从文件=队伍.txt');
    process.exit(2);
  }

  // 解析每个 token → id
  const ids = [], 名称 = [], 错误们 = [];
  for (const tk of tokens) {
    const r = 解析角色(tk);
    if (r.错误 || r.歧义) { 错误们.push(r.错误 || r.歧义); continue; }
    ids.push(r.id); 名称.push(r.别称 || String(r.id));
  }
  if (错误们.length) { console.error('角色解析失败:\n  ' + 错误们.join('\n  ')); process.exit(2); }
  if (ids.length !== 5) { console.error('解析后角色数≠5'); process.exit(2); }

  // 羁绊
  let 羁绊 = [5, 5, 5, 5, 5];
  if (选项.羁绊) { const b = String(选项.羁绊).split(/[,\s]+/).map(Number); if (b.length === 5 && b.every(x => x >= 1 && x <= 5)) 羁绊 = b; else console.error('--羁绊 格式非法，回退默认全 5'); }

  const 选项规范 = {
    束时限: 选项.束时限 == null ? 180 : Number(选项.束时限),
    束宽: 选项.束宽 == null ? 20 : Number(选项.束宽),
    评分: 选项.评分 == null ? 'sync' : String(选项.评分),
    爬山预算: 选项.爬山预算 == null ? 10000 : Number(选项.爬山预算),
    禁用种子: 选项.禁用种子 === true || 选项.禁用种子 === 'true' || 选项.禁用种子 === '1',
    独立相位全相位: 选项.独立相位全相位 === true || 选项.独立相位全相位 === 'true' || 选项.独立相位全相位 === '1',
    强制: 选项.强制 === true || 选项.强制 === 'true' || 选项.强制 === '1',
    排列TopK: 选项.排列TopK == null ? 3 : Math.max(1, Number(选项.排列TopK) || 3),
    原排列: 选项.原排列 === true || 选项.原排列 === 'true' || 选项.原排列 === '1',
    只粗评: 选项.只粗评 === true || 选项.只粗评 === 'true' || 选项.只粗评 === '1',
  };

  // 输出文件
  输出文件 = 选项.输出 ? String(选项.输出) : path.join(process.env.TEMP || __dirname, `${名称.join('')}_最优指令.txt`);

  说('===== 队伍解析 =====');
  for (let i = 0; i < 5; i++) 说(`  槽${i + 1}: ${名称[i]}  id=${ids[i]}  (输入="${tokens[i]}")`);

  // 队伍机制画像（role/cd/倍率与站位无关，按输入顺序打印一次即可；
  //   isValidComp 与防守禁用槽位依赖站位——排列模式下逐站位另算，这里只报输入站位供参考）
  const inst = 适配.createEngine({ 启用机制表: { binPath: 路径.机制bin } });
  说('\n===== 机制画像（按输入顺序）=====');
  for (let i = 0; i < 5; i++) {
    const c = 适配.角色数据().getCharacter(ids[i]);
    const fete = 排程器.特征.get(ids[i]) || {};
    const 可模拟 = !!(c && c.ok === true && c.rarity === 3 && c.hp);
    说(`  槽${i + 1} ${名称[i]}(${ids[i]}) 可模拟=${可模拟} role=${fete.role} cd=${fete.cd} ultMag=${fete.ultMag} atkMag=${fete.atkMag} 防守机制=${名单.有防守机制(ids[i])}`);
  }
  说(`  输入站位 isValidComp=${适配.isValidComp(ids)} 防守分层=${名单.分层(ids)} 禁用防守槽位=[${名单.计算禁用防守(ids).map(x => x ? 1 : 0).join('')}]`);

  if (选项.只解析 === true || 选项.只解析 === 'true' || 选项.只解析 === '1') {
    说('\n[--只解析 干跑结束，未搜索]');
    落盘(); process.exit(0);
  }

  // 搜索
  const t起 = Date.now();
  let 最优 = null;   // {最好, ids, 名称, 羁绊}：跨站位的全局最优

  if (选项规范.原排列) {
    // ---- 单站位模式（--原排列）：旧行为，只优化当前站位的动作顺序 ----
    if (!选项规范.强制 && !适配.isValidComp(ids)) {
      说('\nisValidComp=false（队长技兼容白名单未过），该阵容无法生存，搜索无意义。如确需强跑加 --强制，或去掉 --原排列 让排列搜索换个合法站位。');
      落盘(); process.exit(3);
    }
    全局上下文 = { ids, 名称, 羁绊, 导出: 选项.导出 };      // ★ 崩溃兜底用（见文件末 catch）
    const 最好 = 搜索队伍(inst, ids, 名称, 羁绊, 选项规范);
    if (最好 && 最好.toks) 最优 = { 最好, ids, 名称, 羁绊 };
  } else {
    // ---- 排列模式（默认）：120 站位粗评 → TopK 站位（+原站位保底）各跑完整管线 ----
    const 粗 = 排列粗评(inst, ids, 名称, 羁绊, 选项规范);
    if (!粗.合法站位数) {
      说('\n120 种站位排列全部 isValidComp=false（队长技兼容白名单未过），无合法站位可搜。如确需强跑加 --强制。');
      落盘(); process.exit(3);
    }
    if (!粗.列.length) {
      说('\n所有合法站位的先验贪心与 DB 种子均为 0 伤害，直接进入归因诊断。');
      零伤害诊断(inst, ids, 名称, 羁绊);
      说(`总耗时 ${((Date.now() - t起) / 1000).toFixed(1)}s`);
      落盘(); process.exit(4);
    }
    说(`\n===== 站位粗评 Top10（有效候选 ${粗.列.length} / 合法站位 ${粗.合法站位数}，槽1=队长）=====`);
    粗.列.slice(0, 10).forEach((s, i) => {
      说(`  #${String(i + 1).padStart(2)} ${s.名称.join(' > ')}  粗评=${s.dmg.toLocaleString()} [${s.来源}]`);
    });
    if (选项规范.只粗评) {
      说('\n[--只粗评 干跑结束，未深搜]');
      说(`总耗时 ${((Date.now() - t起) / 1000).toFixed(1)}s`);
      说(`\n[stdout 镜像已写: ${输出文件}]`);
      落盘(); process.exit(0);
    }

    // 深搜名单 = 粗评 TopK + 原输入站位保底（用户明确给出的站位，即使粗评不靠前也不能跳过）
    const 深搜 = 粗.列.slice(0, 选项规范.排列TopK);
    const 原键 = ids.join(',');
    if (!深搜.some(s => s.ids.join(',') === 原键)) {
      const 原 = 粗.列.find(s => s.ids.join(',') === 原键);
      if (原) { 深搜.push(原); 说(`\n原输入站位粗评未进 Top${选项规范.排列TopK}，仍保底深搜（粗评=${原.dmg.toLocaleString()}）`); }
      else 说('\n原输入站位不在有效候选池中（isValidComp=false 或先验贪心 0 伤害），按 TopK 站位深搜');
    }
    说(`\n将深搜 ${深搜.length} 个站位，每站位跑完整管线（可用 --排列TopK= 或 --束时限= 控制总耗时）`);

    const 汇总 = [];
    for (let k = 0; k < 深搜.length; k++) {
      const s = 深搜[k];
      说(`\n########## 站位 ${k + 1}/${深搜.length}: ${s.名称.join(' > ')}  (粗评=${s.dmg.toLocaleString()} ${s.来源}) ##########`);
      全局上下文 = { ids: s.ids, 名称: s.名称, 羁绊: s.羁绊, 导出: 选项.导出 };
      const 最好 = 搜索队伍(inst, s.ids, s.名称, s.羁绊, 选项规范);
      汇总.push({ 站位: s, 最好 });
      if (最好 && 最好.toks && (!最优 || 最好.dmg > 最优.最好.dmg)) {
        最优 = { 最好, ids: s.ids, 名称: s.名称, 羁绊: s.羁绊 };
        全局最好 = 最好;   // 崩溃兜底始终指向跨站位最优，而非当前站位的部分结果
      }
    }
    说('\n===== 站位对比汇总（按最终真值降序）=====');
    汇总.filter(x => x.最好).sort((a, b) => b.最好.dmg - a.最好.dmg).forEach((x, i) => {
      说(`  #${i + 1} ${x.站位.名称.join(' > ')}  最终=${x.最好.dmg.toLocaleString()} 来源=${x.最好.来源}  (粗评=${x.站位.dmg.toLocaleString()})`);
    });
    for (const x of 汇总) if (!x.最好) 说(`  (0 伤害) ${x.站位.名称.join(' > ')}`);
  }

  if (!最优) {
    // 全路径 0/无解：不崩溃，自动归因（队长技惩罚、全队无倍率等游戏机制原因最常见）
    零伤害诊断(inst, ids, 名称, 羁绊);
    说('\n该队（含全部已搜站位）无法产生伤害，搜索终止（退出码 4）。这不是排程问题；请参照上方诊断结论调整阵容（换队长/去触发源）。');
    说(`总耗时 ${((Date.now() - t起) / 1000).toFixed(1)}s`);
    落盘(); process.exit(4);
  }

  // 输出
  if (!选项规范.原排列) 说(`\n最优站位（槽1=队长）: ${最优.名称.map((n, i) => `槽${i + 1}${n}`).join(' ')}`);
  输出结果(最优.最好, 最优.ids, 最优.名称);
  说(`\n总耗时 ${((Date.now() - t起) / 1000).toFixed(1)}s`);

  // 导出 JSON
  if (选项.导出) {
    fs.writeFileSync(String(选项.导出), JSON.stringify({ ids: 最优.ids, 名称: 最优.名称, 羁绊: 最优.羁绊, 输入站位ids: ids, dmg: 最优.最好.dmg, 来源: 最优.最好.来源, toks: 最优.最好.toks, description: 排程器.导出指令集(最优.最好.toks) }, null, 2), 'utf8');
    说(`已导出 JSON: ${选项.导出}`);
  }
  说(`\n[stdout 镜像已写: ${输出文件}]`);
  落盘();
}

// --从文件= 辅助：读文本，按行/逗号切 token（缺省返回空）
function 读角色文件(路径参数) {
  if (!路径参数) return [];
  const txt = fs.readFileSync(String(路径参数), 'utf8');
  return txt.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
}

try {
  main();
} catch (e) {
  说('\n!!! 异常: ' + (e && e.stack || e));
  // ★ 部分成绩兜底：崩在任何阶段都仍把「已完成阶段的最优」输出+导出（退出码 5=部分完成），绝不整支队丢成绩。
  if (全局最好 && 全局最好.toks && 全局上下文) {
    try {
      说('\n===== 崩溃前已找到的最优（部分结果）=====');
      输出结果(全局最好, 全局上下文.ids, 全局上下文.名称);
      if (全局上下文.导出) {
        fs.writeFileSync(String(全局上下文.导出), JSON.stringify({
          ids: 全局上下文.ids, 名称: 全局上下文.名称, 羁绊: 全局上下文.羁绊,
          dmg: 全局最好.dmg, 来源: 全局最好.来源 + '(部分完成)', 部分完成: true,
          toks: 全局最好.toks, description: 排程器.导出指令集(全局最好.toks),
        }, null, 2), 'utf8');
        说(`已导出 JSON(部分完成): ${全局上下文.导出}`);
      }
      说('\n[退出码 5＝部分完成：有阶段抛异常，上值为已完成阶段的最优]');
      落盘(); process.exit(5);
    } catch (e2) { 说('\n部分结果输出也失败: ' + (e2 && e2.message || e2)); }
  }
  落盘(); process.exit(1);
}
