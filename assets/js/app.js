// ========================= 全域狀態 =========================
let baseConfig = null;      // base_settings.json
let profilesConfig = null;  // profiles.json
let globalMatrix = {};      // 各分類詞庫 { sheetName: {...} }
let activeSelections = new Map();

let currentPlatform = "mobile"; // mobile | steam
let currentDimension = "general"; // general | 2d | 3d
let allCheckedState = true;

const SHEET_FILES = [
    "鏡頭構圖", "動作姿勢", "服裝造型", "表情情緒", "身份種族", "髮型髮色",
    "道具裝備", "場景環境", "特效", "UI元素", "圖示徽章", "商店行銷"
];

function currentProfileKey() {
    if (currentDimension === "general") return currentPlatform;
    return currentPlatform + currentDimension; // mobile2d / mobile3d / steam2d / steam3d
}

function currentProfile() {
    return profilesConfig ? profilesConfig[currentProfileKey()] : null;
}

// ========================= 載入設定 =========================
async function loadConfig() {
    try {
        const [baseRes, profilesRes] = await Promise.all([
            fetch('config_sheets/base_settings.json'),
            fetch('config_sheets/profiles.json')
        ]);
        if (!baseRes.ok) throw new Error('找不到 config_sheets/base_settings.json');
        if (!profilesRes.ok) throw new Error('找不到 config_sheets/profiles.json');
        baseConfig = await baseRes.json();
        profilesConfig = await profilesRes.json();

        const fetchPromises = SHEET_FILES.map(sheetName =>
            fetch(`config_sheets/${encodeURIComponent(sheetName)}.json`).then(res => {
                if (!res.ok) throw new Error(`找不到檔案: config_sheets/${sheetName}.json`);
                return res.json();
            })
        );
        const loadedSheets = await Promise.all(fetchPromises);
        loadedSheets.forEach(sheet => { globalMatrix[sheet.sheetName] = sheet.data; });

        buildMatrixUI(globalMatrix);
        buildRandomConfigUI();
        buildPresetSelect();
        updateProfileLabel();
        randomPickSelected();

    } catch (e) {
        document.getElementById('matrixContainer').innerHTML = `<span class="load-error">❌ 載入失敗: ${e.message}<br>提示：此頁面需透過本機伺服器開啟（例如 python3 -m http.server），直接用瀏覽器開啟 file:// 可能會被瀏覽器阻擋讀取 JSON。</span>`;
    }
}

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
        label.innerHTML = `目前模式：<b>${profile.label}</b> — ${profile.dimensionLabel}`;
    }
}

// ========================= 尺寸預設 =========================
function buildPresetSelect() {
    const profile = currentProfile();
    if (!profile) return;
    const sel = document.getElementById('dt-preset');
    sel.innerHTML = '';
    profile.presets.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = p.label;
        sel.appendChild(opt);
    });
    applyPreset();
}

