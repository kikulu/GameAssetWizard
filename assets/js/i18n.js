/**
 * 介面多語系（i18n）執行層
 * ------------------------------------------------------------
 * 語系檔位於 locales/<code>/：ui.json、profiles.json、templates.json、tags/<sheetId>.json。
 * 支援的語言登錄在 locales/locales.json；新增語言只需新增資料夾並登錄（見 docs/I18N.md）。
 *
 *  - HTML：data-i18n / data-i18n-html / data-i18n-title / data-i18n-placeholder / data-i18n-aria-label
 *  - JS：I18N.t(<鍵>, { 參數: 值 })（全域捷徑 t）
 *  - 切換語言後會觸發 window 的 "localechange" 事件，各模組自行重繪動態內容。
 *  - 其他模組可用 I18N.addLoader(fn) 註冊「切換前要先載入的語系資料」。
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'language';
    const LOCALE_ROOT = 'locales';
    const RICH_TOKEN = /(<\/?(?:b|code)>|<br\s*\/?>)/;

    const state = { registry: null, locale: 'zh-TW', ui: {}, loaders: [], warned: new Set() };

    function fetchJson(path) {
        return fetch(path).then(res => {
            if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
            return res.json();
        });
    }

    function fetchLocaleJson(code, ...parts) {
        return fetchJson([LOCALE_ROOT, code, ...parts.map(encodeURIComponent)].join('/'));
    }

    function supportedCodes() { return state.registry.locales.map(item => item.code); }

    /** 將瀏覽器語言對應到支援的語系；未知語言使用 fallbackLocale（英文）。 */
    function normalize(code) {
        if (!code) return null;
        const supported = supportedCodes();
        if (supported.includes(code)) return code;
        const lower = String(code).toLowerCase();
        const exact = supported.find(item => item.toLowerCase() === lower);
        if (exact) return exact;
        const base = lower.split('-')[0];
        if (base === 'zh') return supported.includes('zh-TW') ? 'zh-TW' : null;
        return supported.find(item => item.toLowerCase().split('-')[0] === base) || null;
    }

    function detect() {
        let saved = null;
        try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
        return normalize(saved) || normalize(navigator.language) || state.registry.fallbackLocale;
    }

    function fallbackChain() {
        return state.registry ? [state.locale, state.registry.fallbackLocale, state.registry.defaultLocale] : [state.locale];
    }

    function format(template, params) {
        if (!params) return template;
        return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
    }

    function lookup(key) {
        if (!state.registry) return null; // 語系尚未載入：由 ready 之後的 apply／localechange 補上文字
        for (const code of fallbackChain()) {
            const value = state.ui[code] && state.ui[code][key];
            if (typeof value === 'string') return value;
        }
        if (!state.warned.has(key)) { state.warned.add(key); console.warn(`[i18n] missing key: ${key}`); }
        return null;
    }

    function t(key, params) {
        const template = lookup(key);
        if (template !== null) return format(template, params);
        return state.registry ? key : '';
    }

    /** 只允許 <b>、<code>、<br> 的安全標記；其餘一律視為純文字。 */
    function setRich(node, key, params) {
        const template = lookup(key);
        node.textContent = '';
        if (template === null) { node.textContent = key; return; }
        let current = node;
        template.split(RICH_TOKEN).forEach(token => {
            if (!token) return;
            const tag = token.toLowerCase().replace(/\s|\//g, '');
            if (tag === '<br>') { current.append(document.createElement('br')); }
            else if (tag === '<b>' || tag === '<code>') {
                const el = document.createElement(tag.slice(1, -1));
                current.append(el);
                current = el;
            } else if (tag === '</b>' || tag === '</code>') { current = current.parentNode === node || current === node ? node : current.parentNode; }
            else { current.append(document.createTextNode(format(token, params))); }
        });
    }

    function apply(root = document) {
        root.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
        root.querySelectorAll('[data-i18n-html]').forEach(node => { setRich(node, node.dataset.i18nHtml); });
        root.querySelectorAll('[data-i18n-title]').forEach(node => { node.title = t(node.dataset.i18nTitle); });
        root.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
        root.querySelectorAll('[data-i18n-aria-label]').forEach(node => { node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel)); });
    }

    async function loadUi(code) {
        if (state.ui[code]) return;
        try { state.ui[code] = await fetchLocaleJson(code, 'ui.json'); }
        catch (error) { console.warn(`[i18n] cannot load UI strings for ${code}`, error); state.ui[code] = {}; }
    }

    async function activate(code, { initial = false } = {}) {
        await Promise.all([...new Set([code, state.registry.fallbackLocale, state.registry.defaultLocale])].map(loadUi));
        await Promise.all(state.loaders.map(loader => loader(code)));
        state.locale = code;
        document.documentElement.lang = code;
        document.title = t('app.pageTitle');
        try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
        const select = document.getElementById('language-select');
        if (select) select.value = code;
        apply(document);
        window.dispatchEvent(new CustomEvent('localechange', { detail: { locale: code, initial } }));
    }

    async function setLocale(code) {
        const target = normalize(code);
        if (!target || target === state.locale) return;
        await activate(target);
    }

    function buildLanguageSelect() {
        const select = document.getElementById('language-select');
        if (!select) return;
        select.innerHTML = '';
        state.registry.locales.forEach(item => {
            const option = document.createElement('option');
            option.value = item.code;
            option.textContent = item.label;
            select.append(option);
        });
        select.addEventListener('change', () => setLocale(select.value));
    }

    const domReady = new Promise(resolve => {
        if (document.readyState !== 'loading') resolve();
        else document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });

    const ready = (async () => {
        await domReady;
        state.registry = await fetchJson(`${LOCALE_ROOT}/locales.json`);
        buildLanguageSelect();
        await activate(detect(), { initial: true });
    })();
    ready.catch(error => console.error('[i18n] initialization failed', error));

    window.I18N = {
        t, apply, setRich, setLocale, fetchLocaleJson, normalize,
        ready,
        addLoader(loader) { state.loaders.push(loader); },
        get locale() { return state.locale; },
        get locales() { return state.registry ? state.registry.locales : []; }
    };
})();

// 全域捷徑：t(<鍵>, { 參數 }) —— 其他腳本直接使用
const t = (key, params) => window.I18N.t(key, params);
