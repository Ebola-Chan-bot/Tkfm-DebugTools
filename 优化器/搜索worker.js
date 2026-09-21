'use strict';
/*
 * 搜索 worker（Node 侧；M5 浏览器版将把"引擎适配+搜索"以同源 importScripts 搬进 Web Worker，
 * 消息协议与停止标志语义保持一致，便于两边共用同一套团队搜索器/排程器代码）
 *
 * 为什么必须放 worker：团队搜索器是纯同步阻塞计算，跑在主线程会冻结事件循环——
 *   心跳 setInterval 永远不触发、Ctrl+C 的 SIGINT 也收不到。浏览器 Web Worker 同理。
 *
 * 协议：
 *   主→worker  init(config): { ids, 起点toks|null, 指令集文本|null, 库, rtMax, K站位, 爬山预算, 预算, 时间预算, 加深, 停止标志 }
 *              （停止标志是 SharedArrayBuffer 上的 Int32Array；Atomics 置 1 即请求停止）
 *   worker→主  进度 {type:'进度', 已评估, 名单数, rt已完备, 阶段}   节流≥200ms
 *              最优 {type:'最优', dmg, ids, 已评估}                 每次刷新全局最优即发
 *              完成 {type:'完成', 最优|null, 统计, 已停止, 加深完备, 终止原因}
 */
const { parentPort, workerData } = require('worker_threads');
const 适配 = require('./引擎适配.js');
const 排程器 = require('./排程器.js');
const 团队搜索器 = require('./团队搜索器.js');

parentPort.on('message', (msg) => {
  if (msg && msg.type === 'init') run(msg.config);
});

