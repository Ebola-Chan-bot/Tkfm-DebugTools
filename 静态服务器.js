// 极简静态文件服务器：默认把 TKFM-Data-Room/dist 目录通过 http://localhost:3000 暴露出来，用于本地浏览器实测
// 支持命令行参数：node 静态服务器.js [目标目录(相对本脚本或绝对)] [端口] [--no-spa] [--keep-alive]
//   --no-spa 关闭 SPA 回退，未命中路径返回 404，适用于 tenkaassist 这类多页面站点（回退会把 404 掩盖成首页）
//   --keep-alive 开启 HTTP 持久连接复用（默认是每请求新建连接的 Connection: close），适用于 cpolar 这类按连接数限流的隧道：几百张小图片若每张一条新连接会被建连开销×请求数放大成灾难甚至请求失败；VS Code Remote-SSH 端口转发场景必须保持默认断连（见下方注释）
//   --cache 对非 HTML 资产（js/css/图片等）发 1 小时强缓存；默认 no-store 是为了调试期改 JS 立即生效，但经 cpolar 隧道测试时每次刷新都会把几百 KB 的引擎脚本重新拖过 1Mbps 隧道，缓存后二次访问几乎零流量
//   --img-redirect=<外站根> 把 /images/* 请求 302 重定向到 外站根+原路径（外站根写与本地站点根对应的部署基址，例如 https://inittt.github.io/tenkaassist，拼出 .../images/icons/main.webp），让浏览器从上游 CDN 直接取图、完全不占隧道带宽；img 标签加载不需要 CORS，跨源无碍
// 默认带 SPA 回退（找不到文件时返回根 index.html），满足 nuxt generate 产物的前端路由需求
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 本地开发反向代理的目标云端 API（tenkaassist 的后端）：它按 Origin 白名单只放行 GitHub Pages，本地页面直连会被 403 Invalid CORS request 拒绝，故经本代理去掉 Origin/Referer 后转发，浏览器侧表现为同源请求、不触发跨源限制
const 云端API主机 = 'port-0-tenkafuma-assistant-server-1272llx2xidhk.sel5.cloudtype.app';

const 参数 = process.argv.slice(2);
const 无回退 = 参数.includes('--no-spa');
const 保活 = 参数.includes('--keep-alive');
const 缓存资产 = 参数.includes('--cache');
// 防呆归一：重定向按“站点根 + 原始路径”拼接；若调用方把 /images 也写进参数（会拼出 images/images 直接 404），这里统一剥掉，两种写法都能用
const 图片外链 = ((参数.find(a => a.startsWith('--img-redirect=')) ?? '').slice('--img-redirect='.length) || '').replace(/\/images\/?$/, '') || null;
const 位置参数 = 参数.filter(a => !a.startsWith('--'));
const 站点目录 = path.resolve(__dirname, 位置参数[0] ?? path.join('..', 'TKFM-Data-Room', 'dist'));
const 端口 = 位置参数[1] ? +位置参数[1] : 3000;

const 类型表 = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.webmanifest': 'application/manifest+json',
};

// 页面里的 js/css 引用一律追加 ?v=<目标文件修改时间>：浏览器 HTTP 缓存里残留的旧条目（早先带 max-age 强缓存写入的）在到期前根本不会向服务器重新验证，改版后依旧喂旧代码——换 URL 是唯一不碰浏览器缓存就能强制重新获取的办法。HTML 本身 no-store，每次刷新都拿到最新引用版本号
function 打版本标记(内容, 页目录) {
    return 内容.replace(/(\ssrc|\shref)=["']([^"']+\.(?:js|css))(["'])/g, (全, 属性, 引用, 引号) => {
        if (/^(https?:)?\/\//.test(引用)) return 全;
        const 目标 = path.join(页目录, 引用.split('?')[0]);
        let 版本 = '';
        try { 版本 = String(Math.round(fs.statSync(目标).mtimeMs)); } catch (e) { return 全; }
        return `${属性}=${引号}${引用}?v=${版本}${引号}`;
    });
}

// 调试改写表：仓库文件保持生产原样，本地调试所需的分支由本服务器在响应时注入——只改内存中的响应字节，磁盘与 git 零痕迹，上游仓库看不到任何调试设施。首条把 common.js 的生产 API 基址换成本地 /api 反代（云端按 Origin 白名单只放行 GitHub Pages，本地页面直连会被 CORS 拒绝，见下方反向代理注释）。匹配不到目标行时原样返回并告警：上游改了行格式会显式暴露（本地 API 随即失联），而不是悄悄改错内容
const 改写规则表 = [
    { 路径: /(^|\/)js\/common\.js$/, 匹配: /^const server = .*$/m, 替换: 'const server = `${location.origin}/api`;' },
];
function 调试改写(内容, 请求路径) {
    for (const 规则 of 改写规则表) {
        if (!规则.路径.test(请求路径)) continue;
        if (!规则.匹配.test(内容)) {
            console.log(`⚠ 调试改写未命中 ${请求路径} 的目标行（上游行格式可能已变），原样返回`);
            return 内容;
        }
        return 内容.replace(规则.匹配, 规则.替换);
    }
    return 内容;
}

