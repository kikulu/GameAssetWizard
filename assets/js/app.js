// ========================= 全域狀態 =========================
let baseConfig = null;      // base_settings.json
let profilesConfig = null;  // profiles.json（與語言無關）
let sheetOrder = [];        // 詞庫分類 id（config_sheets/index.json）
let globalMatrix = {};      // { sheetId: { id, categories: [...] } }（與語言無關）
const tagIndex = new Map(); // 提示詞 → sheetId
const localeData = {};      // { [locale]: { profiles, tags: { [sheetId]: {...} } } }
const activeSelections = new Map(); // 提示詞 → { weight }
let configReady = false;
// Set by templates.js. Keep the package layer separate so users can still fine-tune tags.
let templatePrompt = '';
let templateNegative = '';

let currentPlatform = "mobile"; // mobile | steam
let currentDimension = "general"; // general | 2d | 3d
let allCheckedState = true;

const lockedSheets = new Set();       // 已鎖定的分類（sheetId）：重抽時保持不變
const selectionHistory = SelectionHistory.create({ limit: 50 }); // 選取歷史（復原／重做），邏輯見 history.js
let historyEnabled = false;           // 初次載入完成後才開始記錄
let historyReplaying = false;         // 復原／重做還原狀態時不重複記錄
const openSheets = new Set();         // 展開中的分類（sheetId）
const collapsedCategories = new Set(); // 收合中的子分類（`${sheetId}/${categoryId}`）

function currentProfileKey() {
    if (currentDimension === "general") return currentPlatform;
    return currentPlatform + currentDimension; // mobile2d / mobile3d / steam2d / steam3d
}

function currentProfile() {
    return profilesConfig ? profilesConfig[currentProfileKey()] : null;
}

