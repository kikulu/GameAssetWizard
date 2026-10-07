let creativeTemplates = [];

function option(select, value, label) { const item = document.createElement('option'); item.value = value; item.textContent = label; select.appendChild(item); }
function selectedCreativeTemplate() { return creativeTemplates.find(item => item.id === document.getElementById('template-package').value); }

function refreshCreativeTemplatePackages() {
    const gameType = document.getElementById('template-game-type').value;
    const styleType = document.getElementById('template-style-type').value;
    const packages = creativeTemplates.filter(item => (!gameType || item.gameType === gameType) && (!styleType || item.styleType === styleType));
    const select = document.getElementById('template-package'); select.innerHTML = '';
    packages.forEach(item => option(select, item.id, item.label));
    updateCreativeTemplateDescription();
}

function updateCreativeTemplateDescription() {
    const item = selectedCreativeTemplate();
    document.getElementById('template-description').textContent = item ? `${item.description} ${item.platform === 'mobile' ? '📱 Mobile' : '🖥️ Steam/PC'} · ${item.dimension.toUpperCase()}` : '找不到符合條件的套餐，請調整篩選。';
}

function applyCreativeTemplate() {
    const item = selectedCreativeTemplate();
    if (!item) return;
    templatePrompt = item.prompt;
    templateNegative = item.negative;
    setPlatform(item.platform);
    setDimension(item.dimension);
    updateUIAndOutput();
    document.getElementById('template-description').textContent = `✅ 已套用「${item.label}」。現在可從詞庫加入標籤、調整權重與產圖參數。`;
}

function clearCreativeTemplate() {
    templatePrompt = ''; templateNegative = ''; updateUIAndOutput();
    updateCreativeTemplateDescription();
}

async function loadCreativeTemplates() {
    try {
        const response = await fetch('config_sheets/templates.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        creativeTemplates = (await response.json()).templates || [];
        const gameSelect = document.getElementById('template-game-type'), styleSelect = document.getElementById('template-style-type');
        option(gameSelect, '', '全部遊戲類型'); [...new Set(creativeTemplates.map(item => item.gameType))].forEach(item => option(gameSelect, item, item));
        option(styleSelect, '', '全部風格類型'); [...new Set(creativeTemplates.map(item => item.styleType))].forEach(item => option(styleSelect, item, item));
        gameSelect.addEventListener('change', refreshCreativeTemplatePackages);
        styleSelect.addEventListener('change', refreshCreativeTemplatePackages);
        document.getElementById('template-package').addEventListener('change', updateCreativeTemplateDescription);
        refreshCreativeTemplatePackages();
    } catch (error) { document.getElementById('template-description').textContent = `❌ 無法載入套餐：${error.message}`; }
}
window.addEventListener('DOMContentLoaded', loadCreativeTemplates);
