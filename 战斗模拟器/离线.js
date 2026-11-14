const 缓存名称 = '颠倒镜-应用-__缓存指纹__';
const 目录 = new URL('./', self.location.href);
const 资源 = ['index.html', '界面.css', '应用.mjs', '战斗引擎.mjs', '角色数据.mjs', '编译技能文本.mjs', '真实角色目录.json', '真实角色技能.json', '真实ELv技能.json', '真实养成数据.json', '真实敌方资料.json', '关卡数据.mjs', '敌方行动规则.mjs', '图标.js', 'manifest.webmanifest', '镜面-192.png', '镜面-512.png', '海岸-512.png'];

self.addEventListener('install', 事件 => {
    事件.waitUntil(caches.open(缓存名称).then(缓存 => 缓存.addAll(资源.map(文件 => new Request(new URL(文件, 目录), { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', 事件 => {
    事件.waitUntil(caches.keys().then(名称列表 => Promise.all(名称列表.filter(名称 => 名称.startsWith('颠倒镜-应用-') && 名称 !== 缓存名称).map(名称 => caches.delete(名称)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', 事件 => {
    const 请求 = 事件.request;
    const 地址 = new URL(请求.url);
    if (请求.method !== 'GET' || 地址.origin !== 目录.origin || !地址.pathname.startsWith(目录.pathname)) return;
    if (请求.mode === 'navigate') {
        事件.respondWith(fetch(请求).catch(() => caches.match(new URL('index.html', 目录).href)));
        return;
    }
    事件.respondWith(caches.open(缓存名称).then(async 缓存 => (await 缓存.match(请求, { ignoreSearch: true })) || fetch(请求)));
});