function run(cfg) {
  const 停止标志 = new Int32Array(cfg.停止标志);
  const t起 = Date.now();
  const 预算 = cfg.预算 == null ? Infinity : cfg.预算;
  const 时间预算 = cfg.时间预算 == null ? Infinity : cfg.时间预算; // 秒
  let 已评估 = 0, 名单数镜像 = 0;
  let 手动停止 = false, 上次进度发送 = 0;

  const stopFlag = () => {
    if (手动停止) return true;
    if (Atomics.load(停止标志, 0) === 1) { 手动停止 = true; return true; }
    if (已评估 >= 预算) return true;
    if (时间预算 !== Infinity && (Date.now() - t起) / 1000 >= 时间预算) return true;
    return false;
  };

  const 发进度 = (阶段, rt已完备) => {
    // 节流：距上次≥200ms 才发（心跳由主线程按自己节奏打印，这里只负责喂数据）
    const now = Date.now();
    if (now - 上次进度发送 >= 200) {
      上次进度发送 = now;
      parentPort.postMessage({ type: '进度', 已评估, 名单数: 名单数镜像, rt已完备, 阶段 });
    }
  };

  const inst = 适配.createEngine();

  // 起点排程：优先用户指令集文本；否则贪心基线
  let 起点toks = cfg.起点toks;
  if (!起点toks && cfg.指令集文本) 起点toks = 排程器.解析指令集(inst, cfg.ids, cfg.指令集文本, [5,5,5,5,5]);
  if (!起点toks || 排程器.重放(inst, cfg.ids, 起点toks) === 0) {
    const g = 排程器.贪心基线(inst, cfg.ids, [5,5,5,5,5]);
    起点toks = g && g.dmg > 0 ? g.toks : null;
  }
  if (!起点toks) { parentPort.postMessage({ type: '完成', 最优: null, 统计: null, 已停止: 手动停止, 加深完备: false, 终止原因: '起点无效' }); return; }

  let 全局最优 = null;
  let rt镜像 = -1; // 名单球半径镜像：搜索进行中无实时 rt（搜索器内部计数），完成后用统计值回填

  // 种子库接种（默认启用；cfg.禁用种子 可关）：每个候选名单先向 data.json 种子库要高质量起点
  let 种子提供器 = null;
  if (!cfg.禁用种子) {
    try {
      const 种子库 = require('./种子库.js');
      种子库.装载();
      种子提供器 = (ids) => 种子库.找起点(inst, ids, [5,5,5,5,5], cfg.种子上限 || 8);
      parentPort.postMessage({ type: '进度', 已评估: 0, 名单数: 0, rt已完备: -1, 阶段: '种子库已装载' });
    } catch (e) {
      parentPort.postMessage({ type: '进度', 已评估: 0, 名单数: 0, rt已完备: -1, 阶段: '种子库装载失败:' + e.message });
    }
  }

  const r = 团队搜索器.搜索(inst, { ids: cfg.ids, toks: 起点toks }, cfg.库, {
    rtMax: cfg.rtMax, K站位: cfg.K站位, 爬山预算: cfg.爬山预算, 预算,
    束配置: (cfg.束精修N > 0) ? {
      N站位: cfg.束精修N, width: cfg.束宽 || 10, 评分: 'sync', 时限秒: 60,
      // 难例特征闸门：'易'(buff富余)名单跳过束精修。null=自动(rtMax≥1 的海量名单场景默认开, 起点队豁免;
      // rtMax=0 单团队时 团队搜索器.搜索 内部会强制关——후지카端到端验收靠束精修才达 100% bit级)。
      闸门: cfg.束闸门 == null ? (cfg.rtMax == null ? true : cfg.rtMax >= 1) : cfg.束闸门 === true,
    } : null,
    种子提供器,
    stopFlag,
    onResult: (best) => {
      if (best.dmg > 0 && (全局最优 === null || best.dmg > 全局最优.dmg)) {
        全局最优 = { dmg: best.dmg, ids: best.ids, toks: best.toks };
        parentPort.postMessage({ type: '最优', dmg: best.dmg, ids: best.ids, 已评估 });
      }
    },
    onProgress: (n, mn) => { 已评估 += n; if (mn != null) 名单数镜像 = mn; 发进度('名单球', rt镜像); },
  });
  rt镜像 = r.统计.rt已完备;
  名单数镜像 = r.统计.名单数;

  // 排程层编辑球加深（渐近完备层）：名单球结束且未达停止条件、用户要求加深时执行
  let 加深完备 = false;
  if (全局最优 && cfg.加深 > 0 && !stopFlag()) {
    let base = 全局最优.toks;
    for (let rr = 1; rr <= cfg.加深 && !stopFlag(); rr++) {
      排程器.编辑球层(inst, 全局最优.ids, base, [5,5,5,5,5], rr, (toks, dmg) => {
        已评估++;
        if (dmg > 全局最优.dmg) {
          全局最优 = { ...全局最优, dmg, toks }; base = toks;
          parentPort.postMessage({ type: '最优', dmg, ids: 全局最优.ids, 已评估 });
        }
        if ((已评估 & 63) === 0) 发进度('排程加深r' + rr, r.统计.rt已完备);
      }, Math.max(0, 预算 - 已评估), stopFlag);
    }
    // 编辑球半径达 65（= 全部 token 可偏离）即理论穷尽全部 65-token 排程空间
    加深完备 = cfg.加深 >= 65 && !手动停止;
  }

  发进度('完成', r.统计.rt已完备);
  // 终止原因精确判定（此前误把"自然穷尽"归入含糊的"达到预算"，且引用了已改名字段）：
  const 超时间 = 时间预算 !== Infinity && (Date.now() - t起) / 1000 >= 时间预算;
  let 终止原因;
  if (手动停止) 终止原因 = '手动停止';
  else if (!r.统计.名单已穷尽 && 已评估 >= 预算) 终止原因 = '达到评估预算';
  else if (!r.统计.名单已穷尽 && 超时间) 终止原因 = '达到时间预算';
  else if (r.统计.名单已穷尽 && 加深完备) 终止原因 = '已覆盖全部理论可能';
  else if (r.统计.名单已穷尽) 终止原因 = '名单层完备(排程层未穷尽)';
  // rtMax<5 且未被打断：已搜完指定 rtMax 半径内的全部名单（rtMax=0 即起点名单），但尚未覆盖全部理论名单
  else if (r.统计.范围内完备) 终止原因 = `rtMax=${cfg.rtMax}范围内完备(名单层未全空间穷尽)`;
  else 终止原因 = '被打断(未穷尽)';
  parentPort.postMessage({ type: '完成', 最优: 全局最优, 统计: { ...r.统计, 评估数总: 已评估 }, 已停止: 手动停止, 加深完备, 终止原因 });
}
