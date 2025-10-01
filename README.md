# PikPak 个人网页版

一个功能强大的 PikPak 网盘第三方 Web 客户端。它提供了接近原生体验的文件管理和浏览功能，并支持自托管部署。

## 相关链接

  - **在线演示:** [https://tjsky.github.io/pikpak/](https://tjsky.github.io/pikpak/)
  - **PikPak 官网:** [https://mypikpak.com](https://mypikpak.com)
  - **官方 Web 版:** [https://drive.mypikpak.com/](https://drive.mypikpak.com/)
  - **官方 Telegram 群:** [https://t.me/pikpak\_userservice](https://t.me/pikpak_userservice)

## 功能特性

  - **全面的文件管理**: 支持文件和文件夹的浏览、重命名、复制、移动、删除和回收站管理。
  - **在线媒体播放**: 直接在浏览器中播放视频、音频和预览图片。
  - **强大的离线下载**: 支持添加磁力链接（Magnet）、HTTP 链接和 PikPak 秒传链接进行离线下载。
  - **灵活的下载方式**: 支持文件直接下载，也可以推送到您自己的 Aria2 服务器进行下载。
  - **分享与协作**: 支持创建文件分享链接，方便与他人共享资源。
  - **完整的账户系统**: 支持邮箱/手机号登录、注册以及邀请码系统。
  - **高度自定义设置**:
      - **Aria2 配置**: 对接您自己的 Aria2 服务，实现高效下载。
      - **反向代理设置**: 自定义 API 代理，解决跨域问题。
      - **自定义菜单**: 根据您的需求，为文件操作添加自定义的快捷方式。
      - **Telegram 绑定**: 关联您的 Telegram 账号。

## 部署指南

您可以将此项目部署在任何静态网站托管平台，如 GitHub Pages, Vercel, Netlify, 或您自己的服务器。部署过程主要分为 **前端项目打包** 和 **配置反向代理** 两个核心步骤。

### 步骤 1: 准备工作

确保您的本地环境已安装以下软件：

  - Node.js (建议使用 v16 或更高版本)
  - Git

### 步骤 2: 获取并打包项目

```
# 1. 克隆仓库到本地
git clone [https://github.com/victorqr/pikpak.git](https://github.com/victorqr/pikpak.git)

# 2. 进入项目目录
cd pikpak

# 3. 安装项目依赖
npm install

# 4. 打包构建项目
npm run build
```

构建成功后，所有用于部署的静态文件都会生成在 `dist` 文件夹中。

### 步骤 3: 配置反向代理 (关键)

由于浏览器跨域安全策略的限制，我们需要一个反向代理来中转 API 请求。这里我们推荐使用免费的 **Cloudflare Worker**。

1.  **登录 Cloudflare**: 打开 Cloudflare Dashboard。
2.  **进入 Workers 和 Pages**: 在左侧菜单中选择 `Workers & Pages`。
3.  **创建 Worker**: 点击 `Create application` -\> `Create Worker`，然后为您的 Worker 命名并部署。
4.  **编辑代码**: 部署成功后，点击 `Edit code`。**清空** 编辑器中所有默认代码，然后将仓库中 `cf-worker/index.js` 文件的全部内容复制并粘贴到编辑器中，最后点击 `Save and Deploy`。

现在，你的反向代理已经在 `https://<你的Worker名>.<你的子域名>.workers.dev` 上运行了。

### 步骤 4: 修改前端配置并重新打包

1.  打开项目代码中的 `src/config/index.ts` 文件。

2.  将其中的 `proxy` 数组修改为您刚刚创建的 Worker 地址。

    ```
    export const proxy = [
      'https://<你的Worker名>.<你的子域名>.workers.dev'
    ]
    ```

3.  **保存文件后，重新执行打包命令**：

    ```
    npm run build
    ```

### 步骤 5: 部署

现在，将 `dist` 文件夹中的所有内容上传到您的静态网站托管平台即可。

## 致谢

本项目 CDN 加速及安全防护由 Tencent EdgeOne 赞助
