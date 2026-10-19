#!/usr/bin/env node
'use strict';
/**
 * 詞庫與設定檔結構驗證（無外部相依套件）：npm run validate
 * 檢查 config_sheets/ 的 id、群組、提示詞唯一性、模式與範本欄位。
 * 各語言的顯示文字完整性由 npm run i18n:check 負責。
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.I18N_ROOT ? path.resolve(process.env.I18N_ROOT) : path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'config_sheets');
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PROFILE_KEYS = ['mobile', 'mobile2d', 'mobile3d', 'steam', 'steam2d', 'steam3d'];

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const isText = value => typeof value === 'string' && value.trim() !== '';

function validate() {
    const errors = [];
    const err = message => errors.push(message);

    // base_settings
    try { if (!isText(readJson(path.join(DIR, 'base_settings.json')).baseNegative)) err('base_settings.json: baseNegative 必須是非空字串'); }
    catch (e) { err(`base_settings.json: ${e.message}`); }

    // index + sheets
    let sheetIds = [];
    try {
        const index = readJson(path.join(DIR, 'index.json'));
        if (!Array.isArray(index.sheets) || index.sheets.length === 0) err('index.json: sheets 必須是非空陣列');
        else sheetIds = index.sheets;
    } catch (e) { err(`index.json: ${e.message}`); }
    const seenSheets = new Set(), seenPrompts = new Map();
    for (const id of sheetIds) {
        if (!KEBAB.test(id)) err(`index.json: 分類 id「${id}」必須是 kebab-case`);
        if (seenSheets.has(id)) err(`index.json: 分類 id「${id}」重複`);
        seenSheets.add(id);
        const file = path.join(DIR, `${id}.json`);
        if (!fs.existsSync(file)) { err(`${id}.json: 檔案不存在`); continue; }
        let sheet;
        try { sheet = readJson(file); } catch (e) { err(`${id}.json: ${e.message}`); continue; }
        if (sheet.id !== id) err(`${id}.json: id 必須等於檔名（目前是「${sheet.id}」）`);
        if (!Array.isArray(sheet.categories) || sheet.categories.length === 0) { err(`${id}.json: categories 必須是非空陣列`); continue; }
        const categoryIds = new Set();
        for (const category of sheet.categories) {
            const where = `${id}/${category.id}`;
            if (!KEBAB.test(category.id || '')) err(`${id}.json: 子分類群組 id「${category.id}」必須是 kebab-case`);
            if (categoryIds.has(category.id)) err(`${id}.json: category id「${category.id}」重複`);
            categoryIds.add(category.id);
            if (!Array.isArray(category.subcategories) || category.subcategories.length === 0) { err(`${where}: subcategories 必須是非空陣列`); continue; }
            const subIds = new Set();
            for (const sub of category.subcategories) {
                const subWhere = `${where}/${sub.id}`;
                if (!KEBAB.test(sub.id || '')) err(`${where}: subcategory id「${sub.id}」必須是 kebab-case`);
                if (subIds.has(sub.id)) err(`${where}: subcategory id「${sub.id}」重複`);
                subIds.add(sub.id);
                if (sub.group !== undefined && !KEBAB.test(String(sub.group))) err(`${subWhere}: group「${sub.group}」必須是 kebab-case`);
                if (sub.single !== undefined && typeof sub.single !== 'boolean') err(`${subWhere}: single 必須是布林值`);
                if (sub.single === true && sub.group !== undefined) err(`${subWhere}: single 與 group 不可同時使用（group 已涵蓋互斥）`);
                if (!Array.isArray(sub.tags) || sub.tags.length === 0) { err(`${subWhere}: tags 必須是非空陣列`); continue; }
                for (const prompt of sub.tags) {
                    if (!isText(prompt) || prompt !== prompt.trim()) { err(`${subWhere}: 提示詞必須是沒有前後空白的非空字串（${JSON.stringify(prompt)}）`); continue; }
                    if (seenPrompts.has(prompt)) err(`提示詞重複：「${prompt}」（${seenPrompts.get(prompt)}、${subWhere}）`);
                    seenPrompts.set(prompt, subWhere);
                }
            }
        }
    }

    // profiles
    let presetIds = new Set();
    try {
        const profiles = readJson(path.join(DIR, 'profiles.json'));
        for (const key of PROFILE_KEYS) {
            const profile = profiles[key];
            if (!profile) { err(`profiles.json: 缺少模式「${key}」`); continue; }
            if (!isText(profile.styleTags)) err(`profiles.json/${key}: styleTags 必須是非空字串`);
            for (const sheetId of profile.defaultRandomSheets || []) if (!seenSheets.has(sheetId)) err(`profiles.json/${key}: defaultRandomSheets 含有不存在的分類「${sheetId}」`);
            if (!Array.isArray(profile.presets) || profile.presets.length === 0) { err(`profiles.json/${key}: presets 必須是非空陣列`); continue; }
            const ids = new Set();
            for (const preset of profile.presets) {
                if (!KEBAB.test(preset.id || '')) err(`profiles.json/${key}: preset id「${preset.id}」必須是 kebab-case`);
                if (ids.has(preset.id)) err(`profiles.json/${key}: preset id「${preset.id}」重複`);
                ids.add(preset.id);
                for (const side of ['w', 'h']) if (!Number.isInteger(preset[side]) || preset[side] < 16 || preset[side] > 16384) err(`profiles.json/${key}/${preset.id}: ${side} 必須是 16–16384 的整數`);
                if (presetIds.has(preset.id)) { /* 不同模式共用同一個 preset id 是允許的 */ }
                presetIds.add(preset.id);
            }
        }
        for (const key of Object.keys(profiles)) if (!PROFILE_KEYS.includes(key)) err(`profiles.json: 未知的模式「${key}」`);
    } catch (e) { err(`profiles.json: ${e.message}`); }

    // templates
    try {
        const templates = readJson(path.join(DIR, 'templates.json')).templates;
        if (!Array.isArray(templates) || templates.length === 0) err('templates.json: templates 必須是非空陣列');
        else {
            const ids = new Set();
            for (const item of templates) {
                if (!KEBAB.test(item.id || '')) err(`templates.json: id「${item.id}」必須是 kebab-case`);
                if (ids.has(item.id)) err(`templates.json: id「${item.id}」重複`);
                ids.add(item.id);
                if (!['mobile', 'steam'].includes(item.platform)) err(`templates.json/${item.id}: platform 必須是 mobile 或 steam`);
                if (!['2d', '3d'].includes(item.dimension)) err(`templates.json/${item.id}: dimension 必須是 2d 或 3d`);
                for (const field of ['gameType', 'styleType']) if (!KEBAB.test(item[field] || '')) err(`templates.json/${item.id}: ${field} 必須是 kebab-case id`);
                for (const field of ['prompt', 'negative']) if (!isText(item[field])) err(`templates.json/${item.id}: ${field} 必須是非空字串`);
            }
        }
    } catch (e) { err(`templates.json: ${e.message}`); }

    return { errors, sheets: sheetIds.length, prompts: seenPrompts.size };
}

if (require.main === module) {
    const { errors, sheets, prompts } = validate();
    errors.forEach(e => console.error(`❌ ${e}`));
    if (errors.length) { console.error(`\n資料驗證失敗：${errors.length} 個問題。`); process.exitCode = 1; }
    else console.log(`✅ 資料驗證通過：${sheets} 個分類、${prompts} 個提示詞。`);
}

module.exports = { validate };
