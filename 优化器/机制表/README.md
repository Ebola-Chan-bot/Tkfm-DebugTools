本文档定义"机制表"的工程约定与可读 DSL 规范（阶段 0 冻结稿 v0.1；终局更新 2026-09-20：**191/191 全角色数据化完成**）。目标与四条硬约束见
`../机制数据化施工计划.md`；本文档只回答三个问题：源文件长什么样、怎么变成二进制、怎么验证。

## 文件与数据流（终局）

```
机制表/
  schema.fbs        FlatBuffers schema（二进制布局的唯一真源，struct 定长；Record=26776B 终态含 mnc double）
  README.md         本文档（DSL 规范）
  机制抽取器.js     AST→src DSL 翻译官（acorn 解析 setDefault→191 case→全量抽取；残差机制保证不静默漏译）
  src/*.json        阶段 0–1 手工表（4 试点；仍可读可审，终局主力源在 生成/）
  生成/*.json       抽取器产物（191 角色全量表；压平输入优先目录 --srcDir 生成）
  生成/_不完整/     残差角色回落表（终局=空）；生成/_残差报告.json（--扫描 产出）
  names.txt         统一字符串字典（buff name/type/魔法串；只追加不改序；行号-1 = 索引）
  解释器源.js       指令解释器（注入引擎闭包的文本；装配期编译闭包树，运行期直接调引擎原语）
  tools/flatten_core.js  压平器（src DSL → flat.json；CLI：node tools/flatten_core.js --全量 --srcDir 生成）
  tools/bin读取器.js     mechanisms.bin → JS records（与 flat.json 同构；ABI 偏移硬编码须随 schema 同步）
  tools/record指纹.js    增量回归（sha1 指纹基线：--对比 分流免差分/必须差分；通过后无参固化）
  tools/验证bin读取.js   reader vs flat.json 逐字段 diff（回归脚本）
  tools/roundtrip自检.js flatc 工具链 round-trip 自检（回归脚本）
  tools/flatc.exe   25.12.19（sha256 与官方 release 一致）
  ts/tkfm-mech/     flatc --ts 生成的 TS 绑定（ABI 尺寸/偏移权威；改 schema 后须重生成并同步 bin读取器.js）
  build/            产物：flat.json / mechanisms.bin / record指纹.json
```

数据流：`deobfuscated.js setDefault AST →(机制抽取器.js)→ 生成/*.json →(tools/flatten_core.js --全量 --srcDir 生成)→ build/flat.json →(flatc --binary)→ build/mechanisms.bin →(tools/bin读取器.js)→ records →(解释器源.js 注入引擎)→ 装配钩子`
反向自验：`mechanisms.bin →(flatc --json)→ 对拍 flat.json`（逐字段一致才算过）。

**全量重生成 SOP**（铁律，一步漏一个就会有"完整角色骤降/bin 陈旧"假象）：
```
Remove-Item 生成\*.json -Force; Remove-Item 生成\_不完整\*.json -Force -EA SilentlyContinue
node 机制抽取器.js --out 生成          # --扫描 只产残差报告不写表，须先 --out
node 机制抽取器.js --扫描              # 重建残差报告（全量模式会删报告）
node tools\flatten_core.js --全量 --srcDir 生成   # 必须带 --srcDir 生成
node tools\record指纹.js --对比        # 指纹不变=免差分；变化/新增=必须差分
.\tools\flatc.exe --binary -o build schema.fbs build/flat.json   # 必须显式给数据文件；验 exit0+bin增大才替换
Move-Item -Force build\flat.bin build\mechanisms.bin
cd ..; node 双跑差分.js --状态         # 动共享路径/ABI 必全量回归；通过后 record指纹.js 固化基线
```

