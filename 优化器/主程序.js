'use strict';
/*
 * 主程序（Node CLI；搜索跑在 worker 线程，主线程只负责 心跳 + 停止 + 结果展示）
 *
 * 为什么用 worker：团队搜索器是纯同步阻塞计算，直接跑主线程会冻结事件循环——心跳 setInterval
 *   不触发、Ctrl+C 的 SIGINT 收不到。放进 worker 后主线程空闲，两者都真实工作（浏览器 Web Worker 同理）。
 *
 * 用法：
 *   node 主程序.js --起点=10114,10118,10096,10122,10113 --库=默认 [选项]
 *   --起点   起始 5 角色（站位序，位1=队长）；使用 --链接 时可由 DB 自动选
 *   --链接   tenkaassist make/simulator 完整链接：自动读取持有名单、每角色羁绊、Boss 属性与减益
 *            跨队搜索时在链接中额外加 起点=id1,id2,id3,id4,id5 可指定起点；缺省自动扫描 DB 选最优
 *   --库     JSON 数组文件（角色 id 列表）；或 --库=默认 用全部可模拟 SSR；--链接 时取链接名单
 *   --指令集 起点排程文本文件（站点 description 格式）；缺省用贪心基线作起点
 *   --rtMax      名单球最大半径（默认 5 = 名单层穷尽）
 *   --K站位      每名单深搜站位数（默认 5）
 *   --爬山预算    每站位爬山评估上限（默认 10000；实验17实测难例自然收敛仅需 ~4000，旧默认 2000 会停在半路丢失最后一段提升）
 *   --预算        总评估上限（默认 ∞）
 *   --时间        墙钟秒数上限（默认 ∞）
 *   --加深        名单球穷尽后对最优排程做编辑球加深的最大半径（默认 0）
 *   --导出        结果 JSON 输出路径
 *   --禁用种子    关闭 data.json 种子库接种（对照实验用）
 *   --种子上限    每名单最多尝试的迁移种子条数（默认 8）
 *   --束精修      对每名单深搜 Top-N 站位叠加 sync 束搜索精修（默认 0=关；1-3 推荐，~30s/站位）
 *   --束宽        束搜索宽度（默认 10）
 *   --束时限      单次束搜索墙钟秒数（默认 60）
 *   --全兜底      启用相位/节拍/窗/独立相位四类构造兜底（默认关，适合海量名单粗搜）
 *   --输出        stdout 镜像文本输出路径
 *   --只扫描      只按链接条件重放名单内 DB 队伍并选起点，不进入跨队深搜
 *   --多起点=N    从目标条件 DB 排名前 N 个不同名单分别做 rtMax=0 定向精修，避免只围绕单一冠军队搜索
 *   --中文名      结果同时输出 tenkaassist 中文别称（链接模式默认输出）
 *
 * 停止：Ctrl+C → 置停止标志，worker 在下一个检查点收尾并回传当前最优（优雅停止）；再按一次强制退出。
 */
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const 适配 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');
const 链接条件 = require('./链接条件.js');

let 输出文件 = null;
const 缓冲行 = [];
function 落盘() { if (输出文件) { try { fs.writeFileSync(输出文件, 缓冲行.join('\n'), 'utf8'); } catch (e) {} } }
for (const 方法 of ['log', 'error']) {
  const 原 = console[方法].bind(console);
  console[方法] = (...参数) => { const 文本 = 参数.map(x => typeof x === 'string' ? x : String(x)).join(' '); 缓冲行.push(文本); 原(...参数); 落盘(); };
}
process.on('uncaughtException', e => { console.error(e && e.stack || e); 落盘(); process.exit(1); });
process.on('SIGINT', () => { 落盘(); });

function 解析参数(argv) {
  const 参 = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) 参[m[1]] = m[2] === undefined ? true : m[2];
  }
  return 参;
}