// ========================= 語系資料查詢 =========================
function prettifyId(id) {
    return String(id).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function localized() { return localeData[I18N.locale] || {}; }
function sheetLocale(sheetId) { return (localized().tags || {})[sheetId] || {}; }
function sheetName(sheetId) { return sheetLocale(sheetId).name || prettifyId(sheetId); }
function categoryName(sheetId, categoryId) { return (sheetLocale(sheetId).categories || {})[categoryId] || prettifyId(categoryId); }
function subcategoryName(sheetId, categoryId, subId) { return (sheetLocale(sheetId).subcategories || {})[`${categoryId}/${subId}`] || prettifyId(subId); }
function tagLabel(prompt) { return (sheetLocale(tagIndex.get(prompt)).tags || {})[prompt] || prompt; }
function profileText(key) { return ((localized().profiles || {}).profiles || {})[key] || {}; }
function presetText(presetId) { return ((localized().profiles || {}).presets || {})[presetId] || {}; }

async function loadAppLocaleData(code) {
    if (!sheetOrder.length || localeData[code]) return;
    const safe = promise => promise.catch(error => { console.warn('[i18n]', error.message); return {}; });
    const [profiles, ...tags] = await Promise.all([
        safe(I18N.fetchLocaleJson(code, 'profiles.json')),
        ...sheetOrder.map(id => safe(I18N.fetchLocaleJson(code, 'tags', `${id}.json`)))
    ]);
    localeData[code] = { profiles, tags: Object.fromEntries(sheetOrder.map((id, i) => [id, tags[i]])) };
}
I18N.addLoader(loadAppLocaleData);

// ========================= 載入設定 =========================
async function loadConfig() {
    try {
        await I18N.ready;
        document.getElementById('matrixContainer').textContent = t('library.loading');
        I18N.setRich(document.getElementById('profileLabel'), 'profile.loading');
        const [baseRes, profilesRes, indexRes] = await Promise.all([
            fetch('config_sheets/base_settings.json'),
            fetch('config_sheets/profiles.json'),
            fetch('config_sheets/index.json')
        ]);
        if (!baseRes.ok) throw new Error('config_sheets/base_settings.json not found');
        if (!profilesRes.ok) throw new Error('config_sheets/profiles.json not found');
        if (!indexRes.ok) throw new Error('config_sheets/index.json not found');
        baseConfig = await baseRes.json();
        profilesConfig = await profilesRes.json();
        sheetOrder = (await indexRes.json()).sheets;

        const loadedSheets = await Promise.all(sheetOrder.map(sheetId =>
            fetch(`config_sheets/${encodeURIComponent(sheetId)}.json`).then(res => {
                if (!res.ok) throw new Error(`config_sheets/${sheetId}.json not found`);
                return res.json();
            })
        ));
        loadedSheets.forEach(sheet => {
            globalMatrix[sheet.id] = sheet;
            sheet.categories.forEach(category => category.subcategories.forEach(sub => sub.tags.forEach(prompt => tagIndex.set(prompt, sheet.id))));
        });
        if (sheetOrder.length) openSheets.add(sheetOrder[0]);

        await loadAppLocaleData(I18N.locale);
        configReady = true;
        buildMatrixUI();
        buildRandomConfigUI(false);
        buildPresetSelect();
        updateProfileLabel();
        // 優先還原分享連結／自動儲存的工作階段（session-ui.js）；沒有才做第一次隨機抽卡
        const restored = typeof restoreSession === 'function' ? await restoreSession() : false;
        if (!restored) randomPickSelected();
        else updateUIAndOutput();
        if (typeof enableSessionAutosave === 'function') enableSessionAutosave();
        historyEnabled = true;
        refreshHistoryUI();

    } catch (e) {
        const box = document.getElementById('matrixContainer');
        box.textContent = '';
        const span = document.createElement('span');
        span.className = 'load-error';
        span.append(document.createTextNode(t('library.loadError', { message: e.message })), document.createElement('br'), document.createTextNode(t('library.loadErrorHint')));
        box.append(span);
    }
}

// 切換語言：詞庫標籤、分類名稱、模式與尺寸預設都需要重新套用語系
window.addEventListener('localechange', () => {
    if (!configReady) return;
    buildMatrixUI();
    buildRandomConfigUI(true);
    buildPresetSelect({ apply: false });
    updateProfileLabel();
    updateUIAndOutput();
    refreshHistoryUI();
});

// ========================= 平台 / 風格切換 =========================
function setPlatform(p) {
    currentPlatform = p;
    document.getElementById('btn-plat-mobile').classList.toggle('active', p === 'mobile');
    document.getElementById('btn-plat-steam').classList.toggle('active', p === 'steam');
    onProfileChanged();
}

function setDimension(d) {
    currentDimension = d;
    document.getElementById('btn-dim-general').classList.toggle('active', d === 'general');
    document.getElementById('btn-dim-2d').classList.toggle('active', d === '2d');
    document.getElementById('btn-dim-3d').classList.toggle('active', d === '3d');
    onProfileChanged();
}

function onProfileChanged() {
    buildPresetSelect();
    updateProfileLabel();
    const profile = currentProfile();
    if (profile && profile.defaultRandomSheets) {
        document.querySelectorAll('input[data-role="random-sheet-cb"]').forEach(cb => {
            cb.checked = profile.defaultRandomSheets.includes(cb.value);
        });
    }
    updateUIAndOutput();
}

function updateProfileLabel() {
    const profile = currentProfile();
    const label = document.getElementById('profileLabel');
    if (profile) {
        const text = profileText(currentProfileKey());
        I18N.setRich(label, 'profile.current', { label: text.label || currentProfileKey(), dimension: text.dimension || '' });
    }
}

// ========================= 尺寸預設 =========================
function buildPresetSelect({ apply = true } = {}) {
    const profile = currentProfile();
    if (!profile) return;
    const sel = document.getElementById('dt-preset');
    const keep = sel.value;
    sel.innerHTML = '';
    profile.presets.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = presetText(p.id).label || prettifyId(p.id);
        sel.appendChild(opt);
    });
    if (!apply && keep !== '' && sel.querySelector(`option[value="${keep}"]`)) sel.value = keep;
    if (apply) applyPreset();
    else updatePresetNote();
}

function updatePresetNote() {
    const profile = currentProfile();
    if (!profile) return;
    const preset = profile.presets[document.getElementById('dt-preset').value];
    if (preset) document.getElementById('preset-note').textContent = "📌 " + (presetText(preset.id).note || '');
}

function applyPreset() {
    const profile = currentProfile();
    if (!profile) return;
    const preset = profile.presets[document.getElementById('dt-preset').value];
    if (!preset) return;
    document.getElementById('dt-width').value = preset.w;
    document.getElementById('dt-height').value = preset.h;
    updatePresetNote();
    if (configReady) updateUIAndOutput();
}

// ========================= 設定面板收合 =========================
function toggleSettingsPanel() {
    const panel = document.getElementById('settingsPanel');
    const header = document.querySelector('.settings-toggle-header');
    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';
    header.classList.toggle('active', !isVisible);
}