http.createServer((请求, 响应) => {
    // 默认每个响应都关闭 keep-alive（Connection: close）：VS Code Remote-SSH 端口转发隧道会吞掉服务端关闭空闲连接的 FIN，浏览器不知情、把已死连接留在保活池里；location.reload()（语言切换）复用这些死连接 → 请求永不返回 → 页面持续加载。关闭保活后每个请求都走全新隧道连接，reload 不再踩雷
    // --keep-alive 模式不设该头、走 HTTP/1.1 持久连接：cpolar 这类隧道对入站连接数有限制（按连接计而非按请求计），大量小图片每张一条新连接会被限流拖垮甚至失败，连接复用后同一批图片只需个位数连接即可传完
    if (!保活) 响应.setHeader('Connection', 'close');
    // 每请求日志：finish=正常完成 close 未完成=中途断开；带时间戳用于对齐浏览器 reload 时序，定位哪个资源没到达/被截断
    const 起点 = Date.now();
    const 原始url = 请求.url;
    const 戳 = () => new Date().toISOString().slice(11, 23);
    const 对端 = () => `←${请求.socket.remoteAddress}:${请求.socket.remotePort}`;
    响应.on('finish', () => console.log(`${戳()} OK ${响应.statusCode} ${Date.now() - 起点}ms ${请求.method} ${原始url} ${对端()}`));
    响应.on('close', () => { if (!响应.writableEnded) console.log(`${戳()} CUT ${Date.now() - 起点}ms ${请求.method} ${原始url}`); });
    // /images/* 外链重定向：把图片流量整体卸载到 CDN/上游仓库，浏览器 img 标签自动跟随 302，不占隧道带宽
    if (图片外链 && 请求.url.startsWith('/images/')) {
        响应.writeHead(302, { 'Location': 图片外链 + 请求.url, 'Cache-Control': 'public, max-age=86400' });
        响应.end();
        return;
    }
    // /api/* 反向代理：原样转发 method/body/头（去掉 host/origin/referer 让云端按无来源放行），响应去掉 CORS 头后原样回传
    if (请求.url === '/api' || 请求.url.startsWith('/api/')) {
        const 目标路径 = 请求.url.slice('/api'.length) || '/';
        const 转发头 = { ...请求.headers };
        delete 转发头.host; delete 转发头.origin; delete 转发头.referer;
        // 逐跳连接头（hop-by-hop）不属代理转发内容，与响应侧同样剥离：连接行为统一由本服务器的连接策略（默认断连/--keep-alive）决定
        delete 转发头.connection; delete 转发头['keep-alive']; delete 转发头['proxy-connection'];
        const 转发 = https.request({ hostname: 云端API主机, path: 目标路径, method: 请求.method, headers: 转发头 }, (回) => {
            const 回头 = { ...回.headers };
            delete 回头['access-control-allow-origin']; delete 回头['access-control-allow-credentials'];
            delete 回头['connection']; delete 回头['keep-alive']; // 统一由上面的连接策略决定客户端侧连接行为
            响应.writeHead(回.statusCode, 回头);
            回.pipe(响应);
        });
        转发.on('error', (错误) => { if (!响应.headersSent) { 响应.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }); 响应.end('502 云端 API 转发失败: ' + 错误.message); } else { try { 响应.destroy(); } catch (e) {} } });
        // 浏览器 reload/取消时请求与响应都会中断：不挂 error 处理会让 pipe 抛未捕获异常并杀死整个服务器，页面后续资源全部悬空
        请求.on('error', () => { try { 转发.destroy(); } catch (e) {} });
        响应.on('error', () => { try { 转发.destroy(); } catch (e) {} });
        请求.pipe(转发);
        return;
    }
    let 路径 = decodeURIComponent(请求.url.split('?')[0]);
    let 文件 = path.join(站点目录, 路径);

    if (fs.existsSync(文件) && fs.statSync(文件).isDirectory()) {
        文件 = path.join(文件, 'index.html');
    }
    if (!fs.existsSync(文件)) {
        if (无回退) {
            // 多页面站点：如实报 404，避免把缺失资源掩盖成首页
            响应.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            响应.end('404 Not Found: ' + 路径);
            return;
        }
        // SPA 回退：任何未命中的路径都交给前端路由处理
        文件 = path.join(站点目录, 'index.html');
    }

    const 类型 = 类型表[path.extname(文件).toLowerCase()] ?? 'application/octet-stream';
    // 缓存策略：HTML 永远 no-store（页面入口必须即时反映改动）。--cache 时：图片发 1 小时强缓存（内容不变，适合隧道省流），js/css 发 no-cache + ETag 协商缓存——代码改动即时生效（旧 JS 滞留会把旧 bug 喂给用户，Worker 脚本尤其隐蔽），重复访问只回 304，省流与改码即生效两不误；未开 --cache 时全部 no-store 保调试
    const 是页面 = 类型.startsWith('text/html');
    const 是图片 = 类型.startsWith('image/');
    const 缓存头 = 是页面 ? 'no-store' : (缓存资产 ? (是图片 ? 'public, max-age=3600' : 'no-cache') : 'no-store');
    // 文本类资产（js/css/html/json/svg）超过 4KB 就 gzip：calculator.v3.js 707KB 压到约 1/5，隧道场景省下的是实打实的秒数
    // 页面：给 js/css 引用盖版本标记后整页送出（HTML 很小，直接读入内存改写）
    if (是页面) {
        const 页内容 = Buffer.from(打版本标记(fs.readFileSync(文件, 'utf8'), path.dirname(文件)), 'utf8');
        if (/gzip/.test(请求.headers['accept-encoding'] ?? '')) {
            const 压缩页 = zlib.gzipSync(页内容);
            响应.writeHead(200, { 'Content-Type': 类型, 'Cache-Control': 'no-store', 'Content-Encoding': 'gzip', 'Content-Length': 压缩页.length });
            响应.end(压缩页);
        } else {
            响应.writeHead(200, { 'Content-Type': 类型, 'Cache-Control': 'no-store', 'Content-Length': 页内容.length });
            响应.end(页内容);
        }
        return;
    }
    const 统计 = fs.statSync(文件);
    // 调试改写命中时以内存副本为准：内容、长度、ETag 都按改写后的字节流计算（磁盘与 git 里的文件保持上游原样）
    const 改写前 = 改写规则表.some(规则 => 规则.路径.test(路径)) ? fs.readFileSync(文件, 'utf8') : null;
    const 资产文本 = 改写前 === null ? null : 调试改写(改写前, 路径);
    const 有效大小 = 资产文本 === null ? 统计.size : Buffer.byteLength(资产文本);
    const 标签 = `W/"${有效大小.toString(16)}-${Math.round(统计.mtimeMs).toString(16)}${资产文本 === null ? '' : '-rw'}"`;
    const 可协商 = 缓存资产 && !是页面 && !是图片;
    if (可协商 && 请求.headers['if-none-match'] === 标签) {
        响应.writeHead(304, { 'ETag': 标签, 'Cache-Control': 缓存头 });
        响应.end();
        return;
    }
    const 可压缩 = (类型.startsWith('text/') || /^(application\/(javascript|json))|svg/.test(类型)) && 有效大小 > 4096;
    if (可压缩 && /gzip/.test(请求.headers['accept-encoding'] ?? '')) {
        const 数据 = zlib.gzipSync(资产文本 === null ? fs.readFileSync(文件) : Buffer.from(资产文本, 'utf8'));
        响应.writeHead(200, { 'Content-Type': 类型, 'Cache-Control': 缓存头, 'ETag': 标签, 'Content-Encoding': 'gzip', 'Content-Length': 数据.length });
        响应.end(数据);
        return;
    }
    const 载荷 = 资产文本 === null ? null : Buffer.from(资产文本, 'utf8');
    响应.writeHead(200, { 'Content-Type': 类型, 'Cache-Control': 缓存头, 'ETag': 标签, 'Content-Length': 有效大小 });
    if (载荷 === null) { fs.createReadStream(文件).pipe(响应); return; }
    响应.end(载荷);
}).listen(端口, () => {
    console.log(`静态服务器已启动: http://localhost:${端口}`);
    console.log(`服务目录: ${站点目录}`);
    console.log(`连接模式: ${保活 ? 'keep-alive（连接复用，适合 cpolar 隧道）' : 'Connection: close（每请求新建连接，VS Code SSH 隧道兼容）'}`);
    console.log(`资产缓存: ${缓存资产 ? '图片强缓存 1 小时 + js/css ETag 协商（改动即生效）' : 'no-store（调试模式）'}` + (图片外链 ? ` | 图片 302 外链: ${图片外链}` : ''));
    console.log(`调试改写: ${改写规则表.length} 条规则（仅改响应，磁盘/git 零痕迹）`);
});
