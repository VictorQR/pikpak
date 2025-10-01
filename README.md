# PikPak 个人网页版

![PikPak Web UI](https://socialify.git.ci/tjsky/pikpak/image?forks=1&language=1&name=1&owner=1&pattern=Signal&stargazers=1&theme=Light)

一个功能强大的 PikPak 网盘第三方 Web 客户端。它提供了接近原生体验的文件管理和浏览功能，并支持自托管部署。

## 相关链接

-   **在线演示:** [Demo](https://tjsky.github.io/pikpak/)
-   **PikPak 官网:** [mypikpak.com](https://mypikpak.com)
-   **官方 Web 版:** [drive.mypikpak.com](https://drive.mypikpak.com/)
-   **官方 Telegram 群:** [t.me/pikpak_userservice](https://t.me/pikpak_userservice)

## 功能特性

-   :file_folder: **全面的文件管理**: 支持文件和文件夹的浏览、重命名、复制、移动、删除和回收站管理。
-   :film_frames: **在线媒体播放**: 直接在浏览器中播放视频、音频和预览图片。
-   :magnet: **强大的离线下载**: 支持添加磁力链接（Magnet）、HTTP 链接和 PikPak 秒传链接进行离线下载。
-   :arrow_down: **灵活的下载方式**: 支持文件直接下载，也可以推送到您自己的 Aria2 服务器进行下载。
-   :link: **分享与协作**: 支持创建文件分享链接，方便与他人共享资源。
-   :busts_in_silhouette: **完整的账户系统**: 支持邮箱/手机号登录、注册以及邀请码系统。
-   :gear: **高度自定义设置**:
    -   **Aria2 配置**: 对接您自己的 Aria2 服务，实现高效下载。
    -   **反向代理设置**: 自定义 API 代理，解决跨域问题。
    -   **自定义菜单**: 根据您的需求，为文件操作添加自定义的快捷方式（如调用外部播放器、发送到其他工具等）。
    -   **Telegram 绑定**: 关联您的 Telegram 账号。

## 部署指南

您可以将此项目部署在任何静态网站托管平台，如 GitHub Pages, Vercel, Netlify, 或您自己的服务器。

部署过程主要分为 **前端项目打包** 和 **配置反向代理** 两个核心步骤。

### 步骤 1: 准备工作

确保您的本地环境已安装以下软件：

-   [Node.js](https://nodejs.org/) (建议使用 v16 或更高版本)
-   [Git](https://git-scm.com/)

### 步骤 2: 获取并打包项目

```bash
# 1. 克隆仓库到本地
git clone [https://github.com/victorqr/pikpak.git](https://github.com/victorqr/pikpak.git)

# 2. 进入项目目录
cd pikpak

# 3. 安装项目依赖
npm install

# 4. 打包构建项目
npm run build
````

构建成功后，所有用于部署的静态文件都会生成在 `dist` 文件夹中。

### 步骤 3: 配置反向代理 (关键)

由于浏览器跨域安全策略的限制，前端页面无法直接请求 PikPak 的 API。因此，我们需要一个反向代理来中转请求。这里我们推荐使用免费的 **Cloudflare Worker**。

1.  **登录 Cloudflare**: 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2.  **进入 Workers 和 Pages**: 在左侧菜单中选择 `Workers & Pages`。
3.  **创建 Worker**: 点击 `Create application` -\> `Create Worker`。
4.  **配置 Worker**:
      - 为你的 Worker 设置一个自定义的子域名（例如 `my-pikpak-proxy`）。
      - 点击 `Deploy`。
5.  **编辑代码**:
      - 部署成功后，点击 `Edit code`。
      - **清空** 编辑器中所有默认代码。
      - 将下面的 **完整 Worker 脚本** 复制并粘贴到编辑器中。
      - 点击 `Save and Deploy`。

现在，你的反向代理已经在 `https://<你的Worker名>.<你的子域名>.workers.dev` 上运行了。

\<details\>
\<summary\>\<b\>点击展开/折叠 Cloudflare Worker 脚本\</b\>\</summary\>

```javascript
/**
 * 预检请求的配置
 */
const PREFLIGHT_INIT = {
    status: 204,
    headers: new Headers({
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers": "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token, Notion-Version",
    }),
};

/**
 * 黑名单：包含不希望代理的URL关键字或扩展名
 */
const BLOCKED_KEYWORDS = new Set([
    ".m3u8",
    ".ts",
    ".acc",
    ".m4s",
    "photocall.tv",
    "googlevideo.com",
    "xunleix.com",
]);

/**
 * 白名单：允许代理的域名列表，支持通配符
 */
const ALLOWED_DOMAINS = new Set([
    // PikPak 及其所有子域名
    "*.mypikpak.com",
    "mypikpak.com",

    // 其他依赖服务
    "api.notion.com",
    "invite.z7.workers.dev",
    "pikpak-depot.z10.workers.dev"
]);

/**
 * 检查URL是否在黑名单中
 * @param {string} url 要检查的URL
 * @returns {boolean} 如果在黑名单中则返回 true
 */
function isUrlBlocked(url) {
    const lowercasedUrl = url.toLowerCase();
    for (const keyword of BLOCKED_KEYWORDS) {
        if (lowercasedUrl.includes(keyword)) {
            return true;
        }
    }
    return false;
}

/**
 * 检查域名是否在白名单中（支持通配符）
 * @param {string} hostname 要检查的域名
 * @returns {boolean} 如果在白名单中则返回 true
 */
function isDomainAllowed(hostname) {
    if (ALLOWED_DOMAINS.size === 0) {
        return true; // 如果白名单为空，则允许所有域名
    }
    for (const rule of ALLOWED_DOMAINS) {
        if (rule.startsWith("*.")) {
            if (hostname.endsWith(rule.slice(1)) || hostname === rule.slice(2)) {
                return true;
            }
        } else if (hostname === rule) {
            return true;
        }
    }
    return false;
}

/**
 * 处理请求
 * @param {FetchEvent} event
 */
async function handleRequest(event) {
    const { request } = event;

    if (request.method === "OPTIONS") {
        return new Response(null, PREFLIGHT_INIT);
    }

    const reqHeaders = new Headers(request.headers);
    const outHeaders = new Headers({
        "Access-Control-Allow-Origin": reqHeaders.get("Origin") || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": reqHeaders.get("Access-Control-Allow-Headers") || "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token, Notion-Version",
    });

    try {
        const urlString = decodeURIComponent(request.url.split('/').slice(3).join('/'));

        if (urlString.length < 3 || urlString.indexOf('.') === -1 || ["favicon.ico", "robots.txt"].includes(urlString)) {
            return Response.redirect('[https://baidu.com](https://baidu.com)', 301);
        }

        if (isUrlBlocked(urlString)) {
            return Response.redirect('[https://baidu.com](https://baidu.com)', 301);
        }
        
        const url = new URL(urlString.startsWith('http') ? urlString : 'http://' + urlString);

        if (!isDomainAllowed(url.hostname)) {
            return new Response(`Domain ${url.hostname} is not allowed.`, { status: 403 });
        }

        const newReqHeaders = new Headers(reqHeaders);
        newReqHeaders.delete('content-length');
        
        const fp = {
            method: request.method,
            headers: newReqHeaders,
            body: ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) ? request.body : null,
        };

        const fr = await fetch(new Request(url, fp));

        for (const [key, value] of fr.headers.entries()) {
            outHeaders.set(key, value);
        }
        
        const outCt = fr.headers.get('content-type') || '';
        let outBody = fr.body;

        if (outCt.includes('text/html')) {
            try {
                const rewriter = new HTMLRewriter().on("head", {
                    element(element) {
                        element.prepend(`<base href="${url.origin}" />`, { html: true });
                    },
                });
                return rewriter.transform(fr);
            } catch (e) {
                // 如果HTMLRewriter失败，则直接返回原始响应
            }
        }
        
        return new Response(outBody, {
            status: fr.status,
            statusText: fr.statusText,
            headers: outHeaders,
        });

    } catch (err) {
        return new Response(JSON.stringify({
            code: -1,
            msg: err.stack || String(err),
        }), {
            status: 500,
            headers: { "content-type": "application/json" }
        });
    }
}

addEventListener('fetch', event => {
    event.passThroughOnException();
    event.respondWith(handleRequest(event));
});
```

\</details\>

### 步骤 4: 修改前端配置并重新打包

1.  打开项目代码中的 `src/config/index.ts` 文件。

2.  将其中的 `proxy` 数组修改为您刚刚创建的 Worker 地址。

    ```typescript
    export const proxy = [
      'https://<你的Worker名>.<你的子域名>.workers.dev'
      // 你也可以添加多个备用地址
    ]
    ```

3.  **保存文件后，重新执行打包命令**：

    ```bash
    npm run build
    ```

### 步骤 5: 部署

现在，将 `dist` 文件夹中的所有内容上传到您的静态网站托管平台即可。

## 致谢

本项目 CDN 加速及安全防护由 [Tencent EdgeOne](https://edgeone.ai/zh?from=github) 赞助