// ========================= 隨機抽卡設定區 =========================
function buildRandomConfigUI(preserve) {
    const container = document.getElementById('randomOptionsContainer');
    const previous = new Map();
    if (preserve) container.querySelectorAll('input').forEach(cb => previous.set(cb.value, cb.checked));
    container.innerHTML = '';
    const profile = currentProfile();
    const defaultSheets = profile ? profile.defaultRandomSheets : [];
    sheetOrder.forEach(sheetId => {
        const label = document.createElement('label');
        label.className = 'random-opt-label';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = sheetId;
        input.dataset.role = 'random-sheet-cb';
        input.checked = preserve && previous.has(sheetId) ? previous.get(sheetId) : defaultSheets.includes(sheetId);
        label.append(input, document.createTextNode(' ' + sheetName(sheetId)));
        container.appendChild(label);
    });
    refreshLockUI();
}

function toggleAllCheckboxes(e) {
    e.preventDefault();
    allCheckedState = !allCheckedState;
    document.querySelectorAll('input[data-role="random-sheet-cb"]').forEach(cb => { cb.checked = allCheckedState; });
}

// 抽卡以「群組」為單位：同組的子分類互為替代，只抽一個（邏輯見 randomizer.js）。
function varietyEnabled() {
    const box = document.getElementById('random-variety');
    return !box || box.checked;
}

function rollSheets(requestedIds) {
    const sheetIds = requestedIds.filter(sheetId => !lockedSheets.has(sheetId)); // 鎖定的分類整個跳過
    if (!sheetIds.length) return;
    const label = sheetIds.length === 1 ? { key: 'history.rerollSheet', sheetId: sheetIds[0] } : { key: 'history.reroll', count: sheetIds.length };
    recordedChange(label, () => rollSheetsCore(sheetIds));
}

function rollSheetsCore(sheetIds) {
    const variety = varietyEnabled();
    const inSheets = [...activeSelections].filter(([prompt]) => sheetIds.includes(tagIndex.get(prompt)));
    // 釘選的標籤保留，且其所在的群組不再另外抽；其餘已選標籤重抽時盡量避開，讓連續抽卡不重複
    const pinned = new Set(inSheets.filter(([, data]) => data.pinned).map(([prompt]) => prompt));
    const avoid = new Set(inSheets.filter(([, data]) => !data.pinned).map(([prompt]) => prompt));
    avoid.forEach(prompt => activeSelections.delete(prompt));
    sheetIds.forEach(sheetId => {
        const sheet = globalMatrix[sheetId];
        if (!sheet) return;
        Randomizer.pickForSheet(sheet, { variety, avoid, pinned }).forEach(prompt => activeSelections.set(prompt, { weight: 1.0, pinned: false }));
    });
    updateUIAndOutput();
}

function randomPickSelected() {
    if (!sheetOrder.length) return;
    const allowedSheets = Array.from(document.querySelectorAll('input[data-role="random-sheet-cb"]:checked')).map(cb => cb.value);
    if (allowedSheets.length === 0) { alert(t('random.needOne')); return; }
    if (allowedSheets.every(sheetId => lockedSheets.has(sheetId))) { alert(t('random.allLocked')); return; }
    rollSheets(allowedSheets);
}

/** 鎖定／解除鎖定分類：鎖定後重抽（全部或單獨 🎲）都不會動它，手動點選仍可修改。 */
function toggleSheetLock(sheetId) {
    if (lockedSheets.has(sheetId)) lockedSheets.delete(sheetId); else lockedSheets.add(sheetId);
    refreshLockUI();
    if (typeof scheduleSessionSave === 'function') scheduleSessionSave();
}

/** 鎖定快捷操作：全部鎖定、全部解除、鎖定目前已選標籤所在的分類。 */
function setLockedSheets(sheetIds) {
    lockedSheets.clear();
    sheetIds.forEach(sheetId => lockedSheets.add(sheetId));
    refreshLockUI();
    if (typeof scheduleSessionSave === 'function') scheduleSessionSave();
}
function lockAllSheets() { setLockedSheets(sheetOrder); }
function unlockAllSheets() { setLockedSheets([]); }
function sheetsWithSelection() { return [...new Set([...activeSelections.keys()].map(prompt => tagIndex.get(prompt)).filter(Boolean))]; }
function lockSelectedSheets() { setLockedSheets([...lockedSheets, ...sheetsWithSelection()]); }