function applyPreset() {
    const profile = currentProfile();
    if (!profile) return;
    const idx = document.getElementById('dt-preset').value;
    const preset = profile.presets[idx];
    if (!preset) return;
    document.getElementById('dt-width').value = preset.w;
    document.getElementById('dt-height').value = preset.h;
    document.getElementById('preset-note').textContent = "📌 " + preset.note;
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
function buildRandomConfigUI() {
    const container = document.getElementById('randomOptionsContainer');
    container.innerHTML = '';
    const profile = currentProfile();
    const defaultSheets = profile ? profile.defaultRandomSheets : [];
    SHEET_FILES.forEach(sheetName => {
        const label = document.createElement('label');
        label.className = 'random-opt-label';
        const isChecked = defaultSheets.includes(sheetName) ? 'checked' : '';
        label.innerHTML = `<input type="checkbox" value="${sheetName}" data-role="random-sheet-cb" ${isChecked}> ${sheetName}`;
        container.appendChild(label);
    });
}

function toggleAllCheckboxes(e) {
    e.preventDefault();
    allCheckedState = !allCheckedState;
    document.querySelectorAll('input[data-role="random-sheet-cb"]').forEach(cb => { cb.checked = allCheckedState; });
}

function randomPickSelected() {
    if (!globalMatrix || Object.keys(globalMatrix).length === 0) return;
    const checkedBoxes = document.querySelectorAll('input[data-role="random-sheet-cb"]:checked');
    const allowedSheets = Array.from(checkedBoxes).map(cb => cb.value);
    if (allowedSheets.length === 0) { alert("請至少勾選一個分類進行隨機抽卡！"); return; }

    activeSelections.forEach((val, enKey) => {
        allowedSheets.forEach(sheetName => {
            const l2Obj = globalMatrix[sheetName];
            if (!l2Obj) return;
            for (const l3Obj of Object.values(l2Obj)) {
                for (const items of Object.values(l3Obj)) {
                    if (items.some(i => i.en === enKey)) activeSelections.delete(enKey);
                }
            }
        });
    });

    allowedSheets.forEach(sheetName => {
        const l2Obj = globalMatrix[sheetName];
        if (!l2Obj) return;
        for (const l3Obj of Object.values(l2Obj)) {
            for (const items of Object.values(l3Obj)) {
                if (items && items.length > 0) {
                    const randomItem = items[Math.floor(Math.random() * items.length)];
                    activeSelections.set(randomItem.en, { cn: randomItem.cn, weight: 1.0 });
                }
            }
        }
    });
    updateUIAndOutput();
}

// ========================= 主要矩陣 UI =========================
function buildMatrixUI(matrix) {
    const container = document.getElementById('matrixContainer');
    container.innerHTML = '';
    let isFirstL1 = true;

    SHEET_FILES.forEach(l1Name => {
        const l2Obj = matrix[l1Name];
        if (!l2Obj) return;

        const accItem = document.createElement('div');
        accItem.className = 'accordion-item';

        const header1 = document.createElement('div');
        header1.className = `layer1-header ${isFirstL1 ? 'active' : ''}`;
        header1.innerHTML = `<span>📂 ${l1Name}</span><span class="arrow">▶</span>`;

        const content1 = document.createElement('div');
        content1.className = 'layer1-content';
        if (isFirstL1) { content1.style.display = 'block'; isFirstL1 = false; }

        header1.onclick = () => {
            const isVisible = content1.style.display === 'block';
            content1.style.display = isVisible ? 'none' : 'block';
            header1.classList.toggle('active', !isVisible);
        };

        for (const [l2Name, l3Obj] of Object.entries(l2Obj)) {
            const l2Box = document.createElement('div');
            l2Box.className = 'layer2-box';

            const header2 = document.createElement('div');
            header2.className = 'layer2-header active';
            header2.innerHTML = `<span>🔹 ${l2Name}</span><span class="arrow">▶</span>`;

            const content2 = document.createElement('div');
            content2.className = 'layer2-content';
            content2.style.display = 'block';

            header2.onclick = (e) => {
                e.stopPropagation();
                const isVisible = content2.style.display === 'block';
                content2.style.display = isVisible ? 'none' : 'block';
                header2.classList.toggle('active', !isVisible);
            };

            for (const [l3Name, items] of Object.entries(l3Obj)) {
                if (!items || items.length === 0) continue;
                const l3Div = document.createElement('div');
                l3Div.innerHTML = `<div class="layer3-title">▫️ ${l3Name}</div>`;
                const tagPool = document.createElement('div');
                tagPool.className = 'tag-pool';

                items.forEach(item => {
                    const tagEl = document.createElement('div');
                    tagEl.className = 'interactive-tag';
                    tagEl.id = `tag-${btoa(encodeURIComponent(item.en)).replace(/=/g, '')}`;
                    tagEl.innerHTML = `${item.cn} <span>${item.en}</span> <b class="weight-badge" style="display:none;"></b>`;
                    tagEl.onclick = (e) => { e.stopPropagation(); toggleTag(item); };
                    tagPool.appendChild(tagEl);
                });
                l3Div.appendChild(tagPool);
                content2.appendChild(l3Div);
            }
            l2Box.appendChild(header2);
            l2Box.appendChild(content2);
            content1.appendChild(l2Box);
        }
        accItem.appendChild(header1);
        accItem.appendChild(content1);
        container.appendChild(accItem);
    });
}

function toggleTag(item) {
    if (activeSelections.has(item.en)) { activeSelections.delete(item.en); }
    else { activeSelections.set(item.en, { cn: item.cn, weight: 1.0 }); }
    updateUIAndOutput();
}

function removeTagDirectly(enKey) {
    if (activeSelections.has(enKey)) {
        activeSelections.delete(enKey);
        updateUIAndOutput();
    }
}

function adjustWeight(enKey, delta) {
    if (activeSelections.has(enKey)) {
        let data = activeSelections.get(enKey);
        data.weight = Math.round((data.weight + delta) * 10) / 10;
        if (data.weight <= 0.2) data.weight = 0.2;
        if (data.weight > 2.0) data.weight = 2.0;
        activeSelections.set(enKey, data);
        updateUIAndOutput();
    }
}

function buildBasePrompt() {
    const profile = currentProfile();
    const model = document.getElementById('dt-model').value;
    const bg = document.getElementById('dt-bg').value;
    const quality = document.getElementById('dt-quality').value;
    const styleTags = profile ? profile.styleTags : "game asset";
    return `${styleTags}, ${quality}, ${bg}, ${model}`;
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
        listContainer.innerHTML = `<span style="color:var(--text-muted); font-size: 13px;">尚未選取任何標籤...</span>`;
    } else {
        activeSelections.forEach((data, enKey) => {
            const formattedToken = (data.weight === 1.0) ? enKey : `(${enKey}:${data.weight})`;
            activeTokens.push(formattedToken);

            const targetId = `tag-${btoa(encodeURIComponent(enKey)).replace(/=/g, '')}`;
            const matchedEl = document.getElementById(targetId);
            if (matchedEl) {
                matchedEl.classList.add('selected');
                if (data.weight !== 1.0) {
                    const badge = matchedEl.querySelector('.weight-badge');
                    if (badge) { badge.innerText = `x${data.weight}`; badge.style.display = 'inline-block'; }
                }
            }

            const listItem = document.createElement('div');
            listItem.className = 'selected-list-item';
            const safeEnKey = enKey.replace(/'/g, "\\'");

            listItem.innerHTML = `
                <div><b>${data.cn}</b> <span style="font-size:11px;color:var(--text-muted)">${data.weight !== 1.0 ? 'x'+data.weight : ''}</span></div>
                <div class="weight-actions">
                    <button onclick="adjustWeight('${safeEnKey}', 0.1)">➕</button>
                    <button onclick="adjustWeight('${safeEnKey}', -0.1)">➖</button>
                    <button class="btn-remove" onclick="removeTagDirectly('${safeEnKey}')" title="從本次組合剔除">❌ 剔除</button>
                </div>
            `;
            listContainer.appendChild(listItem);
        });
    }

    const basePositive = buildBasePrompt();
    document.getElementById('positivePrompt').value = activeTokens.length > 0
        ? `${basePositive}, ${activeTokens.join(', ')}`
        : basePositive;
    document.getElementById('negativePrompt').value = baseConfig ? baseConfig.baseNegative : '';
}

function clearAllSelection() { activeSelections.clear(); updateUIAndOutput(); }

function copyText(textareaId, btnId) {
    const textarea = document.getElementById(textareaId);
    const btn = document.getElementById(btnId);
    if (!textarea || !textarea.value) return;
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = "✅ 已複製！"; btn.style.background = "var(--accent)";
        setTimeout(() => { btn.innerHTML = originalText; btn.style.background = "var(--primary)"; }, 2000);
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

// ========================= Draw Things HTTP API =========================
function dtApiBase() {
    return document.getElementById('dt-api-base').value.replace(/\/+$/, '');
}

async function testDrawThingsConnection() {
    const statusEl = document.getElementById('dt-status');
    statusEl.textContent = '🔄 測試連線中...';
    try {
        const res = await fetch(`${dtApiBase()}/`, { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await res.json().catch(() => ({}));
        statusEl.innerHTML = '✅ 連線成功！Draw Things HTTP API 可正常呼叫。';
    } catch (e) {
        statusEl.innerHTML = `❌ 連線失敗：${e.message}<br>請確認 Draw Things App 已開啟「HTTP API Server」、位址正確，或改用 server_proxy.js 本機代理（見下方提示）。`;
    }
}

async function generateWithDrawThings() {
    const btn = document.getElementById('btn-generate-dt');
    const statusEl = document.getElementById('dt-status');
    const gallery = document.getElementById('dt-gallery');

    const positive = document.getElementById('positivePrompt').value.trim();
    const negative = document.getElementById('negativePrompt').value.trim();
    const width = parseInt(document.getElementById('dt-width').value) || 512;
    const height = parseInt(document.getElementById('dt-height').value) || 512;
    const steps = parseInt(document.getElementById('dt-steps').value) || 20;
    const cfgScale = parseFloat(document.getElementById('dt-cfg').value) || 7;
    const samplerName = document.getElementById('dt-sampler').value;
    const seedVal = parseInt(document.getElementById('dt-seed').value);
    const batchSize = parseInt(document.getElementById('dt-batch').value) || 1;

    if (!positive) { alert('正向提示詞是空的，請先選幾個標籤或輸入內容。'); return; }

    const payload = {
        prompt: positive,
        negative_prompt: negative,
        width: width,
        height: height,
        steps: steps,
        cfg_scale: cfgScale,
        sampler_name: samplerName,
        seed: isNaN(seedVal) ? -1 : seedVal,
        batch_size: batchSize
    };

    btn.disabled = true;
    const originalLabel = btn.innerHTML;
    btn.innerHTML = '⏳ 產生中...';
    statusEl.textContent = '🎨 已送出請求，等待 Draw Things 產圖（依步數/解析度可能需數秒到數十秒）...';
    gallery.innerHTML = '';

    try {
        const res = await fetch(`${dtApiBase()}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status} ${errText.slice(0, 150)}`);
        }
        const data = await res.json();
        if (!data.images || data.images.length === 0) throw new Error('回應中沒有圖片資料 (images 欄位為空)');

        data.images.forEach((b64, idx) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'dt-image-item';
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${b64}`;
            const dlLink = document.createElement('a');
            dlLink.href = img.src;
            dlLink.download = `draw_things_${Date.now()}_${idx}.png`;
            dlLink.className = 'dt-download-link';
            dlLink.textContent = '⬇️ 下載這張圖';
            wrapper.appendChild(img);
            wrapper.appendChild(dlLink);
            gallery.appendChild(wrapper);
        });
        statusEl.textContent = `✅ 產圖完成，共 ${data.images.length} 張（${width}x${height}, ${steps} steps, seed ${payload.seed}）。`;
    } catch (e) {
        statusEl.innerHTML = `❌ 產圖失敗：${e.message}<br>請確認 Draw Things HTTP API 已開啟，或改用 server_proxy.js 本機代理後把位址改成 http://127.0.0.1:8791。`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalLabel;
    }
}
