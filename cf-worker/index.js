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
 * 例如:
 * - "mypikpak.com"      // 精确匹配 mypikpak.com
 * - "*.mypikpak.com"      // 匹配所有 mypikpak.com 的子域名
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
        // 如果白名单为空，则允许所有域名
        return true;
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
            return Response.redirect('https://baidu.com', 301);
        }

        if (isUrlBlocked(urlString)) {
            return Response.redirect('https://baidu.com', 301);
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