/**
 * 工作階段：驗證、序列化與分享連結編碼（純函式，可在 Node 測試）
 * ------------------------------------------------------------
 * 工作階段包含已選標籤（權重、釘選）、模式、尺寸、繪圖引擎、背景與品質、範本與隨機抽卡設定。
 * 不包含 API 位址與產圖參數（隱私與避免把本機設定分享出去）。
 * 載入時一律經過 sanitize：只接受目前詞庫中存在的提示詞、已知的引擎與範本，
 * 所以分享連結或匯入的檔案無法塞入任意文字到提示詞。
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Session = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const VERSION = 1;
    const FORMAT = 'game-asset-session/1';
    const MAX_SELECTIONS = 300;
    const MAX_PAYLOAD = 20000;
    const PLATFORMS = ['mobile', 'steam'];
    const DIMENSIONS = ['general', '2d', '3d'];

    const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
    const text = (value, max = 200) => (typeof value === 'string' ? value.slice(0, max) : '');

    function clampWeight(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 1;
        return Math.min(2, Math.max(0.2, Math.round(n * 10) / 10));
    }
    function dimension(value) {
        const n = Math.round(Number(value));
        return Number.isFinite(n) && n >= 16 && n <= 16384 ? n : null;
    }

    /**
     * 驗證並正規化外部輸入。ctx 提供目前可用的選項：
     * { prompts: Set, engines: [], sheets: [], templates: [], backgrounds: [], qualities: [] }
     * 回傳 { state, skipped }；格式錯誤回傳 null。
     */
    function sanitize(raw, ctx = {}) {
        if (!isObject(raw)) return null;
        const pick = (value, allowed, fallback) => (!allowed || allowed.includes(value) ? value : fallback);
        const known = ctx.prompts;

        const selections = [];
        const seen = new Set();
        let skipped = 0;
        for (const item of Array.isArray(raw.selections) ? raw.selections.slice(0, MAX_SELECTIONS) : []) {
            const prompt = isObject(item) ? item.prompt : item;
            if (typeof prompt !== 'string' || seen.has(prompt)) continue;
            if (known && !known.has(prompt)) { skipped += 1; continue; }
            seen.add(prompt);
            selections.push({ prompt, weight: clampWeight(isObject(item) ? item.weight : 1), pinned: isObject(item) && item.pinned === true });
        }

        const random = isObject(raw.random) ? raw.random : {};
        const state = {
            version: VERSION,
            platform: pick(raw.platform, PLATFORMS, 'mobile'),
            dimension: pick(raw.dimension, DIMENSIONS, 'general'),
            engine: pick(raw.engine, ctx.engines, ctx.engines ? ctx.engines[0] : 'sdxl'),
            background: pick(text(raw.background), ctx.backgrounds, null),
            quality: pick(text(raw.quality), ctx.qualities, null),
            width: dimension(raw.width),
            height: dimension(raw.height),
            preset: typeof raw.preset === 'string' ? text(raw.preset, 80) : null,
            template: typeof raw.template === 'string' && (!ctx.templates || ctx.templates.includes(raw.template)) ? raw.template : null,
            selections,
            random: {
                sheets: (Array.isArray(random.sheets) ? random.sheets : []).filter(id => typeof id === 'string' && (!ctx.sheets || ctx.sheets.includes(id))),
                variety: random.variety !== false
            }
        };
        return { state, skipped };
    }

    // ---------------------------------------------------------------- 分享連結

    function toBase64Url(str) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        bytes.forEach(byte => { binary += String.fromCharCode(byte); });
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function fromBase64Url(code) {
        const padded = code.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (code.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    function encodeShare(state) { return toBase64Url(JSON.stringify(state)); }

    /** 從網址、#s=…、或純代碼中取出代碼；找不到回傳 null。 */
    function extractPayload(input) {
        const value = String(input || '').trim();
        if (!value) return null;
        const match = value.match(/[#&?]s=([A-Za-z0-9_-]+)/);
        if (match) return match[1];
        return /^[A-Za-z0-9_-]{16,}$/.test(value) ? value : null;
    }

    /** 解碼分享連結／代碼為原始物件（尚未驗證）；失敗回傳 null。 */
    function decodeShare(input) {
        const payload = extractPayload(input);
        if (!payload || payload.length > MAX_PAYLOAD) return null;
        try { return JSON.parse(fromBase64Url(payload)); } catch { return null; }
    }

    // ---------------------------------------------------------------- 匯出／匯入檔案

    function exportFile(state) { return JSON.stringify({ format: FORMAT, exportedAt: new Date().toISOString(), state }, null, 2); }

    /** 解析匯出的 JSON 文字（也接受只含 state 的物件）；失敗回傳 null。 */
    function parseFile(content) {
        try {
            const data = JSON.parse(content);
            if (isObject(data) && data.format === FORMAT && isObject(data.state)) return data.state;
            return isObject(data) && ('selections' in data) ? data : null;
        } catch { return null; }
    }

    return { VERSION, FORMAT, MAX_PAYLOAD, sanitize, encodeShare, decodeShare, extractPayload, exportFile, parseFile, clampWeight };
}));
