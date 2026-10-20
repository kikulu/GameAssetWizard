/**
 * 工作階段：自動儲存、還原、分享連結與匯出／匯入（介面部分）
 * ------------------------------------------------------------
 * 驗證與編碼邏輯在 session.js（純函式）。這裡負責讀寫畫面狀態：
 *  - 每次變更後 500ms 自動儲存到 localStorage（鍵：session-v1）。
 *  - 啟動時優先還原網址中的 #s=…（分享連結），其次是自動儲存的內容。
 *  - 分享：網頁版複製連結；桌面版沒有公開網址，改複製分享代碼（可貼到「貼上分享連結或代碼」）。
 *  - 不包含 API 位址與產圖參數。
 * 依賴 app.js 與 templates.js 的全域函式與狀態。
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'session-v1';
    const SAVE_DELAY = 500;
    const LONG_LINK = 3000;
    const $ = id => document.getElementById(id);

    let restoring = false;
    let autosaveEnabled = false;
    let timer = null;

    function setStatus(message) { const box = $('session-status'); if (box) box.textContent = message; }
    function codeMode() { return Boolean(window.isDesktopApp) || !/^https?:$/.test(location.protocol); }

    function context() {
        const values = id => [...$(id).options].map(option => option.value);
        return {
            prompts: new Set(tagIndex.keys()),
            engines: PromptFormat.ENGINE_IDS,
            sheets: sheetOrder,
            templates: creativeTemplates.map(item => item.id),
            backgrounds: values('dt-bg'),
            qualities: values('dt-quality')
        };
    }

    function capture() {
        const profile = currentProfile();
        const preset = profile ? profile.presets[$('dt-preset').value] : null;
        return {
            version: Session.VERSION,
            platform: currentPlatform,
            dimension: currentDimension,
            engine: currentEngine(),
            background: $('dt-bg').value,
            quality: $('dt-quality').value,
            width: Number($('dt-width').value),
            height: Number($('dt-height').value),
            preset: preset ? preset.id : null,
            template: appliedTemplateId,
            selections: [...activeSelections].map(([prompt, data]) => ({ prompt, weight: data.weight, pinned: Boolean(data.pinned) })),
            random: {
                sheets: [...document.querySelectorAll('input[data-role="random-sheet-cb"]:checked')].map(box => box.value),
                variety: varietyEnabled(),
                locked: [...lockedSheets],
                exclusive: manualExclusiveEnabled()
            }
        };
    }

    /** 把已驗證的狀態套回畫面。順序很重要：範本 → 模式 → 尺寸 → 引擎與規格 → 抽卡設定 → 標籤。 */
    function apply(state) {
        restoring = true;
        try {
            if (state.template && typeof applyCreativeTemplate === 'function') applyCreativeTemplate(state.template);
            else if (!state.template && appliedTemplateId && typeof clearCreativeTemplate === 'function') clearCreativeTemplate();
            setPlatform(state.platform);
            setDimension(state.dimension);

            const profile = currentProfile();
            const index = profile && state.preset ? profile.presets.findIndex(item => item.id === state.preset) : -1;
            if (index >= 0) { $('dt-preset').value = String(index); applyPreset(); }
            if (state.width) $('dt-width').value = state.width;
            if (state.height) $('dt-height').value = state.height;

            $('dt-model').value = state.engine;
            if (state.background) $('dt-bg').value = state.background;
            if (state.quality) $('dt-quality').value = state.quality;

            if (state.random.sheets.length) {
                document.querySelectorAll('input[data-role="random-sheet-cb"]').forEach(box => { box.checked = state.random.sheets.includes(box.value); });
            }
            lockedSheets.clear();
            state.random.locked.forEach(sheetId => lockedSheets.add(sheetId));
            refreshLockUI();
            const variety = $('random-variety');
            variety.checked = state.random.variety;
            try { localStorage.setItem('random-variety', variety.checked ? '1' : '0'); } catch { /* ignore */ }
            $('manual-exclusive').checked = state.random.exclusive;
            try { localStorage.setItem('manual-exclusive', state.random.exclusive ? '1' : '0'); } catch { /* ignore */ }

            activeSelections.clear();
            state.selections.forEach(item => activeSelections.set(item.prompt, { weight: item.weight, pinned: item.pinned }));
            updateUIAndOutput();
        } finally {
            restoring = false;
        }
    }

    function load(raw, source) {
        const result = Session.sanitize(raw, context());
        if (!result) return false;
        if (source === 'restored') apply(result.state);
        else recordedChange({ key: 'history.session' }, () => apply(result.state)); // 匯入／分享連結載入可以復原
        const key = { restored: 'session.restored', shared: 'session.restoredShared', imported: 'session.imported' }[source];
        const parts = [t(key, { count: result.state.selections.length })];
        if (result.skipped) parts.push(t('session.skipped', { count: result.skipped }));
        setStatus(parts.join(' '));
        return true;
    }

    // ---------------------------------------------------------------- 自動儲存

    function save(silent) {
        if (restoring || !autosaveEnabled) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(capture()));
            if (silent !== true) setStatus(t('session.autosaved'));
        } catch { /* 儲存空間不可用時略過 */ }
    }

    window.scheduleSessionSave = function scheduleSessionSave() {
        if (restoring || !autosaveEnabled) return;
        clearTimeout(timer);
        timer = setTimeout(() => save(), SAVE_DELAY);
    };
    window.enableSessionAutosave = function enableSessionAutosave() { autosaveEnabled = true; save(true); };

    /** 啟動時呼叫：回傳 true 表示已還原工作階段。 */
    window.restoreSession = async function restoreSession() {
        if (window.templatesReady) await window.templatesReady; // 範本資料載入後才能還原範本
        const shared = Session.extractPayload(location.hash);
        if (shared) {
            const raw = Session.decodeShare(location.hash);
            history.replaceState(null, '', location.pathname + location.search); // 清掉網址，避免重新整理時覆蓋之後的變更
            if (raw && load(raw, 'shared')) return true;
        }
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && load(JSON.parse(saved), 'restored')) return true;
        } catch { /* 毀損的自動儲存內容直接忽略 */ }
        return false;
    };

    // ---------------------------------------------------------------- 分享、匯出、匯入

    function shareText() {
        const code = Session.encodeShare(capture());
        return codeMode() ? code : `${location.origin}${location.pathname}#s=${code}`;
    }

    async function share() {
        const text = shareText();
        const field = $('session-paste');
        try {
            await navigator.clipboard.writeText(text);
            setStatus(t(codeMode() ? 'session.copiedCode' : 'session.copied'));
        } catch {
            field.value = text; field.select();
            setStatus(t('session.copyFailed'));
        }
        if (text.length > LONG_LINK) setStatus(`${$('session-status').textContent} ${t('session.longLink', { length: text.length })}`);
    }

    function download(filename, content) {
        const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url; link.download = filename;
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function importFile(event) {
        const file = event.target.files[0];
        event.target.value = '';
        if (!file) return;
        try {
            if (file.size > 1024 * 1024) throw new Error(t('session.tooLarge'));
            const raw = Session.parseFile(await file.text());
            if (!raw || !load(raw, 'imported')) throw new Error(t('session.invalid'));
        } catch (error) { setStatus(t('session.importFail', { message: error.message })); }
    }

    function applyPasted() {
        const raw = Session.decodeShare($('session-paste').value);
        if (raw && load(raw, 'imported')) { $('session-paste').value = ''; return; }
        setStatus(t('session.importFail', { message: t('session.invalid') }));
    }

    function reset() {
        if (!confirm(t('session.resetConfirm'))) return;
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        autosaveEnabled = false;
        history.replaceState(null, '', location.pathname + location.search);
        location.reload();
    }

    function refreshLabels() {
        const shareButton = $('session-share');
        if (shareButton) shareButton.textContent = t(codeMode() ? 'session.shareCode' : 'session.share');
    }

    window.addEventListener('DOMContentLoaded', () => {
        if (!$('session-panel')) return;
        $('session-share').addEventListener('click', share);
        $('session-export').addEventListener('click', () => download(`game-asset-session_${new Date().toISOString().slice(0, 10)}.json`, Session.exportFile(capture())));
        $('session-import').addEventListener('click', () => $('session-file').click());
        $('session-file').addEventListener('change', importFile);
        $('session-reset').addEventListener('click', reset);
        $('session-apply').addEventListener('click', applyPasted);
        $('session-paste').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); applyPasted(); } });
        // 隨機抽卡的分類勾選與其他不一定觸發 updateUIAndOutput 的設定，也要觸發儲存
        $('randomOptionsContainer').addEventListener('change', () => scheduleSessionSave());
        $('random-variety').addEventListener('change', () => scheduleSessionSave());
        $('manual-exclusive').addEventListener('change', () => scheduleSessionSave());
    });
    window.addEventListener('localechange', refreshLabels);
})();