function refreshLockShortcuts() {
    const lockAll = document.getElementById('lock-all');
    if (!lockAll) return;
    lockAll.disabled = sheetOrder.length > 0 && sheetOrder.every(sheetId => lockedSheets.has(sheetId));
    document.getElementById('unlock-all').disabled = lockedSheets.size === 0;
    document.getElementById('lock-selected').disabled = sheetsWithSelection().every(sheetId => lockedSheets.has(sheetId));
}

function refreshLockUI() {
    refreshLockShortcuts();
    document.querySelectorAll('.sheet-lock').forEach(button => {
        const locked = lockedSheets.has(button.dataset.sheet);
        button.textContent = locked ? '🔒' : '🔓';
        button.classList.toggle('active', locked);
        button.setAttribute('aria-pressed', locked ? 'true' : 'false');
        button.title = t(locked ? 'random.unlockSheet' : 'random.lockSheet');
        button.setAttribute('aria-label', button.title);
        button.closest('.layer1-header').classList.toggle('locked', locked);
    });
    document.querySelectorAll('.sheet-roll').forEach(button => {
        const locked = lockedSheets.has(button.dataset.sheet);
        button.disabled = locked;
        button.title = t(locked ? 'random.lockedRoll' : 'random.rollSheet');
        button.setAttribute('aria-label', button.title);
    });
    document.querySelectorAll('input[data-role="random-sheet-cb"]').forEach(box => {
        box.closest('label').classList.toggle('locked', lockedSheets.has(box.value));
    });
}

// ========================= 主要矩陣 UI =========================
function tagElementId(prompt) { return `tag-${btoa(encodeURIComponent(prompt)).replace(/=/g, '')}`; }

function buildMatrixUI() {
    const container = document.getElementById('matrixContainer');
    container.innerHTML = '';

    sheetOrder.forEach(sheetId => {
        const sheet = globalMatrix[sheetId];
        if (!sheet) return;

        const accItem = document.createElement('div');
        accItem.className = 'accordion-item';

        const header1 = document.createElement('div');
        const isOpen = openSheets.has(sheetId);
        header1.className = `layer1-header ${isOpen ? 'active' : ''}`;
        const title1 = document.createElement('span');
        title1.textContent = `📂 ${sheetName(sheetId)}`;
        const arrow1 = document.createElement('span');
        arrow1.className = 'arrow';
        arrow1.textContent = '▶';
        const rollButton = document.createElement('button');
        rollButton.type = 'button';
        rollButton.className = 'sheet-roll';
        rollButton.dataset.sheet = sheetId;
        rollButton.textContent = '🎲';
        rollButton.addEventListener('click', (event) => { event.stopPropagation(); rollSheets([sheetId]); });
        const lockButton = document.createElement('button');
        lockButton.type = 'button';
        lockButton.className = 'sheet-lock';
        lockButton.dataset.sheet = sheetId;
        lockButton.addEventListener('click', (event) => { event.stopPropagation(); toggleSheetLock(sheetId); });
        const controls1 = document.createElement('span');
        controls1.className = 'layer1-controls';
        controls1.append(lockButton, rollButton, arrow1);
        header1.append(title1, controls1);

        const content1 = document.createElement('div');
        content1.className = 'layer1-content';
        if (isOpen) content1.style.display = 'block';

        header1.onclick = () => {
            const isVisible = content1.style.display === 'block';
            content1.style.display = isVisible ? 'none' : 'block';
            header1.classList.toggle('active', !isVisible);
            if (isVisible) openSheets.delete(sheetId); else openSheets.add(sheetId);
        };

        sheet.categories.forEach(category => {
            const categoryKey = `${sheetId}/${category.id}`;
            const collapsed = collapsedCategories.has(categoryKey);
            const l2Box = document.createElement('div');
            l2Box.className = 'layer2-box';

            const header2 = document.createElement('div');
            header2.className = `layer2-header ${collapsed ? '' : 'active'}`;
            const title2 = document.createElement('span');
            title2.textContent = `🔹 ${categoryName(sheetId, category.id)}`;
            const arrow2 = document.createElement('span');
            arrow2.className = 'arrow';
            arrow2.textContent = '▶';
            header2.append(title2, arrow2);

            const content2 = document.createElement('div');
            content2.className = 'layer2-content';
            content2.style.display = collapsed ? 'none' : 'block';

            header2.onclick = (e) => {
                e.stopPropagation();
                const isVisible = content2.style.display === 'block';
                content2.style.display = isVisible ? 'none' : 'block';
                header2.classList.toggle('active', !isVisible);
                if (isVisible) collapsedCategories.add(categoryKey); else collapsedCategories.delete(categoryKey);
            };

            category.subcategories.forEach(sub => {
                if (!sub.tags || sub.tags.length === 0) return;
                const l3Div = document.createElement('div');
                const title3 = document.createElement('div');
                title3.className = 'layer3-title';
                title3.textContent = `▫️ ${subcategoryName(sheetId, category.id, sub.id)}`;
                l3Div.appendChild(title3);
                const tagPool = document.createElement('div');
                tagPool.className = 'tag-pool';

                sub.tags.forEach(prompt => {
                    const tagEl = document.createElement('div');
                    tagEl.className = 'interactive-tag';
                    tagEl.id = tagElementId(prompt);
                    const label = tagLabel(prompt);
                    tagEl.append(document.createTextNode(label));
                    if (label.trim().toLowerCase() !== prompt.toLowerCase()) {
                        const promptSpan = document.createElement('span');
                        promptSpan.textContent = prompt;
                        tagEl.append(document.createTextNode(' '), promptSpan);
                    }
                    const badge = document.createElement('b');
                    badge.className = 'weight-badge';
                    badge.style.display = 'none';
                    tagEl.append(document.createTextNode(' '), badge);
                    tagEl.onclick = (e) => { e.stopPropagation(); toggleTag(prompt); };
                    tagPool.appendChild(tagEl);
                });
                l3Div.appendChild(tagPool);
                content2.appendChild(l3Div);
            });
            l2Box.appendChild(header2);
            l2Box.appendChild(content2);
            content1.appendChild(l2Box);
        });
        accItem.appendChild(header1);
        accItem.appendChild(content1);
        container.appendChild(accItem);
    });
    refreshLockUI();
}

