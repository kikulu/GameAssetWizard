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
        randomPickSelected();

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
}

function toggleAllCheckboxes(e) {
    e.preventDefault();
    allCheckedState = !allCheckedState;
    document.querySelectorAll('input[data-role="random-sheet-cb"]').forEach(cb => { cb.checked = allCheckedState; });
}

function forEachSubcategory(sheetId, callback) {
    const sheet = globalMatrix[sheetId];
    if (!sheet) return;
    sheet.categories.forEach(category => category.subcategories.forEach(sub => callback(sub, category)));
}

function randomPickSelected() {
    if (!sheetOrder.length) return;
    const allowedSheets = Array.from(document.querySelectorAll('input[data-role="random-sheet-cb"]:checked')).map(cb => cb.value);
    if (allowedSheets.length === 0) { alert(t('random.needOne')); return; }

    activeSelections.forEach((_, prompt) => {
        if (allowedSheets.includes(tagIndex.get(prompt))) activeSelections.delete(prompt);
    });
    allowedSheets.forEach(sheetId => forEachSubcategory(sheetId, sub => {
        if (sub.tags.length > 0) {
            const prompt = sub.tags[Math.floor(Math.random() * sub.tags.length)];
            activeSelections.set(prompt, { weight: 1.0 });
        }
    }));
    updateUIAndOutput();
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
        header1.append(title1, arrow1);

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
}

function toggleTag(prompt) {
    if (activeSelections.has(prompt)) { activeSelections.delete(prompt); }
    else { activeSelections.set(prompt, { weight: 1.0 }); }
    updateUIAndOutput();
}

function removeTagDirectly(prompt) {
    if (activeSelections.has(prompt)) {
        activeSelections.delete(prompt);
        updateUIAndOutput();
    }
}

function adjustWeight(prompt, delta) {
    if (activeSelections.has(prompt)) {
        let data = activeSelections.get(prompt);
        data.weight = Math.round((data.weight + delta) * 10) / 10;
        if (data.weight <= 0.2) data.weight = 0.2;
        if (data.weight > 2.0) data.weight = 2.0;
        activeSelections.set(prompt, data);
        updateUIAndOutput();
    }
}

function buildBasePrompt() {
    const profile = currentProfile();
    const model = document.getElementById('dt-model').value;
    const bg = document.getElementById('dt-bg').value;
    const quality = document.getElementById('dt-quality').value;
    const styleTags = profile ? profile.styleTags : "game asset";
    return [styleTags, quality, bg, model, templatePrompt].filter(Boolean).join(', ');
}

function selectedListItem(prompt, data) {
    const item = document.createElement('div');
    item.className = 'selected-list-item';

    const info = document.createElement('div');
    const name = document.createElement('b');
    name.textContent = tagLabel(prompt);
    const weight = document.createElement('span');
    weight.style.cssText = 'font-size:11px;color:var(--text-muted)';
    weight.textContent = data.weight !== 1.0 ? ' x' + data.weight : '';
    info.append(name, weight);

    const actions = document.createElement('div');
    actions.className = 'weight-actions';
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
    actions.append(plus, minus, remove);

    item.append(info, actions);
    return item;
}

function updateUIAndOutput() {
    document.querySelectorAll('.interactive-tag').forEach(el => {
        el.classList.remove('selected');
        const badge = el.querySelector('.weight-badge');
        if (badge) { badge.style.display = 'none'; }
    });

    const listContainer = document.getElementById('selectedDisplayList');
    listContainer.innerHTML = '';
    const activeTokens = [];

    if (activeSelections.size === 0) {
        const empty = document.createElement('span');
        empty.style.cssText = 'color:var(--text-muted); font-size: 13px;';
        empty.textContent = t('selected.empty');
        listContainer.appendChild(empty);
    } else {
        activeSelections.forEach((data, prompt) => {
            const formattedToken = (data.weight === 1.0) ? prompt : `(${prompt}:${data.weight})`;
            activeTokens.push(formattedToken);

            const matchedEl = document.getElementById(tagElementId(prompt));
            if (matchedEl) {
                matchedEl.classList.add('selected');
                if (data.weight !== 1.0) {
                    const badge = matchedEl.querySelector('.weight-badge');
                    if (badge) { badge.innerText = `x${data.weight}`; badge.style.display = 'inline-block'; }
                }
            }
            listContainer.appendChild(selectedListItem(prompt, data));
        });
    }

    const basePositive = buildBasePrompt();
    document.getElementById('positivePrompt').value = activeTokens.length > 0
        ? `${basePositive}, ${activeTokens.join(', ')}`
        : basePositive;
    const baseNegative = baseConfig ? baseConfig.baseNegative : '';
    document.getElementById('negativePrompt').value = [baseNegative, templateNegative].filter(Boolean).join(', ');
}

function clearAllSelection() { activeSelections.clear(); updateUIAndOutput(); }

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
    ["dt-model", "dt-bg", "dt-quality"].forEach(id => {
        document.getElementById(id).addEventListener('change', updateUIAndOutput);
    });
});

window.onload = loadConfig;
