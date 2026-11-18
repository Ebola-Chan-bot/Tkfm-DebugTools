const 缓存名称 = '颠倒镜-应用-__缓存指纹__';
const 目录 = new URL('./', self.location.href);
const 资源 = ['index.html', '界面.css', '应用.mjs', '战斗引擎.mjs', '角色数据.mjs', '玩家角色池.mjs', '编译技能文本.mjs', '真实角色目录.json', '真实角色技能.json', '真实ELv技能.json', '真实养成数据.json', '真实敌方资料.json', '关卡数据.mjs', '敌方行动规则.mjs', '图标.js', 'manifest.webmanifest', '镜面-192.png', '镜面-512.png', '海岸-512.png', '职业图标/attacker.png', '职业图标/healer.png', '职业图标/protector.png', '职业图标/supporter.png', '职业图标/obstructer.png'];
// 角色头像按真实角色目录缓存，路径由角色编号决定，不参与战斗计算；Service Worker 是经典脚本，顶层 await 会让整个脚本评估失败导致注册被拒，故头像清单改在 install 事件内异步拉取后再 addAll。
const 头像清单 = () => fetch(new URL('真实角色目录.json', 目录)).then(响应 => 响应.json()).then(目录表 => 目录表.map(单位 => `角色头像/cs${单位.编号}_0_0.webp`));

self.addEventListener('install', 事件 => {
    事件.waitUntil(头像清单().then(头像 => caches.open(缓存名称).then(缓存 => 缓存.addAll([...资源, ...头像].map(文件 => new Request(new URL(文件, 目录), { cache: 'reload' })))).then(() => self.skipWaiting())));
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
    事件.respondWith(fetch(请求).catch(async 错误 => {
        const 缓存 = await caches.open(缓存名称);
        const 已缓存 = await 缓存.match(请求, { ignoreSearch: true });
        if (已缓存) return 已缓存;
        throw 错误;
    }));
});