function manualExclusiveEnabled() {
    const box = document.getElementById('manual-exclusive');
    return Boolean(box && box.checked);
}

let exclusiveNoticeTimer = null;
function showExclusiveNotice(message) {
    const box = document.getElementById('exclusive-notice');
    if (!box) return;
    box.textContent = message;
    clearTimeout(exclusiveNoticeTimer);
    exclusiveNoticeTimer = setTimeout(() => { box.textContent = ''; }, 4000);
}

function toggleTag(prompt) {
    recordedChange({ key: activeSelections.has(prompt) ? 'history.remove' : 'history.add', prompt }, () => toggleTagCore(prompt));
}

function toggleTagCore(prompt) {
    if (activeSelections.has(prompt)) { activeSelections.delete(prompt); updateUIAndOutput(); return; }
    if (manualExclusiveEnabled()) {
        // 同群組（或單選子分類）只留一個：取代已選的對手；對手已釘選時釘選優先，新標籤不加入
        const sheet = globalMatrix[tagIndex.get(prompt)];
        const rivals = sheet ? Randomizer.exclusiveSiblings(sheet, prompt).filter(tag => activeSelections.has(tag)) : [];
        const pinnedRival = rivals.find(tag => activeSelections.get(tag).pinned);
        if (pinnedRival) { showExclusiveNotice(t('library.exclusiveBlocked', { label: tagLabel(pinnedRival) })); return; }
        rivals.forEach(tag => activeSelections.delete(tag));
    }
    activeSelections.set(prompt, { weight: 1.0, pinned: false });
    updateUIAndOutput();
}

function togglePin(prompt) {
    const data = activeSelections.get(prompt);
    if (!data) return;
    recordedChange({ key: data.pinned ? 'history.unpin' : 'history.pin', prompt }, () => {
        data.pinned = !data.pinned;
        updateUIAndOutput();
    });
}

function removeTagDirectly(prompt) {
    if (!activeSelections.has(prompt)) return;
    recordedChange({ key: 'history.remove', prompt }, () => {
        activeSelections.delete(prompt);
        updateUIAndOutput();
    });
}

function adjustWeight(prompt, delta) {
    if (!activeSelections.has(prompt)) return;
    // 連按 ➕／➖ 會合併成一步，復原一次就回到調整之前
    recordedChange({ key: 'history.weight', prompt }, () => {
        let data = activeSelections.get(prompt);
        data.weight = Math.round((data.weight + delta) * 10) / 10;
        if (data.weight <= 0.2) data.weight = 0.2;
        if (data.weight > 2.0) data.weight = 2.0;
        activeSelections.set(prompt, data);
        updateUIAndOutput();
    }, { key: `weight:${prompt}` });
}