function main() {
  const 参 = 解析参数(process.argv);
  输出文件 = 参.输出 ? String(参.输出) : null;
  let 链接 = null;
  try { if (参.链接) 链接 = 链接条件.解析链接(String(参.链接)); }
  catch (e) { console.error('链接解析失败：' + e.message); process.exit(2); }
  if (链接 && 参.禁用种子 == null) 参.禁用种子 = true;
  if (!参.起点 && !(链接 && 链接.起点ids.length === 5) && !链接) { console.error('缺少 --起点=id1,id2,id3,id4,id5，或提供 --链接'); process.exit(1); }

  let 库;
  if (链接) 库 = 链接.持有ids.slice();
  else if (!参.库 || 参.库 === '默认') 库 = 适配.可模拟SSR清单().map(c => c.id);
  else 库 = JSON.parse(fs.readFileSync(参.库, 'utf8')).map(Number);
  库 = 库.filter(id => { const c = 适配.角色数据().getCharacter(id); return c && c.ok === true && c.rarity === 3 && c.hp; });
  const 条件 = 链接 || { bossElement: -1, options: null, 全队羁绊: () => [5,5,5,5,5] };
  let 起点ids = 参.起点 ? String(参.起点).split(',').map(Number) : 链接 && 链接.起点ids.length ? 链接.起点ids.slice() : null;
  let 起点toks = null, 起点伤害 = 0, 多起点列表 = null;
  const 指令集文本 = 参.指令集 ? fs.readFileSync(参.指令集, 'utf8') : null;

  // 链接未指定起点时，以本战场条件的真实重放分选起点；绝不能拿无减益 DB 分直接排序。
  if (!起点ids) {
    const inst = 链接条件.创建引擎(条件), 种子库 = require('./种子库.js'), 库集 = new Set(库), 候选 = [];
    const 数据 = 种子库.装载();
    for (const 记录组 of 数据.bySet.values()) for (const d of 记录组) {
      if (!d.ids.every(id => 库集.has(id)) || !适配.isValidComp(d.ids)) continue;
      const 羁绊 = 链接.全队羁绊(d.ids), toks = 排程器.解析指令集(inst, d.ids, d.description, 羁绊);
      if (!toks) continue;
      const dmg = inst.increment.fastReplay(d.ids, toks, 羁绊, -1, null);
      if (dmg > 0) 候选.push({ ids: d.ids.slice(), toks, dmg });
    }
    候选.sort((a, b) => b.dmg - a.dmg);
    if (参.多起点) {
      const 数量 = Number(参.多起点 === true ? 6 : 参.多起点), 选 = [], 见 = new Set();
      for (const c of 候选) { const k = c.ids.slice().sort((a, b) => a - b).join(','); if (!见.has(k)) { 见.add(k); 选.push(c); if (选.length >= 数量) break; } }
      候选.length = 0; 候选.push(...选);
      多起点列表 = 候选.map(c => ({ ids: c.ids, toks: c.toks }));
    }
    console.log(`名单内 DB 队伍按链接条件重放：有效候选=${候选.length}`);
    for (let i = 0; i < Math.min(10, 候选.length); i++) console.log(`  #${i + 1} ${候选[i].dmg.toLocaleString()}  ${链接条件.队伍名(候选[i].ids)}`);
    if (!候选.length) { console.error('名单内没有可重放的 DB 起点，请通过链接 起点= 或 --起点 指定 5 人'); process.exit(3); }
    起点ids = 候选[0].ids; 起点toks = 候选[0].toks; 起点伤害 = 候选[0].dmg;
  }
  if (起点ids.length !== 5) { console.error('--起点 必须是 5 个角色'); process.exit(1); }
  if (起点ids.some(id => !库.includes(id))) { console.error('起点角色不在持有名单中'); process.exit(1); }
  if (!适配.isValidComp(起点ids)) { console.error('起点团队未过 isValidComp 生存闸门（队长技兼容白名单）'); process.exit(1); }
  if (链接) console.log(`战场：${链接.描述()}\n起点：${链接条件.队伍名(起点ids)}${起点伤害 ? '；DB真值=' + 起点伤害.toLocaleString() : ''}`);
  if (参.只扫描) process.exit(0);

  // 停止标志：主线程与 worker 共享（Atomics 跨线程可见）
  const 共享 = new SharedArrayBuffer(4);
  const 停止标志 = new Int32Array(共享);

  const cfg = {
    ids: 起点ids, 起点toks, 指令集文本, 库,
    bossElement: 条件.bossElement, options: 条件.options,
    角色羁绊: 链接 ? Object.fromEntries(链接.羁绊) : null,
    rtMax: 参.rtMax == null ? 5 : Number(参.rtMax),
    K站位: 参.K站位 == null ? 5 : Number(参.K站位),
    爬山预算: 参.爬山预算 == null ? 10000 : Number(参.爬山预算),
    预算: 参.预算 == null ? null : Number(参.预算),
    时间预算: 参.时间 == null ? null : Number(参.时间),
    加深: 参.加深 == null ? 0 : Number(参.加深),
    多起点: 多起点列表,
    禁用种子: 参.禁用种子 === true || 参.禁用种子 === 'true' || 参.禁用种子 === '1',
    种子上限: 参.种子上限 == null ? 8 : Number(参.种子上限),
    束精修N: 参.束精修 == null ? 0 : Number(参.束精修),   // 0=关（保持原行为）；N=对深搜Top-N站位叠加sync束精修
    束宽: 参.束宽 == null ? 10 : Number(参.束宽),
    束时限: 参.束时限 == null ? 60 : Number(参.束时限),
    全兜底: 参.全兜底 === true || 参.全兜底 === '1' || 参.全兜底 === 'true',
    束闸门: 参.束门 == null ? null : (参.束门 === true || 参.束门 === '1' || 参.束门 === 'true') ? true : false,  // null=自动（见worker）
    停止标志: 共享,
  };

  const t起 = Date.now();
  let 已评估 = 0, 名单数 = 0, rt已完备 = -1, 阶段 = '名单球';
  let 最优 = null; // {dmg, ids, toks}
  let 结束数据 = null;

  const worker = new Worker(path.join(__dirname, '搜索worker.js'));
  worker.on('message', (m) => {
    if (m.type === '进度') { 已评估 = m.已评估; 名单数 = Math.max(名单数, m.名单数); rt已完备 = m.rt已完备; 阶段 = m.阶段; }
    else if (m.type === '最优') { 已评估 = m.已评估; 最优 = { dmg: m.dmg, ids: m.ids, toks: 最优 ? 最优.toks : null }; }
    else if (m.type === '完成') { 结束数据 = m; if (m.最优) 最优 = m.最优; }
  });
  worker.on('error', (e) => { console.error('worker 错误:', e); clearInterval(心跳); clearInterval(守望); process.exit(1); });
  worker.postMessage({ type: 'init', config: cfg });

  // 心跳：每 1 秒打印（主线程空闲，setInterval 真实触发）
  const 心跳 = setInterval(() => {
    const 秒 = ((Date.now() - t起) / 1000).toFixed(1);
    console.log(`[心跳 ${秒}s] 阶段=${阶段} 评估=${已评估} 名单已探=${名单数} 最优=${最优 ? 最优.dmg.toLocaleString() : 0} 团队=${(最优 && 最优.ids) ? 最优.ids.join(',') : '-'} rt完备≤${rt已完备}`);
  }, 1000);

  // 优雅停止：Ctrl+C 置标志让 worker 在下一检查点收尾；再按一次强制退出
  let 第一次C = false;
  process.on('SIGINT', () => {
    Atomics.store(停止标志, 0, 1); // 请求 worker 停止
    if (第一次C) { console.log('\n强制退出'); try { worker.terminate(); } catch (e) {} clearInterval(心跳); process.exit(0); }
    第一次C = true; console.log('\n已请求停止，worker 收尾中（再按一次 Ctrl+C 强制退出）…');
  });

  // 结束守望：检测 worker 回传"完成"后打印最终结果
  const 守望 = setInterval(() => {
    if (!结束数据) return;
    clearInterval(守望); clearInterval(心跳);
    const 秒 = ((Date.now() - t起) / 1000).toFixed(1);
    console.log('\n================ 搜索结束 ================');
    console.log(`终止原因: ${结束数据.终止原因}`);
    console.log(`总评估=${已评估}  耗时=${秒}s  名单已探=${名单数}`);
    if (最优 && 最优.ids && 最优.dmg > 0) {
      console.log(`最优伤害 dmg13 = ${最优.dmg.toLocaleString()}`);
      console.log(`最优团队(站位序) = ${最优.ids.join(',')}`);
      if (链接) console.log(`中文队伍 = ${链接条件.队伍名(最优.ids)}`);
      let 独立复算 = null;
      if (最优.toks) {
        const 独立 = 链接条件.创建引擎(条件);
        独立复算 = 独立.increment.fastReplay(最优.ids, 最优.toks, 条件.全队羁绊(最优.ids), 条件.bossElement, 条件.options);
        console.log(`独立显式条件复算 = ${独立复算.toLocaleString()}；一致=${独立复算 === 最优.dmg}`);
        if (独立复算 !== 最优.dmg) { console.error('独立复算与搜索结果不一致，拒绝输出为最优'); process.exit(6); }
        console.log('---- 最优指令集（站点 description 格式）----');
        console.log(排程器.导出指令集(最优.toks));
      }
      if (参.导出) fs.writeFileSync(参.导出, JSON.stringify({
        ids: 最优.ids, 名称: 最优.ids.map(id => 链接条件.角色名(id)), dmg: 最优.dmg, 独立复算,
        战场: { bossElement: 条件.bossElement, options: 条件.options, bonds: 条件.全队羁绊(最优.ids) },
        toks: 最优.toks, 指令集: 最优.toks ? 排程器.导出指令集(最优.toks) : null,
        统计: 结束数据.统计, 终止原因: 结束数据.终止原因
      }, null, 2), 'utf8');
    } else {
      console.log('未找到合法最优（检查起点/库/isValidComp）');
    }
    process.exit(0);
  }, 100);
}

main();
