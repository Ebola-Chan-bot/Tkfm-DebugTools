'use strict';
/*
 * 临时验证：机制特征 v0 的判别力抽查——승나미(10177，注入3档点灯+stack门控) vs
 * 칼리버/얀코系（纯挂载）。预期：승나미 注入数≥1、门控数≥2、是延迟供给者=true；
 * 纯 tbf 挂载角色 注入数=0、门控数低 → false。同时抽查 展开lib5 的指令计数合理性
 * （승나미 usedCmds=145，lib5 展开后应显著少于 145——lib1~4 块被剔除）。
 */
const path = require('path');
const 机制特征 = require(path.join(__dirname, '机制特征.js'));
const 适配 = require(path.join(__dirname, '引擎适配.js'));

const { records } = 适配.机制数据();
const 抽样 = [10177, 10163, 10183, 10023, 10141, 10188, 10012];
console.log('id\t展开cmd\t注入\t门控\t叠层\t开关\t周期\tCD操\t治疗\t供给动\t궁供队\t궁供Boss\t旗标\t槽位\t延迟供给者');
for (const id of 抽样) {
  const f = 机制特征.画像(id);
  if (!f) { console.log(id + '\t(无记录)'); continue; }
  const 展开 = 机制特征.展开lib5(records.find(r => r.id === id).cmds).length;
  console.log([id, 展开, f.注入数, f.门控数, f.叠层数, f.开关数, f.周期数, f.CD操纵数, f.治疗数,
    f.供给动数, f.궁供给队.toFixed(1), f.궁供给Boss.toFixed(1), f.旗标位, f.槽位数,
    机制特征.是延迟供给者(id)].join('\t'));
}

// 全库分布：延迟供给者数量、注入角色数量（合理性 sanity：승나미系 ~10 上下、注入角色 ~30-60）
let 延迟 = 0, 有注入 = 0, 有门控 = 0, 总 = 0;
for (const r of records) {
  总++;
  const f = 机制特征.画像(r.id);
  if (机制特征.是延迟供给者(r.id)) 延迟++;
  if (f.注入数 > 0) 有注入++;
  if (f.门控数 > 0) 有门控++;
}
console.log(`\n全库 ${总} 角色：延迟供给者=${延迟} 有注入=${有注入} 有门控=${有门控}`);