function currentEngine() { return document.getElementById('dt-model').value; }

/** 目前畫面上的設定整理成格式化器的輸入（與引擎無關）。 */
function promptInput() {
    const profile = currentProfile();
    return {
        base: {
            style: profile ? profile.styleTags : 'game asset',
            quality: document.getElementById('dt-quality').value,
            background: document.getElementById('dt-bg').value,
            template: templatePrompt
        },
        tags: [...activeSelections].map(([prompt, data]) => ({ prompt, weight: data.weight })),
        negative: [baseConfig ? baseConfig.baseNegative : '', templateNegative].filter(Boolean).join(', '),
        width: Number(document.getElementById('dt-width').value),
        height: Number(document.getElementById('dt-height').value)
    };
}

/**
 * 本機產圖一律使用 Stable Diffusion 格式，不受「繪圖引擎」影響：
 * 引擎本身就是 SD 格式時沿用文字框內容（保留使用者手動編輯），否則重新以 SD 格式組合。
 */
function getGenerationPrompts() {
    if (PromptFormat.family(currentEngine()) === 'sd') {
        return { positive: document.getElementById('positivePrompt').value, negative: document.getElementById('negativePrompt').value };
    }
    const sd = PromptFormat.format('sdxl', promptInput());
    return { positive: sd.positive, negative: sd.negative };
}

function selectedListItem(prompt, data) {
    const item = document.createElement('div');
    item.className = 'selected-list-item';

    const info = document.createElement('div');
    const name = document.createElement('b');
    name.textContent = (data.pinned ? '📌 ' : '') + tagLabel(prompt);
    const weight = document.createElement('span');
    weight.style.cssText = 'font-size:11px;color:var(--text-muted)';
    weight.textContent = data.weight !== 1.0 ? ' x' + data.weight : '';
    info.append(name, weight);

    const actions = document.createElement('div');
    actions.className = 'weight-actions';
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'btn-pin' + (data.pinned ? ' active' : '');
    pin.textContent = '📌';
    pin.title = data.pinned ? t('selected.unpin') : t('selected.pin');
    pin.setAttribute('aria-label', pin.title);
    pin.setAttribute('aria-pressed', data.pinned ? 'true' : 'false');
    pin.addEventListener('click', () => togglePin(prompt));
    const plus = document.createElement('button');
    plus.textContent = '➕';
    plus.addEventListener('click', () => adjustWeight(prompt, 0.1));
    const minus = document.createElement('button');
    minus.textContent = '➖';
    minus.addEventListener('click', () => adjustWeight(prompt, -0.1));
    const remove = document.createElement('button');
    remove.className = 'btn-remove';
    remove.textContent = t('selected.remove');
    remove.title = t('selected.removeTitle');
    remove.addEventListener('click', () => removeTagDirectly(prompt));
    actions.append(pin, plus, minus, remove);

    item.append(info, actions);
    return item;
}

function updateUIAndOutput() {
    document.querySelectorAll('.interactive-tag').forEach(el => {
        el.classList.remove('selected', 'pinned');
        const badge = el.querySelector('.weight-badge');
        if (badge) { badge.style.display = 'none'; }
    });

    const listContainer = document.getElementById('selectedDisplayList');
    listContainer.innerHTML = '';

    if (activeSelections.size === 0) {
        const empty = document.createElement('span');
        empty.style.cssText = 'color:var(--text-muted); font-size: 13px;';
        empty.textContent = t('selected.empty');
        listContainer.appendChild(empty);
    } else {
        activeSelections.forEach((data, prompt) => {
            const matchedEl = document.getElementById(tagElementId(prompt));
            if (matchedEl) {
                matchedEl.classList.add('selected');
                if (data.pinned) matchedEl.classList.add('pinned');
                if (data.weight !== 1.0) {
                    const badge = matchedEl.querySelector('.weight-badge');
                    if (badge) { badge.innerText = `x${data.weight}`; badge.style.display = 'inline-block'; }
                }
            }
            listContainer.appendChild(selectedListItem(prompt, data));
        });
    }

    // 依選擇的繪圖引擎輸出提示詞格式（說明見 promptformat.js）
    const output = PromptFormat.format(currentEngine(), promptInput());
    document.getElementById('positivePrompt').value = output.positive;
    document.getElementById('negativePrompt').value = output.negative;
    document.getElementById('engine-note').textContent = t(output.noteKey);
    refreshLockShortcuts();
    refreshExclusiveHints();
    if (typeof scheduleSessionSave === 'function') scheduleSessionSave();
}

