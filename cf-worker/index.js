const PREFLIGHT_INIT = {
    status: 204,
    headers: new Headers({
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers": "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token, Notion-Version",
    }),
};

// 使用Set以获得更好的性能
const BLOCKED_EXTENSIONS = new Set([
    ".m3u8",
    ".ts",
    ".acc",
    ".m4s",
]);
const BLOCKED_DOMAINS = new Set([
    "photocall.tv",
    "googlevideo.com",
    "xunleix.com"
]);

// 增加域名白名单
const ALLOWED_DOMAINS = new Set([
    // 在这里添加你允许代理的域名，例如：
    // "example.com",
    // "api.example.com",
]);


function isUrlBlocked(url) {
    const lowercasedUrl = url.toLowerCase();
    for (const ext of BLOCKED_EXTENSIONS) {
        if (lowercasedUrl.endsWith(ext)) {
            return true;
        }
    }
    for (const domain of BLOCKED_DOMAINS) {
        if (lowercasedUrl.includes(domain)) {
            return true;
        }
    }
    return false;
}

async function handleRequest(event) {
    const {
        request
    } = event;

    const reqHeaders = new Headers(request.headers);
    const outHeaders = new Headers({
        "Access-Control-Allow-Origin": reqHeaders.get("Origin") || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": reqHeaders.get("Access-Control-Allow-Headers") || "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token, Notion-Version",
    });

    if (request.method === "OPTIONS") {
        return new Response(null, PREFLIGHT_INIT);
    }

    try {
        const urlString = decodeURIComponent(request.url.split('/').slice(3).join('/'));
        
        if (urlString.length < 3 || urlString.indexOf('.') === -1 || urlString === "favicon.ico" || urlString === "robots.txt") {
            return Response.redirect('https://baidu.com', 301);
        }

        if (isUrlBlocked(urlString)) {
            return Response.redirect('https://baidu.com', 301);
        }

        const url = new URL(urlString.startsWith('http') ? urlString : 'http://' + urlString);

        // 如果启用了白名单，则检查域名
        if (ALLOWED_DOMAINS.size > 0 && !ALLOWED_DOMAINS.has(url.hostname)) {
            return new Response("Domain not allowed", { status: 403 });
        }


        const fp = {
            method: request.method,
            headers: new Headers(reqHeaders),
        };

        fp.headers.delete('content-length');

        if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
            fp.body = request.body;
        }

        let fr = await fetch(new Request(url, fp));

        for (const [key, value] of fr.headers.entries()) {
            outHeaders.set(key, value);
        }

        const outCt = fr.headers.get('content-type') || '';
        let outBody = fr.body;
        
        if (outCt.includes('text/html')) {
            try {
                const rewriter = new HTMLRewriter().on("head", {
                    element(element) {
                        element.prepend(`<base href="${url.origin}" />`, {
                            html: true
                        });
                    },
                });
                outBody = rewriter.transform(fr).body;
            } catch (e) {
                // 如果HTMLRewriter失败，则返回原始响应
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
            msg: err.stack || err.toString(),
        }), {
            status: 500,
            headers: {
                "content-type": "application/json"
            }
        });
    }
}

addEventListener('fetch', event => {
    event.passThroughOnException();
    event.respondWith(handleRequest(event));
});