> 可读源（src/*.json）与二进制 schema（schema.fbs）**刻意不同形**：源用嵌套 if/for/钩子名，
> 人可读可审；压平器负责线性化（If→If…EndIf）与字典化（字符串→索引）。压平是确定性的，
> 同一 src 永远得到同一 bin —— 这条性质使"人工审源表"与"机器跑 bin"不脱节。

## 可读 DSL（src/*.json 的语法）

### 顶层结构

```jsonc
{
  "id": 10177,
  "槽位初值": { "stack": 0 },            // 私有计数器（编译到 slotInit；stack→slot0）
  "排除伤害": ["<기내식엔 저도 포함♡>"],  // buff_ex.push 的 type 名（编译到 exclTypes）
  "旗标": ["IsSealed"],                  // 具名布尔机制（编译到 flags 位；逻辑写死在引擎）
  "钩子": {
    "ultbefore": [指令…], "passive": [指令…], "leader": [指令…], …
    // 13 个钩子名可选；缺省 = 无此钩子（引擎走默认）
    // ultimate/attack/defense 缺省语义 = ultLogic(self)/atkLogic(self)/act_defense()
  }
}
```

### 指令形态（全部是 JSON 对象，键即操作名）

**具名形 vs 定位形**：`tbf`（5 参固定）用具名键；其余 buff 挂载原语（`nbf/anbf/atbf/ptbf/pnbf/buff`，
arity 6~11 且含 `on/off/제거/"발동"/"추가"` 魔法位）**一律定位形** `{"buff": [目标, 参2, 参3, …]}`，
按源码实参顺序原样存放——零语义解释，保 bit-exact 无歧义。数组元素可为：目标表达式、
字符串（→字典）、数值（→定点）、`"always"`、布尔。

**perLib 解放档差异表**（数据只填类内差异的落地）：任意参数可写成 `{"perLib":[v1,v2,v3,v4,v5]}`，
按解放等级 1~5 取值；**某档为 null → 该档跳过整条指令**（源码 switch 里缺 case 的档）。
例：승나미 ultbefore 五档同形仅数值/名字不同 → 一条指令 + perLib 表；가뎀증仅 3~5 档有 →
`perLib:[null,null,5,10,15]`。

**temp 局部快照**：`{"temp":["变量名", {"slot":"stack"}]}` 或 `{"temp":["v1",{"getNest":"type名"}]}`
——把当前值读入指令流局部变量（同一钩子内后续条件用 `{"kind":"temp","var":"v1"}` 引用）。
源码依据：10188 `const s = u.stack` 后多处 `if(s==3/7)`（若直接读 stack，末尾 `stack++` 会污染后续比较）。

**复合条件语法糖**：`{"all":[c1,c2]}`、`{"not":c}`（如 10141 turnstart 的 `GT>1 && !isSANFix()`）；
压平器展开为嵌套 If.cmd，schema 无需复合条件编码。`isSANFix` 这类独有谓词按约束 1 拆为：
数据声明 `{"kind":"有回合buff","type":"<이성치>감소X"}`，判断逻辑写死引擎。

| 形态 | 示例 | 对应源码 |
|---|---|---|
| buff 挂载 | `{"tbf": all, "type":"공퍼증", "size":45, "name":"좌석1", "turn":1}` | `tbf(all,"공퍼증",45,"좌석1",1)` |
| 目标 | `"self"/"all"/"boss"/{"comp":4}/"$i"(循环变量)/"$触发者"` | `_0x55e037/all/boss/comp[4]/comp[i]` |
| always 时长 | `"turn": "always"` | 全局 always 常量 |
| 属性 | `{"hpUpAll": 40}`、`{"heal": "all"}` | `hpUpAll(40)`、全体 heal |
| cd | `{"cdChange": "self", "值": -3}` 或 `"值": {"isLeader": -6, "else": -3}` | `cdChange(u,-3)`、三元 |
| buff 开关 | `{"setBuffOn": "self", "div":"기본", "name":"직시1", "on": {"slot":"stack", "cmp":">=", "fix":50}}` | `setBuffOn(u,"기본",…,u.stack>=50)` |
| 计数器 | `{"setSlot": ["stack", 50]}`、`{"addSlot": ["stack", -10]}`、`{"clampSlot": ["stack", 0, 8]}` | `u.stack=50`、`u.stack-=10`、`if(>8)=8` |
| 值借用 | `"size": {"atkRef": ["myCurAtk", "+selfId", "+0"]}`＋常数 `"size":{"atkRef":["myCurAtk","+触发者Id","+30"]}` | `myCurAtk + comp[i].id + 30` |
| if | `{"if": {"kind":"回合", "cmp":"==", "fix":1}, "then":[…], "elif":[{"if":…,"then":…}], "else":[…]}` | `if(GLOBAL_TURN==1)…else if(…)` |
| 条件族 | kind ∈ `回合`/`回合集合{1,5,9}`/`回合模3余0(偏移-1)`/`队长`/`元素种类{3,4,5}`/`元素种类==1`/`slot比较`/`nest比较`/`临时槽比较`/`role计数>=2`/`元素计数>=2`/`有回合buff{type}` | 考古所见全部条件形态 |

> **回合模条件的 GT>1 守卫**：源码 58/59 处取模条件形如 `GLOBAL_TURN > 1 && (GLOBAL_TURN-1) % 3 == 0`，
> 守卫与取模永不分家 → 压平器把 `"kind":"回合模"` 默认编译为 **CmpGTModGated**（GT>1 前置内建引擎，
> 共性写死=约束1）；仅源码 3 处不带守卫的裸取模写 `"守卫": false` 编译为 CmpGTMod。
> （2026-09-19 实踩：승나미表丢守卫 → 第1回合多发一轮 buff → A层双跑 2/40 → 修后 50/50。）
| for | `{"for": {"kind":"元素", "mask":["광","암"], "排除self":false}, "body":[…]}`，体内 `"$i"` | `for(i of getElementIdx("광","암")) … comp[i]` |
| for 选择器 | kind ∈ `全队`(comp)/`role{딜,탱…}`/`元素{광…}`；均可带 `"排除self":true` | `for(c of comp) if(c.id!=u.id)` |
| 解放等级 | `{"lib": 3, "then":[…]}`、`{"lib": "default", …}` | `switch(_0x78c5e1){case 3…default…}` |
| 骨架 | `{"ultLogic": null}`（带参 `{"ultLogic": 6}`）、`{"atkLogic": null}`、`{"flag": "ArmorZero"}` | `ultLogic(u,6)` |
| 注入 | 见下节 | `comp[i].ultimate = function…` |

### 函数注入（62 处源码的统一表达）

```jsonc
{"inject": {
    "方法": "ultimate",     // ultimate/attack/hit/defense/ultafter/atkafter
    "目标": "$i",           // 被注入者：循环变量"$i"（在 for 体内）/ {"comp":4} / "self" / "all"
    "模式": "环绕",         // "追加"(61处：原函数后跑后置) / "环绕"(前置+原函数+后置) / "替换"(不调原函数)
    "快照": [指令…],        // 每次被调用时最先执行（常为 temp 指令；승나미的 getNest 快照必须在此读）
    "前置": [指令…],        // 原函数调用前（环绕用：승나미三档点灯 setBuffOn true）
    "后置": [指令…]         // 原函数调用后（승나미熄灭 setBuffOn false；10188 的 stack>=4 大清除）
}}
```

语义（引擎统一实现，约束 1）：装配期对每个目标单位保存原函数 → 替换为
`快照 → 前置 → 原函数.apply(this,args) → 后置`。**数据里没有任何可执行文本**；
"快照"里的 temp 解决勝나미注入体 6 处 `getNest` 必须读同一值的问题（原函数执行会改 nest，
bit-exact 关键）；“替换”模式服务于 10133 的 `getArmor=()=>0`（也可用旗标 ArmorZero，两者等价）。

### 数值规则（bit-exact 关键，违者拒收）

- 一切数值（size/turn/nest/max/dur/pct）源表写**十进制字面量**（含小数）；
  压平器转为**定点 i32 ×10⁴**；小数位 >4 即报错。
- **机动性 mnc 例外（批次E-4 ABI）**：`[double:10]` 原值无损存储——源码 10173 机动性数组含 FP 噪声
  字面量（298.20000000000005 等，全文件唯一），噪声在小数第 14 位，定点无法无损，而 mnc→u.ultMag
  是伤害关键路径。其余 190 角色清洁值（≤4 位小数）double 往返无损行为不变。
- 引擎读定点还原时做 `i32 / 10000`——与 JS 字面量解析同为对同一有理数的正确舍入，逐位一致。
- 字符串（buff name/type、元素名、role 名、temp 槽名、字段名）一律走字典，源表写原文，压平器换索引；
  字典只追加不改序（旧 bin 不失效）。

### 终局验收状态（2026-09-20）

- **191/191 全角色数据化**（生成/_不完整/ 空，残差 0 条，无逃生舱）
- 全量双跑 **45697 场 0 不一致**（A 层 DB 真实排程 / B 层随机队伍×全lib×全站位 / C 层状态级 diff 190/190 /
D 层异常忠实 10089 双侧 ReferenceError 逐字一致）；性能 **1.003x**（红线 2x）
- bin=5,199,408B（字典 2557）；record指纹.json 已固化 191 基线；K_CMD 实测最大 232/256（10190）
- 两处源码 bug **忠实复刻**（非语义修复）：10138 `comp[idx]*30`→NaN（Tag NaNVal=23）；
  10089 `hpUpAll(c,30)` c 未声明→Op ThrowRef=90（双跑差分 D 层专项验证，已从黑名单移出）

## 验收（阶段 0 只验格式，不验行为）

1. 3 个极端样本（10177 승나미／10141 stack门控／10188 最复杂208行）的 src JSON 能无歧义表达
   其全部源码语义（本文档 DSL 覆盖考古所见 97.2% 的 L0~L3 语句形态 + 3 样本的全部特殊形态）。
2. `flatc` 对 3 个压平后的 flat.json 编译通过，`.bin → flatc --json` round-trip 逐位一致。
3. 三样本中每一个源码特性都能指出 DSL 对应形态（转写文档逐行标注）。

> **验收状态（本轮）**：#1/#3 已达成——`src/10177.json`（승나미 注入环绕）、`src/10141.json`（lib 分支+elif 谓词链+三元 cdChange+stack 排除机制）、`src/10188.json`（钩子级 temp 快照+5档门控点灯）三份手工表产出，脚本逐条比对源码**全部分支覆盖**、韩文串双向 0 差异、负值/小数/定点精确保留；schema.fbs 编译通过（7288B bfbs）。#2 的**工具链与 schema 合法性**已单独闭合：构造结构完整 CharacterRecord → `flatc --binary` → 20228 字节 `.bin`（TKFM magic，逼近 3.5 章 20428 上限）→ `flatc --json` 反解 → 逐字段语义对拍**完全无损**（version/字典/mnc 定点/192 指令 op↔字符串名/Cond/Param tag+i 全存活，LibIf=30000、공퍼증60=600000 定点抽查 ✓）。3 个 src 表的完整压平 round-trip 待阶段 2 压平器（DSL→flat）落地后按同法验证。
>
> **flatc 命令定型（25.12.19，坑已踩平）**：`-o` 必须最前；正向 `flatc -o build --binary --strict-json schema.fbs build/flat.json`；反向 **bin 必须放 `--` 之后** `flatc -o build/rt --json schema.fbs -- build/flat.bin`（否则误判"input file appears to be binary"）；schema 需 `file_identifier`（本项目 "TKFM"，flatc 校验 bin/schema 匹配 + 版本防错读）。schema 的 camelCase 字段告警无害（故意与引擎代码一致）。

行为验收（bit-exact 双跑）属阶段 1，依赖解释器实现，本文档不覆盖。
