# 🦖 Pterodactyl File Manager - Cloudflare Worker 版

翼龙面板文件管理器，部署在 Cloudflare Worker 上。

## 功能

- 📂 文件列表浏览
- ✏️ 在线编辑文件
- ⬇️ 下载文件
- ⬆️ 上传文件
- 🗑️ 删除文件/文件夹
- 📝 重命名文件/文件夹
- 📁 新建文件/文件夹
- 🔌 电源控制（开机/关机/重启）

## 部署

```bash
wrangler deploy
```

或直接在 Cloudflare Dashboard 创建 Worker，粘贴 `index.js` 代码。

## 使用

1. 访问 Worker URL
2. 填写 API 地址、Server ID、API Key
3. 点击保存配置

配置保存在浏览器 localStorage 中。
