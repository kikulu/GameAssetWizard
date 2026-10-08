let creativeTemplates = [];
let templateStructureReady = false;
const templateLocale = {}; // { [locale]: { gameTypes, styleTypes, templates } }
let appliedTemplateId = null;

function option(select, value, label) { const item = document.createElement('option'); item.value = value; item.textContent = label; select.appendChild(item); }
function selectedCreativeTemplate() { return creativeTemplates.find(item => item.id === document.getElementById('template-package').value); }

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

function refreshCreativeTemplatePackages() {
    const gameType = document.getElementById('template-game-type').value;
    const styleType = document.getElementById('template-style-type').value;
    const packages = creativeTemplates.filter(item => (!gameType || item.gameType === gameType) && (!styleType || item.styleType === styleType));
    const select = document.getElementById('template-package');
    const keep = select.value;
    select.innerHTML = '';
    packages.forEach(item => option(select, item.id, templateName(item)));
    if (keep && packages.some(item => item.id === keep)) select.value = keep;
    updateCreativeTemplateDescription();
}

function updateCreativeTemplateDescription() {
    const item = selectedCreativeTemplate();
    const box = document.getElementById('template-description');
    if (!item) { box.textContent = t('template.noMatch'); return; }
    box.textContent = t('template.meta', {
        description: templateDescription(item),
        platform: item.platform === 'mobile' ? t('template.platformMobile') : t('template.platformSteam'),
        dimension: item.dimension.toUpperCase()
    });
}

function applyCreativeTemplate() {
    const item = selectedCreativeTemplate();
    if (!item) return;
    templatePrompt = item.prompt;
    templateNegative = item.negative;
    appliedTemplateId = item.id;
    setPlatform(item.platform);
    setDimension(item.dimension);
    updateUIAndOutput();
    document.getElementById('template-description').textContent = t('template.applied', { label: templateName(item) });
}

function clearCreativeTemplate() {
    templatePrompt = ''; templateNegative = ''; appliedTemplateId = null; updateUIAndOutput();
    updateCreativeTemplateDescription();
}

async function loadCreativeTemplates() {
    try {
        await I18N.ready;
        document.getElementById('template-description').textContent = t('template.loading');
        const response = await fetch('config_sheets/templates.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        creativeTemplates = (await response.json()).templates || [];
        await loadTemplateLocale(I18N.locale);
        document.getElementById('template-game-type').addEventListener('change', refreshCreativeTemplatePackages);
        document.getElementById('template-style-type').addEventListener('change', refreshCreativeTemplatePackages);
        document.getElementById('template-package').addEventListener('change', updateCreativeTemplateDescription);
        templateStructureReady = true;
        fillFilterSelects();
        refreshCreativeTemplatePackages();
    } catch (error) { document.getElementById('template-description').textContent = t('template.loadError', { message: error.message }); }
}

window.addEventListener('localechange', () => {
    if (!templateStructureReady) return;
    fillFilterSelects();
    refreshCreativeTemplatePackages();
    const applied = creativeTemplates.find(item => item.id === appliedTemplateId);
    if (applied) document.getElementById('template-description').textContent = t('template.applied', { label: templateName(applied) });
});
window.addEventListener('DOMContentLoaded', loadCreativeTemplates);