function clearAllSelection() {
    recordedChange({ key: 'history.clear' }, () => {
        // 已鎖定分類裡的標籤保留，只清除其他
        [...activeSelections.keys()].forEach(prompt => { if (!lockedSheets.has(tagIndex.get(prompt))) activeSelections.delete(prompt); });
        updateUIAndOutput();
    });
}

// ========================= 選取歷史（復原／重做） =========================
function snapshotSelections() {
    return [...activeSelections].map(([prompt, data]) => ({ prompt, weight: data.weight, pinned: Boolean(data.pinned) }));
}

function restoreSelections(state) {
    historyReplaying = true;
    try {
        activeSelections.clear();
        state.forEach(item => activeSelections.set(item.prompt, { weight: item.weight, pinned: item.pinned }));
        updateUIAndOutput();
    } finally { historyReplaying = false; }
}

/** 執行會改變已選標籤的動作並記錄到歷史；前後沒有差異就不記錄。 */
function recordedChange(label, change, options) {
    if (!historyEnabled || historyReplaying) { change(); return; }
    const before = snapshotSelections();
    change();
    if (selectionHistory.commit(label, before, snapshotSelections(), options)) refreshHistoryUI();
}

function historyLabelText(label) {
    if (!label) return '';
    const params = {};
    if (label.prompt) params.label = tagLabel(label.prompt);
    if (label.sheetId) params.label = sheetName(label.sheetId);
    if (label.count !== undefined) params.count = label.count;
    return t(label.key, params);
}

function announceHistory(message) {
    const box = document.getElementById('history-status');
    if (box) box.textContent = message;
}

function undoSelection() {
    const label = selectionHistory.undoLabel;
    const state = selectionHistory.undo();
    if (!state) return;
    restoreSelections(state);
    refreshHistoryUI();
    announceHistory(t('history.undone', { action: historyLabelText(label) }));
}

function redoSelection() {
    const label = selectionHistory.redoLabel;
    const state = selectionHistory.redo();
    if (!state) return;
    restoreSelections(state);
    refreshHistoryUI();
    announceHistory(t('history.redone', { action: historyLabelText(label) }));
}

function jumpHistory(position) {
    const state = selectionHistory.jumpTo(position);
    if (!state) return;
    restoreSelections(state);
    refreshHistoryUI();
}

function historyItemButton(text, current, undone, position) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-item' + (current ? ' current' : '') + (undone ? ' undone' : '');
    if (current) button.setAttribute('aria-current', 'true');
    button.textContent = text;
    button.addEventListener('click', () => jumpHistory(position));
    return button;
}

function refreshHistoryUI() {
    const undoButton = document.getElementById('history-undo'), redoButton = document.getElementById('history-redo');
    if (!undoButton) return;
    undoButton.disabled = !selectionHistory.canUndo();
    redoButton.disabled = !selectionHistory.canRedo();
    undoButton.title = selectionHistory.canUndo() ? t('history.undoTitle', { action: historyLabelText(selectionHistory.undoLabel) }) : t('history.undo');
    redoButton.title = selectionHistory.canRedo() ? t('history.redoTitle', { action: historyLabelText(selectionHistory.redoLabel) }) : t('history.redo');
    undoButton.setAttribute('aria-label', undoButton.title);
    redoButton.setAttribute('aria-label', redoButton.title);

    const entries = selectionHistory.list();
    document.getElementById('history-count').textContent = entries.length ? `(${entries.length})` : '';
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'history-empty';
        empty.textContent = t('history.empty');
        list.append(empty);
        return;
    }
    for (let i = entries.length - 1; i >= 0; i -= 1) {
        const text = (selectionHistory.cursor === i + 1 ? `${t('history.current')} · ` : '') + historyLabelText(entries[i].label);
        list.append(historyItemButton(text, selectionHistory.cursor === i + 1, !entries[i].applied, i + 1));
    }
    list.append(historyItemButton((selectionHistory.cursor === 0 ? `${t('history.current')} · ` : '') + t('history.initial'), selectionHistory.cursor === 0, false, 0));
}

