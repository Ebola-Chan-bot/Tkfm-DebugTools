// 极简静态文件服务器：把 TKFM-Data-Room/dist 目录通过 http://localhost:3000 暴露出来，用于本地浏览器实测
// 支持目录 index.html 解析与 SPA 回退（找不到文件时返回根 index.html），满足 nuxt generate 产物的路由需求
const http = require('http');
const fs = require('fs');
const path = require('path');

const 站点目录 = path.resolve(__dirname, '..', 'TKFM-Data-Room', 'dist');
const 端口 = 3000;

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
    let 路径 = decodeURIComponent(请求.url.split('?')[0]);
    let 文件 = path.join(站点目录, 路径);

    if (fs.existsSync(文件) && fs.statSync(文件).isDirectory()) {
        文件 = path.join(文件, 'index.html');
    }
    if (!fs.existsSync(文件)) {
        // SPA 回退：任何未命中的路径都交给前端路由处理
        文件 = path.join(站点目录, 'index.html');
    }

    const 类型 = 类型表[path.extname(文件).toLowerCase()] ?? 'application/octet-stream';
    响应.writeHead(200, { 'Content-Type': 类型 });
    fs.createReadStream(文件).pipe(响应);
}).listen(端口, () => {
    console.log(`静态服务器已启动: http://localhost:${端口}`);
    console.log(`服务目录: ${站点目录}`);
});
