'use strict';
/*
 * 主程序（Node CLI；搜索跑在 worker 线程，主线程只负责 心跳 + 停止 + 结果展示）
 *
 * 为什么用 worker：团队搜索器是纯同步阻塞计算，直接跑主线程会冻结事件循环——心跳 setInterval
 *   不触发、Ctrl+C 的 SIGINT 收不到。放进 worker 后主线程空闲，两者都真实工作（浏览器 Web Worker 同理）。
 *
 * 用法：
 *   node 主程序.js --起点=10114,10118,10096,10122,10113 --库=默认 [选项]
 *   --起点   起始 5 角色（站位序，位1=队长），必填，须过 isValidComp
 *   --库     JSON 数组文件（角色 id 列表）；或 --库=默认 用全部可模拟 SSR
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
 *   --束门        难例特征闸门：1=静态画像'易'(buff富余)的名单跳过束精修省时；0=关（默认：自动，rtMax≥1 海量名单时开，单团队 rtMax=0 时关）
 *
 * 停止：Ctrl+C → 置停止标志，worker 在下一个检查点收尾并回传当前最优（优雅停止）；再按一次强制退出。
 */
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const 适配 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');

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
  if (!参.起点) { console.error('缺少 --起点=id1,id2,id3,id4,id5'); process.exit(1); }
  const 起点ids = String(参.起点).split(',').map(Number);
  if (起点ids.length !== 5) { console.error('--起点 必须是 5 个角色'); process.exit(1); }
  if (!适配.isValidComp(起点ids)) { console.error('起点团队未过 isValidComp 生存闸门（队长技兼容白名单）'); process.exit(1); }

  let 库;
  if (!参.库 || 参.库 === '默认') 库 = 适配.可模拟SSR清单().map(c => c.id);
  else 库 = JSON.parse(fs.readFileSync(参.库, 'utf8')).map(Number);
  库 = 库.filter(id => { const c = 适配.角色数据().getCharacter(id); return c && c.ok === true && c.rarity === 3 && c.hp; });

  const 指令集文本 = 参.指令集 ? fs.readFileSync(参.指令集, 'utf8') : null;

  // 停止标志：主线程与 worker 共享（Atomics 跨线程可见）
  const 共享 = new SharedArrayBuffer(4);
  const 停止标志 = new Int32Array(共享);

  const cfg = {
    ids: 起点ids, 起点toks: null, 指令集文本, 库,
    rtMax: 参.rtMax == null ? 5 : Number(参.rtMax),
    K站位: 参.K站位 == null ? 5 : Number(参.K站位),
    爬山预算: 参.爬山预算 == null ? 10000 : Number(参.爬山预算),
    预算: 参.预算 == null ? null : Number(参.预算),
    时间预算: 参.时间 == null ? null : Number(参.时间),
    加深: 参.加深 == null ? 0 : Number(参.加深),
    禁用种子: 参.禁用种子 === true || 参.禁用种子 === 'true' || 参.禁用种子 === '1',
    种子上限: 参.种子上限 == null ? 8 : Number(参.种子上限),
    束精修N: 参.束精修 == null ? 0 : Number(参.束精修),   // 0=关（保持原行为）；N=对深搜Top-N站位叠加sync束精修
    束宽: 参.束宽 == null ? 10 : Number(参.束宽),
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
      if (最优.toks) {
        console.log('---- 最优指令集（站点 description 格式）----');
        console.log(排程器.导出指令集(最优.toks));
      }
      if (参.导出) fs.writeFileSync(参.导出, JSON.stringify({
        ids: 最优.ids, dmg: 最优.dmg,
        指令集: 最优.toks ? 排程器.导出指令集(最优.toks) : null,
        统计: 结束数据.统计, 终止原因: 结束数据.终止原因
      }, null, 2), 'utf8');
    } else {
      console.log('未找到合法最优（检查起点/库/isValidComp）');
    }
    process.exit(0);
  }, 100);
}

main();
