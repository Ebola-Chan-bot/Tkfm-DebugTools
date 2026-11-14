import 文件系统 from 'node:fs/promises';
import 路径 from 'node:path';
import { fileURLToPath as 文件地址转路径 } from 'node:url';
import { createHash as 创建散列 } from 'node:crypto';
import 图像 from 'sharp';

const 根目录 = 路径.dirname(文件地址转路径(import.meta.url));
const 输出 = 路径.join(根目录, 'dist');
await 文件系统.mkdir(输出, { recursive: true });
const 文件列表 = ['index.html', '界面.css', '应用.mjs', '战斗引擎.mjs', '角色数据.mjs', '编译技能文本.mjs', '真实角色目录.json', '真实角色技能.json', '真实ELv技能.json', '真实养成数据.json', '真实敌方资料.json', '关卡数据.mjs', '敌方行动规则.mjs', 'manifest.webmanifest'];
for (const 文件 of 文件列表) await 文件系统.copyFile(路径.join(根目录, 文件), 路径.join(输出, 文件));
await 文件系统.copyFile(路径.join(根目录, 'node_modules/lucide/dist/umd/lucide.min.js'), 路径.join(输出, '图标.js'));
await 文件系统.copyFile(路径.join(根目录, 'node_modules/lucide/LICENSE'), 路径.join(输出, '图标-LICENSE.txt'));

const 镜面 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#122d32"/><stop offset=".48" stop-color="#7ab8b4"/><stop offset=".52" stop-color="#18494b"/><stop offset="1" stop-color="#061a20"/></linearGradient><linearGradient id="metal" x2="1" y2="1"><stop stop-color="#e4cf8c"/><stop offset=".5" stop-color="#9e8654"/><stop offset="1" stop-color="#f3df9c"/></linearGradient></defs>
<rect width="512" height="512" fill="#123235"/><path d="M256 49 383 137 383 379 256 462 129 379 129 137Z" fill="#101e22" stroke="url(#metal)" stroke-width="18"/>
<path d="M256 80 358 151 358 365 256 432 154 365 154 151Z" fill="url(#glass)" stroke="#d8c784" stroke-width="3"/>
<path d="m171 333 138-190M199 377l122-168" stroke="#d4efeb" stroke-opacity=".35" stroke-width="12"/>
<path d="m256 91-25 46 25-15 25 15zM256 421l-25-46 25 15 25-15z" fill="#dcc991"/>
<path d="m256 169 62 87-62 87-62-87z" fill="#0a272c" stroke="#d0c38b" stroke-width="4"/><path d="m256 202 33 54-33 54-33-54z" fill="#b9ded5"/>
<path d="m249 195 7 61-16 29 28-30-10-60" fill="#f2f1d9"/><path d="M114 158h-20v197h20M398 158h20v197h-20" fill="none" stroke="#8f855e" stroke-width="5"/>
<circle cx="256" cy="47" r="9" fill="#e4cf8c"/><circle cx="256" cy="465" r="9" fill="#e4cf8c"/>
</svg>`;
for (const 大小 of [192, 512]) await 图像(Buffer.from(镜面)).resize(大小, 大小).png().toFile(路径.join(输出, `镜面-${大小}.png`));
const 海岸 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#d5e9e9"/><circle cx="369" cy="124" r="47" fill="#dc9665"/><path d="M0 275Q80 225 160 275T320 275T512 275V512H0Z" fill="#347d88"/><path d="M0 340Q80 290 160 340T320 340T512 340" fill="none" stroke="#b7dada" stroke-width="13"/><path d="M0 425Q80 375 160 425T320 425T512 425" fill="none" stroke="#b7dada" stroke-width="13"/><path d="M82 112V273M45 145Q82 90 119 145M45 196Q82 141 119 196" fill="none" stroke="#326654" stroke-width="15"/><path d="m246 372 38 47 60-10-33 47 27 49-58-17-44 37 2-59-49-33 57-15z" fill="#eccb85"/></svg>`;
await 图像(Buffer.from(海岸)).png().toFile(路径.join(输出, '海岸-512.png'));
const 散列 = 创建散列('sha256');
for (const 文件 of [...文件列表, '图标.js', '图标-LICENSE.txt', '镜面-192.png', '镜面-512.png', '海岸-512.png']) 散列.update(await 文件系统.readFile(路径.join(输出, 文件)));
const 工作器 = await 文件系统.readFile(路径.join(根目录, '离线.js'), 'utf8');
await 文件系统.writeFile(路径.join(输出, '离线.js'), 工作器.replace('__缓存指纹__', 散列.digest('hex').slice(0, 16)), 'utf8');
console.log(`构建完成：${输出}`);