# 启动 tenkaassist 本地实测服务器（端口 5500，与作者留在 common.js 注释里的本地调试端口一致）
# tenkaassist 是纯静态多页面站点，无需构建；页面引用的 js/css 均为仓库内相对路径，角色图片由 common.js 的 address 变量指向线上 GitHub Pages，本地实测时直接从线上加载
# 注意：登记队伍校验通过的队伍会真实 POST 到线上服务器（common.js 的 server 变量），实测拒绝消息时用非法队伍即可，不会触碰线上数据
$ErrorActionPreference = 'Stop'
# 必须传绝对路径：静态服务器.js 内部用 path.resolve(__dirname, 参数) 解析，相对路径会被错认成本脚本所在目录
$站点目录 = (Resolve-Path (Join-Path $PSScriptRoot '..\tenkaassist')).Path
node (Join-Path $PSScriptRoot '静态服务器.js') $站点目录 5500 --no-spa
