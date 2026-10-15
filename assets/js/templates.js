let creativeTemplates = [];
let templateStructureReady = false;
const templateLocale = {}; // { [locale]: { gameTypes, styleTypes, templates } }
let appliedTemplateId = null;
// 工作階段還原（session-ui.js）要等範本資料載入完成；載入失敗也要放行
let resolveTemplatesReady;
window.templatesReady = new Promise(resolve => { resolveTemplatesReady = resolve; });

function option(select, value, label) { const item = document.createElement('option'); item.value = value; item.textContent = label; select.appendChild(item); }

function templateText() { return templateLocale[I18N.locale] || {}; }
function gameTypeName(id) { return (templateText().gameTypes || {})[id] || id; }
function styleTypeName(id) { return (templateText().styleTypes || {})[id] || id; }
function templateName(item) { return ((templateText().templates || {})[item.id] || {}).label || item.id; }
function templateDescription(item) { return ((templateText().templates || {})[item.id] || {}).description || ''; }

async function loadTemplateLocale(code) {
    if (templateLocale[code]) return;
    try { templateLocale[code] = await I18N.fetchLocaleJson(code, 'templates.json'); }
    catch (error) { console.warn('[i18n]', error.message); templateLocale[code] = {}; }
}
I18N.addLoader(loadTemplateLocale);

function fillFilterSelects() {
    const gameSelect = document.getElementById('template-game-type'), styleSelect = document.getElementById('template-style-type');
    const keepGame = gameSelect.value, keepStyle = styleSelect.value;
    gameSelect.innerHTML = ''; styleSelect.innerHTML = '';
    option(gameSelect, '', t('template.allGameTypes'));
    [...new Set(creativeTemplates.map(item => item.gameType))].forEach(id => option(gameSelect, id, gameTypeName(id)));
    option(styleSelect, '', t('template.allStyleTypes'));
    [...new Set(creativeTemplates.map(item => item.styleType))].forEach(id => option(styleSelect, id, styleTypeName(id)));
    gameSelect.value = keepGame; styleSelect.value = keepStyle;
}

function templateChip(text) { const chip = document.createElement('span'); chip.className = 'template-chip'; chip.textContent = text; return chip; }

function templateItemButton(item) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'template-item' + (item.id === appliedTemplateId ? ' selected' : '');
    button.setAttribute('role', 'listitem');
    button.setAttribute('aria-pressed', item.id === appliedTemplateId ? 'true' : 'false');
    button.title = templateDescription(item);

    const head = document.createElement('span'); head.className = 'template-item-head';
    const name = document.createElement('span'); name.className = 'template-item-name'; name.textContent = templateName(item);
    const tags = document.createElement('span'); tags.className = 'template-item-tags';
    tags.append(templateChip(item.platform === 'mobile' ? t('template.platformMobile') : t('template.platformSteam')), templateChip(item.dimension.toUpperCase()));
    head.append(name, tags);

    const detail = document.createElement('span'); detail.className = 'template-item-detail';
    detail.textContent = templateDescription(item);
    const types = document.createElement('span'); types.className = 'template-item-types';
    types.textContent = `${gameTypeName(item.gameType)} · ${styleTypeName(item.styleType)}`;
    detail.append(types);

    button.append(head, detail);
    button.addEventListener('click', () => { if (item.id === appliedTemplateId) clearCreativeTemplate(); else applyCreativeTemplate(item.id); });
    return button;
}

function renderTemplateList() {
    const gameType = document.getElementById('template-game-type').value;
    const styleType = document.getElementById('template-style-type').value;
    const list = document.getElementById('template-list');
    list.innerHTML = '';
    const visible = creativeTemplates.filter(item => (!gameType || item.gameType === gameType) && (!styleType || item.styleType === styleType));
    if (!visible.length) {
        const empty = document.createElement('div'); empty.className = 'template-empty'; empty.textContent = t('template.noMatch');
        list.append(empty);
    } else visible.forEach(item => list.append(templateItemButton(item)));
}

function updateTemplateSummary() {
    const applied = creativeTemplates.find(item => item.id === appliedTemplateId);
    document.getElementById('template-current').textContent = applied ? t('template.current', { label: templateName(applied) }) : t('template.none');
    document.getElementById('template-panel').classList.toggle('has-template', Boolean(applied));
    document.getElementById('template-clear').hidden = !applied;
}

function applyCreativeTemplate(id) {
    const item = creativeTemplates.find(entry => entry.id === id);
    if (!item) return;
    templatePrompt = item.prompt;
    templateNegative = item.negative;
    appliedTemplateId = item.id;
    setPlatform(item.platform);
    setDimension(item.dimension);
    updateUIAndOutput();
    renderTemplateList();
    updateTemplateSummary();
}

function clearCreativeTemplate() {
    templatePrompt = ''; templateNegative = ''; appliedTemplateId = null;
    updateUIAndOutput();
    renderTemplateList();
    updateTemplateSummary();
}

async function loadCreativeTemplates() {
    const list = document.getElementById('template-list');
    try {
        await I18N.ready;
        list.textContent = t('template.loading');
        const response = await fetch('config_sheets/templates.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        creativeTemplates = (await response.json()).templates || [];
        await loadTemplateLocale(I18N.locale);
        document.getElementById('template-game-type').addEventListener('change', renderTemplateList);
        document.getElementById('template-style-type').addEventListener('change', renderTemplateList);
        document.getElementById('template-clear').addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); clearCreativeTemplate(); });
        templateStructureReady = true;
        fillFilterSelects();
        renderTemplateList();
        updateTemplateSummary();
    } catch (error) { list.textContent = t('template.loadError', { message: error.message }); }
    finally { resolveTemplatesReady(); }
}

window.addEventListener('localechange', () => {
    if (!templateStructureReady) return;
    fillFilterSelects();
    renderTemplateList();
    updateTemplateSummary();
});
window.addEventListener('DOMContentLoaded', loadCreativeTemplates);
