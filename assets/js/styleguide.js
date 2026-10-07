/**
 * 風格鎖定（Style Lock）與批次產圖
 * ------------------------------------------------------------
 * 目的：讓一整個系列的素材（角色、道具、圖示…）維持同一種畫風。
 *
 *  1. 風格預設：把「風格前綴提示詞 / 風格反向詞 / 產圖參數 / 種子」存成可重複使用的設定，
 *     可匯出成 JSON 給團隊共用或放進 Git。
 *  2. 風格鎖定：啟用後，每次產圖都會自動加上風格前綴與反向詞，並鎖住 Steps、CFG、Sampler、
 *     Checkpoint、LoRA、種子等欄位，避免不小心改到而讓畫風漂移。
 *  3. 批次產圖：一行一個素材名稱，套用同一組風格依序產圖，並可一次下載與匯出設定紀錄。
 *
 * 依賴 generation.js 提供的 generationSettings(promptOverride) 與 runProvider(settings)。
 */
(function () {
    'use strict';

    const STORE_PROFILES = 'style-profiles';
    const STORE_ACTIVE = 'style-active';
    const STORE_ENABLED = 'style-lock-enabled';
    const MAX_BATCH = 50;

    const PARAM_FIELDS = {
        steps: 'gen-steps', cfg: 'gen-cfg', sampler: 'gen-sampler', scheduler: 'gen-scheduler',
        denoise: 'gen-denoise', clipSkip: 'gen-clip-skip', checkpoint: 'gen-checkpoint',
        vae: 'gen-vae', lora: 'gen-lora', loraWeight: 'gen-lora-weight'
    };
    const NUMERIC_PARAMS = new Set(['steps', 'cfg', 'denoise', 'clipSkip', 'loraWeight']);
    const PARAM_DEFAULTS = {
        steps: 28, cfg: 7, sampler: 'DPM++ 2M Karras', scheduler: 'karras', denoise: 0.7,
        clipSkip: 1, checkpoint: '', vae: '', lora: '', loraWeight: 1
    };

    // ---------------------------------------------------------------- 純函式（可單元測試）

    /** 以逗號切分提示詞，但忽略括號 ( ) [ ] < > 內的逗號。 */
    function splitTokens(text) {
        const tokens = [];
        let depth = 0, current = '';
        for (const ch of String(text || '')) {
            if ('([<'.includes(ch)) depth += 1;
            else if (')]>'.includes(ch)) depth = Math.max(0, depth - 1);
            if (ch === ',' && depth === 0) { tokens.push(current); current = ''; }
            else current += ch;
        }
        tokens.push(current);
        return tokens.map(t => t.trim()).filter(Boolean);
    }

    /** 合併多段提示詞並去除重複項目（不分大小寫），保留先出現者的順序。 */
    function mergeTokens(...texts) {
        const seen = new Set(), out = [];
        for (const token of texts.flatMap(splitTokens)) {
            const key = token.toLowerCase();
            if (!seen.has(key)) { seen.add(key); out.push(token); }
        }
        return out.join(', ');
    }

    function slug(text, fallback = 'item') {
        const s = String(text || '').trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 40);
        return s || fallback;
    }

    function clampText(value, max) { return String(value ?? '').trim().slice(0, max); }

    /** 驗證並正規化外部匯入的風格設定；格式錯誤回傳 null。 */
    function sanitizeProfile(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const name = clampText(raw.name, 60);
        if (!name) return null;
        const src = raw.params && typeof raw.params === 'object' ? raw.params : {};
        const params = {};
        for (const key of Object.keys(PARAM_DEFAULTS)) {
            if (NUMERIC_PARAMS.has(key)) {
                const n = Number(src[key]);
                params[key] = Number.isFinite(n) ? n : PARAM_DEFAULTS[key];
            } else {
                params[key] = src[key] === undefined ? PARAM_DEFAULTS[key] : clampText(src[key], 200);
            }
        }
        const seed = Math.trunc(Number(raw.seed));
        return {
            name,
            stylePrompt: clampText(raw.stylePrompt, 4000),
            styleNegative: clampText(raw.styleNegative, 4000),
            params,
            seedMode: raw.seedMode === 'random' ? 'random' : 'fixed',
            seed: Number.isFinite(seed) && seed >= -1 ? seed : -1
        };
    }

    const api = { splitTokens, mergeTokens, slug, sanitizeProfile };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof document === 'undefined') return;

    // ---------------------------------------------------------------- 狀態與儲存

    const $ = id => document.getElementById(id);
    let lockedParams = null;     // 已擷取的參數快照
    let batchAbort = false;
    let batchResults = [];

    function loadProfiles() {
        try {
            const data = JSON.parse(localStorage.getItem(STORE_PROFILES) || '{}');
            const out = {};
            Object.values(data).forEach(p => { const clean = sanitizeProfile(p); if (clean) out[clean.name] = clean; });
            return out;
        } catch { return {}; }
    }
    function saveProfiles(profiles) {
        try { localStorage.setItem(STORE_PROFILES, JSON.stringify(profiles)); } catch { /* 儲存空間不可用時略過 */ }
    }
    function remember(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } }
    function recall(key) { try { return localStorage.getItem(key); } catch { return null; } }

    function isEnabled() { return $('sl-enabled').checked; }
    function setStatus(message) { $('sl-status').textContent = message; }
    function randomSeed() { return Math.floor(Math.random() * 2147483647); }

    // ---------------------------------------------------------------- 參數欄位讀寫

    function readParams() {
        const params = {};
        for (const [key, id] of Object.entries(PARAM_FIELDS)) {
            const raw = $(id).value.trim();
            if (NUMERIC_PARAMS.has(key)) {
                const n = Number(raw);
                params[key] = Number.isFinite(n) && raw !== '' ? n : PARAM_DEFAULTS[key];
            } else params[key] = raw;
        }
        return params;
    }
    function writeParams(params) {
        for (const [key, id] of Object.entries(PARAM_FIELDS)) $(id).value = params[key] ?? PARAM_DEFAULTS[key];
    }
    function setFieldsDisabled(disabled) {
        [...Object.values(PARAM_FIELDS), 'gen-seed'].forEach(id => { $(id).disabled = disabled; });
    }

    function summaryText(p) {
        if (!p) return '尚未擷取參數。調整好下方產圖參數後，按「擷取目前參數」。';
        const parts = [`Steps ${p.steps}`, `CFG ${p.cfg}`, `${p.sampler}/${p.scheduler}`, `denoise ${p.denoise}`];
        if (p.checkpoint) parts.push(`ckpt ${p.checkpoint}`);
        if (p.lora) parts.push(`LoRA ${p.lora}@${p.loraWeight}`);
        const seedMode = $('sl-seed-mode').value === 'fixed' ? `固定種子 ${$('sl-seed').value}` : '隨機種子';
        return `${parts.join(' · ')} · ${seedMode}`;
    }
    function refreshSummary() {
        $('sl-summary').textContent = summaryText(lockedParams);
        const badge = $('sl-badge');
        badge.textContent = isEnabled() ? `🔒 已鎖定${$('sl-name').value.trim() ? '：' + $('sl-name').value.trim() : ''}` : '🔓 未鎖定';
        badge.classList.toggle('on', isEnabled());
        $('sl-seed').disabled = $('sl-seed-mode').value !== 'fixed';
        $('sl-dice').disabled = $('sl-seed').disabled;
    }

    // ---------------------------------------------------------------- 啟用 / 套用

    function setEnabled(on) {
        if (on) {
            if (!lockedParams) lockedParams = readParams();
            if ($('sl-seed-mode').value === 'fixed' && Number($('sl-seed').value) < 0) $('sl-seed').value = randomSeed();
            writeParams(lockedParams);
            $('gen-seed').value = $('sl-seed-mode').value === 'fixed' ? $('sl-seed').value : -1;
        }
        setFieldsDisabled(on);
        $('sl-capture').disabled = on;
        remember(STORE_ENABLED, on ? '1' : '0');
        refreshSummary();
    }

    /** 由 generation.js 的 generationSettings() 呼叫：啟用時加入風格前綴、反向詞與種子。 */
    function applyStyleLock(settings) {
        if (!isEnabled()) return settings;
        const seedFixed = $('sl-seed-mode').value === 'fixed';
        return Object.assign({}, settings, {
            prompt: mergeTokens($('sl-style-prompt').value, settings.prompt),
            negative: mergeTokens(settings.negative, $('sl-style-negative').value),
            seed: seedFixed ? Math.max(0, Math.trunc(Number($('sl-seed').value)) || 0) : -1
        });
    }
    window.applyStyleLock = applyStyleLock;

    // ---------------------------------------------------------------- 風格預設 CRUD

    function currentProfile() {
        return sanitizeProfile({
            name: $('sl-name').value,
            stylePrompt: $('sl-style-prompt').value,
            styleNegative: $('sl-style-negative').value,
            params: isEnabled() ? lockedParams : (lockedParams = readParams()),
            seedMode: $('sl-seed-mode').value,
            seed: Number($('sl-seed').value)
        });
    }

    function fillEditor(profile) {
        $('sl-name').value = profile.name;
        $('sl-style-prompt').value = profile.stylePrompt;
        $('sl-style-negative').value = profile.styleNegative;
        $('sl-seed-mode').value = profile.seedMode;
        $('sl-seed').value = profile.seed;
        lockedParams = Object.assign({}, profile.params);
        writeParams(lockedParams);
        if (isEnabled()) $('gen-seed').value = profile.seedMode === 'fixed' ? profile.seed : -1;
        refreshSummary();
    }

    function refreshProfileSelect(selected) {
        const select = $('sl-profile'), profiles = loadProfiles();
        select.innerHTML = '';
        const blank = document.createElement('option');
        blank.value = ''; blank.textContent = '— 選擇已儲存的風格 —';
        select.append(blank);
        Object.keys(profiles).sort().forEach(name => {
            const option = document.createElement('option');
            option.value = name; option.textContent = name;
            select.append(option);
        });
        select.value = selected && profiles[selected] ? selected : '';
    }

    function onSelectProfile() {
        const name = $('sl-profile').value;
        const profile = loadProfiles()[name];
        if (!profile) return;
        fillEditor(profile);
        remember(STORE_ACTIVE, name);
        setStatus(`已載入風格「${name}」。`);
    }

    function onSaveProfile() {
        if (isEnabled() && !lockedParams) return;
        if (!$('sl-name').value.trim()) return setStatus('請先輸入風格名稱。');
        if ($('sl-seed-mode').value === 'fixed' && Number($('sl-seed').value) < 0) $('sl-seed').value = randomSeed();
        const profile = currentProfile();
        if (!profile) return setStatus('風格設定無效，請檢查名稱。');
        const profiles = loadProfiles();
        if (profiles[profile.name] && !confirm(`已有名為「${profile.name}」的風格，要覆蓋嗎？`)) return;
        profiles[profile.name] = profile;
        saveProfiles(profiles);
        remember(STORE_ACTIVE, profile.name);
        refreshProfileSelect(profile.name);
        refreshSummary();
        setStatus(`💾 已儲存風格「${profile.name}」。`);
    }

    function onDeleteProfile() {
        const name = $('sl-profile').value;
        if (!name) return setStatus('請先選擇要刪除的風格。');
        if (!confirm(`確定刪除風格「${name}」？`)) return;
        const profiles = loadProfiles();
        delete profiles[name];
        saveProfiles(profiles);
        refreshProfileSelect('');
        setStatus(`🗑️ 已刪除風格「${name}」。`);
    }

    // ---------------------------------------------------------------- 匯出 / 匯入

    function downloadText(filename, text) {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function onExportProfile() {
        if (isEnabled() && !$('sl-name').value.trim()) return setStatus('請先輸入風格名稱。');
        const profile = currentProfile();
        if (!profile) return setStatus('請先輸入風格名稱再匯出。');
        downloadText(`style_${slug(profile.name, 'style')}.json`, JSON.stringify({ format: 'game-asset-style/1', profile }, null, 2));
        setStatus('📤 已匯出風格設定。');
    }

    async function onImportFile(event) {
        const file = event.target.files[0];
        event.target.value = '';
        if (!file) return;
        try {
            if (file.size > 1024 * 1024) throw new Error('檔案過大');
            const data = JSON.parse(await file.text());
            const rawList = data.profile ? [data.profile] : data.profiles ? Object.values(data.profiles) : [data];
            const profiles = loadProfiles();
            let last = null, count = 0;
            for (const raw of rawList) {
                const clean = sanitizeProfile(raw);
                if (!clean) continue;
                if (profiles[clean.name] && !confirm(`已有名為「${clean.name}」的風格，要覆蓋嗎？`)) continue;
                profiles[clean.name] = clean; last = clean; count += 1;
            }
            if (!count) throw new Error('找不到有效的風格設定');
            saveProfiles(profiles);
            refreshProfileSelect(last.name);
            fillEditor(last);
            remember(STORE_ACTIVE, last.name);
            setStatus(`📥 已匯入 ${count} 個風格，並載入「${last.name}」。`);
        } catch (error) {
            setStatus(`❌ 匯入失敗：${error.message}`);
        }
    }

    // ---------------------------------------------------------------- 批次產圖

    function addTile(subject, index, images, error) {
        const tile = document.createElement('div');
        tile.className = 'dt-image-item sl-tile';
        const caption = document.createElement('div');
        caption.className = 'sl-caption';
        caption.textContent = `${index + 1}. ${subject}`;
        if (error) {
            tile.classList.add('failed');
            const msg = document.createElement('div');
            msg.className = 'sl-error';
            msg.textContent = `❌ ${error}`;
            tile.append(caption, msg);
        } else {
            const profileName = slug($('sl-name').value, 'style');
            images.forEach((src, n) => {
                const img = document.createElement('img');
                img.src = src;
                const link = document.createElement('a');
                link.href = src;
                link.className = 'dt-download-link';
                link.dataset.slDownload = '1';
                link.download = `${profileName}_${String(index + 1).padStart(2, '0')}_${slug(subject)}${images.length > 1 ? '_' + (n + 1) : ''}.png`;
                link.textContent = '⬇️ 下載';
                tile.append(img, link);
            });
            tile.prepend(caption);
        }
        $('sl-gallery').append(tile);
    }

    function setBatchBusy(busy) {
        $('sl-run').disabled = busy;
        $('sl-stop').disabled = !busy;
        $('btn-generate-local').disabled = busy;
    }

    async function onRunBatch() {
        const subjects = $('sl-subjects').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, MAX_BATCH);
        if (!subjects.length) return setStatus('請先在清單中輸入至少一個素材（每行一項）。');
        if (!isEnabled()) setStatus('提醒：風格鎖定尚未啟用，批次結果的風格可能不一致。');

        const extra = $('sl-append').checked ? $('positivePrompt').value.trim() : '';
        $('sl-gallery').innerHTML = '';
        batchResults = [];
        batchAbort = false;
        setBatchBusy(true);
        let failures = 0;

        for (let i = 0; i < subjects.length && !batchAbort; i += 1) {
            const subject = subjects[i];
            setStatus(`🎨 產圖中 ${i + 1}/${subjects.length}：${subject}`);
            const settings = generationSettings(extra ? `${subject}, ${extra}` : subject);
            try {
                const images = await runProvider(settings);
                if (!images.length) throw new Error('後端沒有回傳圖片');
                failures = 0;
                addTile(subject, i, images);
                batchResults.push({
                    index: i + 1, subject, prompt: settings.prompt, negative: settings.negative,
                    seed: settings.seed, width: settings.width, height: settings.height,
                    steps: settings.steps, cfg: settings.cfg, sampler: settings.sampler, scheduler: settings.scheduler,
                    checkpoint: settings.checkpoint, images: images.length
                });
            } catch (error) {
                failures += 1;
                addTile(subject, i, [], error.message);
                if (failures >= 3) { setStatus('❌ 連續失敗 3 次，已中止批次。請檢查後端連線。'); break; }
            }
        }

        setBatchBusy(false);
        if (!/連續失敗/.test($('sl-status').textContent)) {
            setStatus(batchAbort ? `⏹ 已停止，完成 ${batchResults.length} 項。` : `✅ 批次完成：成功 ${batchResults.length}/${subjects.length} 項。`);
        }
    }

    async function onDownloadAll() {
        const links = [...$('sl-gallery').querySelectorAll('a[data-sl-download]')];
        if (!links.length) return setStatus('目前沒有可下載的圖片。');
        for (const link of links) {
            link.click();
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        setStatus(`⬇️ 已觸發 ${links.length} 張圖片下載。`);
    }

    function onExportManifest() {
        if (!batchResults.length) return setStatus('尚無批次紀錄可匯出。');
        const profile = currentProfile();
        downloadText(`manifest_${slug($('sl-name').value, 'batch')}_${Date.now()}.json`, JSON.stringify({
            format: 'game-asset-batch/1',
            exportedAt: new Date().toISOString(),
            styleLocked: isEnabled(),
            profile,
            items: batchResults
        }, null, 2));
        setStatus('📄 已匯出批次設定紀錄。');
    }

    // ---------------------------------------------------------------- 介面

    function panelHtml() {
        return `
<summary>🎨 風格鎖定（保持系列素材一致）<span class="sl-badge" id="sl-badge">🔓 未鎖定</span></summary>
<p class="generator-note">先調好下方產圖參數並按「擷取目前參數」，填入風格前綴與種子，再開啟鎖定。之後每次產圖（含批次）都會套用同一組設定。注意：固定種子能穩定構圖與色調，但不同提示詞間仍可能有差異，建議搭配固定的 Checkpoint／LoRA。</p>
<div class="sl-row"><select id="sl-profile"></select><input id="sl-name" type="text" maxlength="60" placeholder="風格名稱（例如：Q版卡牌）"></div>
<div class="dt-btn-row sl-btns">
  <button type="button" class="dt-btn test" id="sl-save">💾 儲存</button>
  <button type="button" class="dt-btn test" id="sl-delete">🗑️ 刪除</button>
  <button type="button" class="dt-btn test" id="sl-export">📤 匯出</button>
  <button type="button" class="dt-btn test" id="sl-import-btn">📥 匯入</button>
  <input type="file" id="sl-import" accept="application/json,.json" hidden>
</div>
<div class="setting-field"><label>風格前綴提示詞（自動加在每次提示詞最前面）</label><textarea id="sl-style-prompt" placeholder="例如：flat vector illustration, thick outline, pastel palette, game asset"></textarea></div>
<div class="setting-field"><label>風格反向詞（自動附加到反向提示詞）</label><textarea id="sl-style-negative" placeholder="例如：photo, realistic, blurry, watermark"></textarea></div>
<div class="advanced-grid">
  <div class="setting-field"><label>種子模式</label><select id="sl-seed-mode"><option value="fixed">固定種子（較一致）</option><option value="random">每張隨機</option></select></div>
  <div class="setting-field"><label>固定種子</label><div class="sl-seed-row"><input id="sl-seed" type="number" value="-1" min="-1"><button type="button" class="dt-btn test" id="sl-dice" title="隨機產生種子">🎲</button></div></div>
</div>
<div class="sl-summary" id="sl-summary"></div>
<div class="dt-btn-row"><button type="button" class="dt-btn test" id="sl-capture">📌 擷取目前參數</button></div>
<label class="sl-toggle"><input type="checkbox" id="sl-enabled"> 啟用風格鎖定（鎖住 Steps／CFG／Sampler／Checkpoint／LoRA／種子欄位）</label>
<hr class="sl-sep">
<div class="setting-field"><label>批次素材清單（每行一項，最多 ${MAX_BATCH} 項）</label><textarea id="sl-subjects" placeholder="knight with sword&#10;healing potion&#10;wooden treasure chest"></textarea></div>
<label class="sl-toggle"><input type="checkbox" id="sl-append"> 同時附加上方已組好的提示詞（如鏡頭、場景標籤）</label>
<div class="dt-btn-row" style="margin-top:8px">
  <button type="button" class="dt-btn generate" id="sl-run">🚀 批次產圖</button>
  <button type="button" class="dt-btn test" id="sl-stop" disabled>⏹ 停止</button>
</div>
<div class="dt-status generator-status" id="sl-status">尚未開始。</div>
<div class="dt-gallery" id="sl-gallery"></div>
<div class="dt-btn-row" style="margin-top:10px">
  <button type="button" class="dt-btn test" id="sl-dl-all">⬇️ 全部下載</button>
  <button type="button" class="dt-btn test" id="sl-manifest">📄 匯出設定紀錄</button>
</div>`;
    }

    function init() {
        const panel = document.querySelector('.dt-panel');
        if (!panel || !$('gen-steps') || typeof generationSettings !== 'function') return;

        const section = document.createElement('details');
        section.className = 'advanced-section style-lock';
        section.id = 'style-lock';
        section.open = true;
        section.innerHTML = panelHtml();
        panel.insertBefore(section, panel.firstChild);

        $('sl-profile').addEventListener('change', onSelectProfile);
        $('sl-save').addEventListener('click', onSaveProfile);
        $('sl-delete').addEventListener('click', onDeleteProfile);
        $('sl-export').addEventListener('click', onExportProfile);
        $('sl-import-btn').addEventListener('click', () => $('sl-import').click());
        $('sl-import').addEventListener('change', onImportFile);
        $('sl-dice').addEventListener('click', () => { $('sl-seed').value = randomSeed(); refreshSummary(); });
        $('sl-seed-mode').addEventListener('change', () => {
            if ($('sl-seed-mode').value === 'fixed' && Number($('sl-seed').value) < 0) $('sl-seed').value = randomSeed();
            if (isEnabled()) $('gen-seed').value = $('sl-seed-mode').value === 'fixed' ? $('sl-seed').value : -1;
            refreshSummary();
        });
        $('sl-seed').addEventListener('input', () => {
            if (isEnabled()) $('gen-seed').value = $('sl-seed').value;
            refreshSummary();
        });
        $('sl-name').addEventListener('input', refreshSummary);
        $('sl-capture').addEventListener('click', () => {
            lockedParams = readParams();
            refreshSummary();
            setStatus('📌 已擷取目前產圖參數。');
        });
        $('sl-enabled').addEventListener('change', event => setEnabled(event.target.checked));
        $('sl-run').addEventListener('click', onRunBatch);
        $('sl-stop').addEventListener('click', () => { batchAbort = true; setStatus('正在停止…（等待目前這張完成）'); });
        $('sl-dl-all').addEventListener('click', onDownloadAll);
        $('sl-manifest').addEventListener('click', onExportManifest);

        const active = recall(STORE_ACTIVE);
        refreshProfileSelect(active);
        const profile = loadProfiles()[active];
        if (profile) fillEditor(profile);
        else refreshSummary();
        if (recall(STORE_ENABLED) === '1' && profile) { $('sl-enabled').checked = true; setEnabled(true); }
    }

    window.addEventListener('DOMContentLoaded', init);
})();