// ========================= 互斥衝突提示 =========================
/** 互斥模式開啟時，標示「點選會取代誰」的標籤；已被釘選擋住的標籤另外標示。 */
function refreshExclusiveHints() {
    document.querySelectorAll('.interactive-tag.rival, .interactive-tag.rival-blocked').forEach(el => {
        el.classList.remove('rival', 'rival-blocked');
        delete el.dataset.hint;
        el.removeAttribute('title');
    });
    if (!manualExclusiveEnabled()) return;
    const bySheet = new Map();
    activeSelections.forEach((data, prompt) => {
        const sheetId = tagIndex.get(prompt);
        if (!sheetId) return;
        if (!bySheet.has(sheetId)) bySheet.set(sheetId, new Map());
        bySheet.get(sheetId).set(prompt, data);
    });
    bySheet.forEach((selection, sheetId) => {
        Randomizer.exclusiveHints(globalMatrix[sheetId], selection).forEach((hint, prompt) => {
            const el = document.getElementById(tagElementId(prompt));
            if (!el) return;
            const blocked = hint.pinnedBy.length > 0;
            el.classList.add(blocked ? 'rival-blocked' : 'rival');
            el.dataset.hint = blocked
                ? t('library.exclusiveBlocked', { label: hint.pinnedBy.map(tagLabel).join(' / ') })
                : t('library.exclusivePreview', { label: hint.replaces.map(tagLabel).join(' / ') });
            el.title = el.dataset.hint;
        });
    });
}

function showExclusivePreview(text) {
    const box = document.getElementById('exclusive-preview');
    if (box) box.textContent = text || '';
}

/** 可輸入文字的欄位才保留瀏覽器原生的 Ctrl+Z；勾選框、按鈕、下拉選單等不攔截。 */
function isEditableTarget(target) {
    if (!(target instanceof Element)) return false;
    if (target.isContentEditable || target.closest('textarea')) return true;
    const input = target.closest('input');
    return Boolean(input) && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image'].includes(input.type);
}

function copyText(textareaId, btnId) {
    const textarea = document.getElementById(textareaId);
    const btn = document.getElementById(btnId);
    if (!textarea || !textarea.value) return;
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(() => {
        btn.textContent = t('prompt.copied'); btn.style.background = "var(--accent)";
        setTimeout(() => { btn.textContent = t('prompt.copy'); btn.style.background = "var(--primary)"; }, 2000);
    });
}

const backToTopBtn = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) { backToTopBtn.classList.add('show'); } else { backToTopBtn.classList.remove('show'); }
});
backToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });

window.addEventListener('DOMContentLoaded', () => {
    ["dt-model", "dt-bg", "dt-quality", "dt-width", "dt-height"].forEach(id => {
        document.getElementById(id).addEventListener('change', updateUIAndOutput);
    });
    const variety = document.getElementById('random-variety');
    try { if (localStorage.getItem('random-variety') === '0') variety.checked = false; } catch { /* ignore */ }
    variety.addEventListener('change', () => { try { localStorage.setItem('random-variety', variety.checked ? '1' : '0'); } catch { /* ignore */ } });
    document.getElementById('lock-all').addEventListener('click', lockAllSheets);
    document.getElementById('unlock-all').addEventListener('click', unlockAllSheets);
    document.getElementById('lock-selected').addEventListener('click', lockSelectedSheets);
    document.getElementById('history-undo').addEventListener('click', undoSelection);
    document.getElementById('history-redo').addEventListener('click', redoSelection);
    document.addEventListener('keydown', event => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey || isEditableTarget(event.target)) return; // 文字框內維持原生復原
        const key = event.key.toLowerCase();
        if (key === 'z' && !event.shiftKey && selectionHistory.canUndo()) { event.preventDefault(); undoSelection(); }
        else if (((key === 'z' && event.shiftKey) || key === 'y') && selectionHistory.canRedo()) { event.preventDefault(); redoSelection(); }
    });
    const exclusive = document.getElementById('manual-exclusive');
    try { if (localStorage.getItem('manual-exclusive') === '1') exclusive.checked = true; } catch { /* ignore */ }
    exclusive.addEventListener('change', () => {
        try { localStorage.setItem('manual-exclusive', exclusive.checked ? '1' : '0'); } catch { /* ignore */ }
        refreshExclusiveHints();
        showExclusivePreview('');
    });
    // 滑過互斥標籤時，在選項下方直接顯示「點選將取代 X」
    const matrix = document.getElementById('matrixContainer');
    matrix.addEventListener('mouseover', event => {
        const tag = event.target instanceof Element ? event.target.closest('.interactive-tag[data-hint]') : null;
        showExclusivePreview(tag ? tag.dataset.hint : '');
    });
    matrix.addEventListener('mouseleave', () => showExclusivePreview(''));
});

window.onload = loadConfig;
