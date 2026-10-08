/**
 * 平台抽象層：同一份前端程式碼同時支援「網頁」與「Electron 桌面版」。
 *
 * - 網頁版：apiFetch 等同原生 fetch（遇 CORS 需搭配 server_proxy.js）。
 * - 桌面版：preload.js 會注入 window.desktop，apiFetch 改走主程序代送請求，
 *   不受瀏覽器 CORS 限制，因此不需要另外啟動代理。
 */
(function () {
    const desktop = window.desktop;
    const isDesktop = Boolean(desktop && desktop.isElectron);

    window.isDesktopApp = isDesktop;
    document.documentElement.classList.add(isDesktop ? 'is-desktop' : 'is-web');

    window.apiFetch = async function apiFetch(url, options = {}) {
        if (!isDesktop) return fetch(url, options);

        const result = await desktop.request({
            url: String(url),
            method: options.method || 'GET',
            headers: options.headers || {},
            body: typeof options.body === 'string' ? options.body : undefined
        });
        if (result.error) {
            const message = result.errorCode ? t(`error.${result.errorCode}`, { detail: result.errorDetail || '' }) : result.error;
            throw new Error(message);
        }

        return {
            ok: result.status >= 200 && result.status < 300,
            status: result.status,
            statusText: result.statusText,
            text: async () => result.body,
            json: async () => JSON.parse(result.body)
        };
    };
})();
