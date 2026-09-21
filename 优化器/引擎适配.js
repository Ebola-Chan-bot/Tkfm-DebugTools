'use strict';
/*
 * 引擎适配层（Node 侧）
 *
 * 职责：把"角色数据 + 多例模拟器引擎 + 反混淆引擎源码 / 线上混淆引擎源码"封装成一次 createEngine() 调用，
 * 供排程器、团队搜索器、主程序、自检复用。浏览器侧（M5）会用同样的 createSimulator，只是源码改为 fetch 注入。
 *
 * 关键设计：
 * 1. characterJson.js 用 new Function 直接求值取 getCharacter/liberationList/chJSON，避免 vm 沙箱每次
 *    getCharacter 调用的跨边界开销——搜索时该函数被海量调用，必须在同一 JS realm 内同步返回。
 *    characterJson.js 顶层只做数据定义与函数声明（findExIncludes 内引用的 translate 来自 common.js，
 *    但那是函数体、加载时不执行），因此无需先载入 common.js。
 * 2. calcSrc 可切换：默认用反混淆版（逆向-模拟器/deobfuscated.js，可读性好、便于步进 API），
 *    自检会同时验证它与线上混淆版（tenkaassist/simulator/calculator.v3.js）算出的伤害是否逐位一致，
 *    一旦不一致，可把 calcSrc 指回线上混淆版以保证与官网口径完全对齐。
 * 3. deps.updateAll 传 no-op：loadBefore()/undo() 会调用宿主页面的 updateAll，Node/Worker 下必须给空函数。
 *    （多例引擎工厂体已提供默认 no-op，这里无需显式传，仅注释说明。）
 */
const fs = require('fs');
const path = require('path');
const { createSimulator } = require(path.join(__dirname, '..', '逆向-模拟器', '多例引擎.js'));

// 工程外部依赖路径（相对本文件定位，便于在 DebugTools 仓库内移动）
const 路径 = {
  characterJson: path.resolve(__dirname, '..', '..', 'tenkaassist', 'js', 'characterJson.js'),
  autocalc: path.resolve(__dirname, '..', '..', 'tenkaassist', 'make', 'autocalc.v3.js'),
  header: path.resolve(__dirname, '..', '..', 'tenkaassist', 'js', 'header.js'),
  反混淆引擎: path.resolve(__dirname, '..', '逆向-模拟器', 'deobfuscated.js'),
  线上混淆引擎: path.resolve(__dirname, '..', '..', 'tenkaassist', 'simulator', 'calculator.v3.js'),
  机制表bin: path.resolve(__dirname, '机制表', 'build', 'mechanisms.bin'),
  解释器源: path.resolve(__dirname, '机制表', '解释器源.js'),
};

// 机制表加载（懒加载缓存）：bin读取器 读 mechanisms.bin → { version, records, names }
let _机制数据 = null;
function 机制数据(binPath) {
  if (_机制数据 && !binPath) return _机制数据;
  const { 读取bin } = require(path.join(__dirname, '机制表', 'tools', 'bin读取器.js'));
  const 数据 = 读取bin(binPath || 路径.机制表bin);
  if (!binPath) _机制数据 = 数据;
  return 数据;
}

// 解释器源文本（懒加载缓存）
let _解释器源文本 = null;
function 解释器源文本() {
  if (_解释器源文本 == null) _解释器源文本 = fs.readFileSync(路径.解释器源, 'utf8');
  return _解释器源文本;
}

// ---- 角色数据：new Function 求值 characterJson.js，返回所需符号（懒加载缓存）----
let _角色数据 = null;
function 角色数据() {
  if (_角色数据) return _角色数据;
  const src = fs.readFileSync(路径.characterJson, 'utf8');
  // 末尾 return 暴露 getCharacter/liberationList/chJSON；求值在独立函数作用域，不污染调用方
  const mod = new Function(src + '\n;return { getCharacter, liberationList, chJSON, eternalList, isValidComp };')();
  _角色数据 = mod;
  return mod;
}

// ---- deps：多例引擎只读依赖（getCharacter 为函数、liberationList 为数组，二者必需）----
let _默认deps = null;
function 构建默认deps() {
  if (_默认deps) return _默认deps;
  const m = 角色数据();
  _默认deps = {
    getCharacter: m.getCharacter,
    liberationList: m.liberationList.slice(),
    t: (s) => s,   // 翻译恒等（只影响 buff 文本化展示，搜索不关心）
    lang: 'ko',
    alert: () => {},
    updateAll: () => {},  // no-op：loadBefore/undo 依赖，见文件头注释 3
  };
  return _默认deps;
}

/**
 * 创建一个隔离的模拟器实例。
 * @param {object} [opts] { calcSrc?, autocalcSrc?, headerFrag?, deps?, 启用机制表?, 机制binPath? }
 *   - calcSrc: 引擎主体源码（默认反混淆版）；传 线上混淆引擎源码() 可切换到线上口径
 *   - deps: 自定义依赖（默认构建默认deps()）
 *   - 启用机制表: true（或 {binPath}）→ 注入机制解释器，有表角色走表装配、无表回落原 setDefault；
 *     缺省/不传 = 既往行为逐字节不变（线上与既有 benchmark 零影响）
 * @returns {{ battle, getState, increment, internals }} 模拟器实例
 */
function createEngine(opts) {
  opts = opts || {};
  const deps = opts.deps || 构建默认deps();
  if (opts.启用机制表) {
    const binPath = typeof opts.启用机制表 === 'object' && opts.启用机制表.binPath ? opts.启用机制表.binPath : opts.机制binPath;
    return createSimulator({ ...deps, 机制数据: 机制数据(binPath) }, { ...opts, 解释器源: 解释器源文本() });
  }
  return createSimulator(deps, opts);
}

// 源码字符串（供 createEngine 的 calcSrc 选项切换引擎实现）
function 反混淆引擎源码() { return fs.readFileSync(路径.反混淆引擎, 'utf8'); }
function 线上混淆引擎源码() { return fs.readFileSync(路径.线上混淆引擎, 'utf8'); }

// 角色总表（chJSON.data）
function 角色表() { return 角色数据().chJSON.data; }

// 可模拟的 SSR 清单：ok=true（已开放）+ rarity=3 + 具备 hp/atk（N/R 卡缺这些字段，setDefault 会返回 null）
function 可模拟SSR清单() {
  return 角色表().filter(c => c && c.ok === true && c.rarity === 3 && c.hp && c.atk);
}

// 官方生存闸门：队长技兼容白名单（站点组合登记同款校验），给定5人站序(队长在位1)
 function isValidComp(ids) { return 角色数据().isValidComp(ids); }

module.exports = {
  路径, createEngine, 构建默认deps, 角色数据, 角色表, 可模拟SSR清单, isValidComp,
  反混淆引擎源码, 线上混淆引擎源码, 机制数据, 解释器源文本,
};
