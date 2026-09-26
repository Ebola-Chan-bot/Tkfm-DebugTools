// 极简静态文件服务器：默认把 TKFM-Data-Room/dist 目录通过 http://localhost:3000 暴露出来，用于本地浏览器实测
// 支持命令行参数：node 静态服务器.js [目标目录(相对本脚本或绝对)] [端口] [--no-spa]
//   --no-spa 关闭 SPA 回退，未命中路径返回 404，适用于 tenkaassist 这类多页面站点（回退会把 404 掩盖成首页）
// 默认带 SPA 回退（找不到文件时返回根 index.html），满足 nuxt generate 产物的前端路由需求
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 本地开发反向代理的目标云端 API（tenkaassist 的后端）：它按 Origin 白名单只放行 GitHub Pages，本地页面直连会被 403 Invalid CORS request 拒绝，故经本代理去掉 Origin/Referer 后转发，浏览器侧表现为同源请求、不触发跨源限制
const 云端API主机 = 'port-0-tenkafuma-assistant-server-1272llx2xidhk.sel5.cloudtype.app';

const 参数 = process.argv.slice(2);
const 无回退 = 参数.includes('--no-spa');
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

http.createServer((请求, 响应) => {
    // 每个响应都关闭 keep-alive（Connection: close）：VS Code Remote-SSH 端口转发隧道会吞掉服务端关闭空闲连接的 FIN，浏览器不知情、把已死连接留在保活池里；location.reload()（语言切换）复用这些死连接 → 请求永不返回 → 页面持续加载。关闭保活后每个请求都走全新隧道连接，reload 不再踩雷
    响应.setHeader('Connection', 'close');
    // 每请求日志：finish=正常完成 close 未完成=中途断开；带时间戳用于对齐浏览器 reload 时序，定位哪个资源没到达/被截断
    const 起点 = Date.now();
    const 原始url = 请求.url;
    const 戳 = () => new Date().toISOString().slice(11, 23);
    const 对端 = () => `←${请求.socket.remoteAddress}:${请求.socket.remotePort}`;
    响应.on('finish', () => console.log(`${戳()} OK ${响应.statusCode} ${Date.now() - 起点}ms ${请求.method} ${原始url} ${对端()}`));
    响应.on('close', () => { if (!响应.writableEnded) console.log(`${戳()} CUT ${Date.now() - 起点}ms ${请求.method} ${原始url}`); });
    // /api/* 反向代理：原样转发 method/body/头（去掉 host/origin/referer 让云端按无来源放行），响应去掉 CORS 头后原样回传
    if (请求.url === '/api' || 请求.url.startsWith('/api/')) {
        const 目标路径 = 请求.url.slice('/api'.length) || '/';
        const 转发头 = { ...请求.headers };
        delete 转发头.host; delete 转发头.origin; delete 转发头.referer;
        const 转发 = https.request({ hostname: 云端API主机, path: 目标路径, method: 请求.method, headers: 转发头 }, (回) => {
            const 回头 = { ...回.headers };
            delete 回头['access-control-allow-origin']; delete 回头['access-control-allow-credentials'];
            delete 回头['connection']; delete 回头['keep-alive']; // 统一由上面的 Connection: close 决定客户端侧连接行为
            响应.writeHead(回.statusCode, 回头);
            回.pipe(响应);
        });
        转发.on('error', () => { if (!响应.headersSent) { 响应.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }); 响应.end('proxy error'); } else { try { 响应.destroy(); } catch (e) {} } });
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
    // 开发期禁用缓存：本服务器服务的 js/css/html 常在一轮调试中被反复改写，启发式缓存会把旧字节喂给浏览器（Worker 脚本尤其隐蔽）
    响应.writeHead(200, { 'Content-Type': 类型, 'Cache-Control': 'no-store' });
    fs.createReadStream(文件).pipe(响应);
}).listen(端口, () => {
    console.log(`静态服务器已启动: http://localhost:${端口}`);
    console.log(`服务目录: ${站点目录}`);
});
