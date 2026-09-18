/**
 * Draw Things CORS 代理伺服器
 * ------------------------------------------------------------
 * 用途：Draw Things 的 HTTP API Server（預設 http://127.0.0.1:7860）
 * 沒有加上 CORS 標頭，瀏覽器直接用 fetch() 呼叫時會被擋下。
 * 這支腳本在本機開一個小型代理，幫每個回應加上
 * Access-Control-Allow-Origin，讓網頁可以順利呼叫。
 *
 * 使用方式：
 *   node server_proxy.js
 *
 * 預設：轉發到 127.0.0.1:7860，自己監聽在 8791。
 * 可用環境變數調整：
 *   DT_HOST=127.0.0.1 DT_PORT=7860 PROXY_PORT=8791 node server_proxy.js
 *
 * 啟動後，把 index.html 主控面板裡的「Draw Things API 位址」
 * 改成： http://127.0.0.1:8791
 * ------------------------------------------------------------
 */

const http = require('http');

const TARGET_HOST = process.env.DT_HOST || '127.0.0.1';
const TARGET_PORT = process.env.DT_PORT || 7860;
const LISTEN_PORT = process.env.PROXY_PORT || 8791;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
        const body = Buffer.concat(chunks);

        const proxyReq = http.request(
            {
                hostname: TARGET_HOST,
                port: TARGET_PORT,
                path: req.url,
                method: req.method,
                headers: {
                    ...req.headers,
                    host: `${TARGET_HOST}:${TARGET_PORT}`,
                    'content-length': body.length
                }
            },
            proxyRes => {
                const headers = { ...proxyRes.headers, 'Access-Control-Allow-Origin': '*' };
                res.writeHead(proxyRes.statusCode, headers);
                proxyRes.pipe(res, { end: true });
            }
        );

        proxyReq.on('error', err => {
            console.error('❌ 轉發到 Draw Things 失敗:', err.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Proxy error connecting to Draw Things',
                detail: err.message,
                hint: `請確認 Draw Things App 已開啟，且 HTTP API Server 正監聽 ${TARGET_HOST}:${TARGET_PORT}`
            }));
        });

        if (body.length > 0) proxyReq.write(body);
        proxyReq.end();
    });
});

server.listen(LISTEN_PORT, () => {
    console.log(`✅ Draw Things CORS 代理已啟動： http://127.0.0.1:${LISTEN_PORT}`);
    console.log(`👉 轉發目標： http://${TARGET_HOST}:${TARGET_PORT}`);
    console.log(`📌 請在網頁的「Draw Things API 位址」欄位填入： http://127.0.0.1:${LISTEN_PORT}`);
});
