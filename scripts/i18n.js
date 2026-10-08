#!/usr/bin/env node
'use strict';
/**
 * 翻譯工具（無外部相依套件）
 *
 *   node scripts/i18n.js check                      檢查所有語系是否完整、占位符與標記一致
 *   node scripts/i18n.js table [--out docs/i18n]    產生對照表（CSV + Markdown）
 *   node scripts/i18n.js import <file.csv> [--dry-run]   將試算表中的翻譯寫回語系檔
 *   node scripts/i18n.js add <code> <label> [englishName]   新增語言（以英文為起點）
 *
 * 詳見 docs/I18N.md。
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.env.I18N_ROOT ? path.resolve(process.env.I18N_ROOT) : path.resolve(__dirname, '..'); // I18N_ROOT 供測試使用
const LOCALES_DIR = path.join(ROOT, 'locales');
const SHEETS_DIR = path.join(ROOT, 'config_sheets');
const SEP = '::';
const BOM = '\uFEFF';

// ------------------------------------------------------------------ 基礎工具

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function writeJson(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function loadRegistry() { return readJson(path.join(LOCALES_DIR, 'locales.json')); }

/** 語系檔清單（相對 locales/<code>/ 且不含 .json）：由結構檔決定，而非由某個語系檔決定。 */
function expectedFiles() {
    const index = readJson(path.join(SHEETS_DIR, 'index.json'));
    return ['ui', 'profiles', 'templates', ...index.sheets.map(id => `tags/${id}`)];
}

function localeFile(code, name) { return path.join(LOCALES_DIR, code, `${name}.json`); }

/** 將巢狀物件攤平成 { 'a::b::c': '字串' }。 */
function flatten(obj, prefix = [], out = {}) {
    for (const [key, value] of Object.entries(obj)) {
        const parts = [...prefix, key];
        if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, parts, out);
        else out[parts.join(SEP)] = value;
    }
    return out;
}

/** 依攤平的鍵設定值；鍵不存在時回傳 false（不新增，避免匯入錯字鍵）。 */
function setByKey(obj, flatKey, value) {
    const parts = flatKey.split(SEP);
    let node = obj;
    for (const part of parts.slice(0, -1)) {
        if (!node || typeof node !== 'object' || !(part in node)) return false;
        node = node[part];
    }
    const last = parts[parts.length - 1];
    if (!node || typeof node !== 'object' || !(last in node) || typeof node[last] !== 'string') return false;
    node[last] = value;
    return true;
}

function placeholders(text) { return [...String(text).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(); }
function markup(text) { return [...String(text).matchAll(/<\/?(?:b|code)>|<br\s*\/?>/gi)].map(m => (/^<br/i.test(m[0]) ? '<br>' : m[0].toLowerCase())).sort(); }
function sameList(a, b) { return a.length === b.length && a.every((item, i) => item === b[i]); }

// ------------------------------------------------------------------ 期望的鍵（由結構檔推導）

function expectedKeysFromStructure() {
    const keys = {};
    const index = readJson(path.join(SHEETS_DIR, 'index.json'));
    for (const id of index.sheets) {
        const sheet = readJson(path.join(SHEETS_DIR, `${id}.json`));
        const set = new Set([`name`]);
        for (const category of sheet.categories) {
            set.add(`categories${SEP}${category.id}`);
            for (const sub of category.subcategories) {
                set.add(`subcategories${SEP}${category.id}/${sub.id}`);
                for (const prompt of sub.tags) set.add(`tags${SEP}${prompt}`);
            }
        }
        keys[`tags/${id}`] = set;
    }
    const profiles = readJson(path.join(SHEETS_DIR, 'profiles.json'));
    const pset = new Set();
    for (const [key, profile] of Object.entries(profiles)) {
        for (const field of ['label', 'platform', 'dimension']) pset.add(`profiles${SEP}${key}${SEP}${field}`);
        for (const preset of profile.presets) for (const field of ['label', 'note']) pset.add(`presets${SEP}${preset.id}${SEP}${field}`);
    }
    keys.profiles = pset;
    const templates = readJson(path.join(SHEETS_DIR, 'templates.json')).templates;
    const tset = new Set();
    for (const item of templates) {
        tset.add(`gameTypes${SEP}${item.gameType}`);
        tset.add(`styleTypes${SEP}${item.styleType}`);
        tset.add(`templates${SEP}${item.id}${SEP}label`);
        tset.add(`templates${SEP}${item.id}${SEP}description`);
    }
    keys.templates = tset;
    return keys;
}

/** 掃描 index.html 與 assets/js 使用到的 UI 鍵。 */
function usedUiKeys() {
    const used = new Set();
    const files = [path.join(ROOT, 'index.html'), ...fs.readdirSync(path.join(ROOT, 'assets/js')).filter(f => f.endsWith('.js')).map(f => path.join(ROOT, 'assets/js', f))];
    for (const file of files) {
        const text = fs.readFileSync(file, 'utf8');
        for (const m of text.matchAll(/data-i18n(?:-html|-title|-placeholder|-aria-label)?="([\w.]+)"/g)) used.add(m[1]);
        for (const m of text.matchAll(/\bt\(\s*['"`]([\w.]+)['"`]/g)) used.add(m[1]);
        for (const m of text.matchAll(/setRich\([^,]+,\s*['"]([\w.]+)['"]/g)) used.add(m[1]);
    }
    return used;
}

// ------------------------------------------------------------------ check

function check() {
    const errors = [], warnings = [];
    const registry = loadRegistry();
    const codes = registry.locales.map(item => item.code);
    const reference = registry.defaultLocale;
    for (const [field, code] of [['defaultLocale', registry.defaultLocale], ['fallbackLocale', registry.fallbackLocale]]) {
        if (!codes.includes(code)) errors.push(`locales.json: ${field} "${code}" 不在語言清單中`);
    }
    for (const code of codes) {
        if (!fs.existsSync(path.join(LOCALES_DIR, code))) errors.push(`locales/${code}/ 資料夾不存在`);
    }

    const structureKeys = expectedKeysFromStructure();
    const usedKeys = usedUiKeys();
    const files = expectedFiles();

    // 讀取所有語系檔
    const data = {};
    for (const code of codes) {
        data[code] = {};
        for (const name of files) {
            const file = localeFile(code, name);
            if (!fs.existsSync(file)) { errors.push(`[${code}] 缺少檔案 ${name}.json`); continue; }
            try { data[code][name] = flatten(readJson(file)); }
            catch (error) { errors.push(`[${code}] ${name}.json 解析失敗：${error.message}`); }
        }
    }

    // 參考語系與結構／程式使用的鍵
    for (const name of files) {
        const ref = data[reference] && data[reference][name];
        if (!ref) continue;
        if (name === 'ui') {
            for (const key of usedKeys) if (!(key in ref)) errors.push(`[${reference}] ui.json 缺少程式使用的鍵：${key}`);
            for (const key of Object.keys(ref)) {
                if (!usedKeys.has(key) && !key.startsWith('error.')) warnings.push(`[${reference}] ui.json 的鍵未被使用：${key}`);
            }
        } else {
            const expected = structureKeys[name];
            for (const key of expected) if (!(key in ref)) errors.push(`[${reference}] ${name}.json 缺少結構檔需要的鍵：${key}`);
            for (const key of Object.keys(ref)) if (!expected.has(key)) warnings.push(`[${reference}] ${name}.json 有結構檔未使用的鍵：${key}`);
        }
    }

    // 各語系與參考語系比對
    const untranslated = {};
    for (const code of codes) {
        if (code === reference) continue;
        untranslated[code] = [];
        for (const name of files) {
            const ref = data[reference][name], cur = data[code][name];
            if (!ref || !cur) continue;
            for (const key of Object.keys(ref)) {
                if (!(key in cur)) { errors.push(`[${code}] ${name}.json 缺少鍵：${key}`); continue; }
                const value = cur[key];
                if (typeof value !== 'string' || value.trim() === '') { errors.push(`[${code}] ${name}.json 空白翻譯：${key}`); continue; }
                if (!sameList(placeholders(ref[key]), placeholders(value))) errors.push(`[${code}] ${name}.json 占位符不一致：${key}（${placeholders(ref[key])} ≠ ${placeholders(value)}）`);
                if (!sameList(markup(ref[key]), markup(value))) errors.push(`[${code}] ${name}.json 標記（<b>/<code>/<br>）不一致：${key}`);
                const english = data.en && data.en[name] && data.en[name][key];
                if (code !== 'en' && english !== undefined && value === english && /[A-Za-z]{4,}/.test(value.replace(/Steam|PC|2D|3D|UI|HUD|SF|iOS|Android/g, '')) && name !== 'ui') untranslated[code].push(`${name}${SEP}${key}`);
            }
            for (const key of Object.keys(cur)) if (!(key in ref)) errors.push(`[${code}] ${name}.json 多出參考語系沒有的鍵：${key}`);
        }
    }
    for (const [code, list] of Object.entries(untranslated)) {
        if (list.length > 0) warnings.push(`[${code}] 有 ${list.length} 筆內容與英文相同，可能尚未翻譯（可能是專有名詞）：${list.slice(0, 6).join('、')}${list.length > 6 ? '…' : ''}`);
    }

    // 結構檔中重複的提示詞
    const seen = new Map();
    for (const name of files.filter(f => f.startsWith('tags/'))) {
        const sheetId = name.slice(5);
        for (const key of structureKeys[name]) {
            if (!key.startsWith(`tags${SEP}`)) continue;
            const prompt = key.slice(5);
            if (seen.has(prompt) && seen.get(prompt) !== sheetId) errors.push(`提示詞在多個分類重複：${prompt}（${seen.get(prompt)}、${sheetId}）`);
            seen.set(prompt, sheetId);
        }
    }

    return { errors, warnings, codes, files };
}

// ------------------------------------------------------------------ CSV

function toCsv(rows) {
    const cell = value => {
        const text = String(value ?? '');
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    return rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

function parseCsv(text) {
    text = text.replace(/^\uFEFF/, '');
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false; }
            else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i += 1;
            row.push(cell); cell = '';
            if (row.length > 1 || row[0] !== '') rows.push(row);
            row = [];
        } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
}

// ------------------------------------------------------------------ table

function buildTable() {
    const registry = loadRegistry();
    const codes = [registry.defaultLocale, ...registry.locales.map(item => item.code).filter(c => c !== registry.defaultLocale)];
    const rows = [];
    for (const name of expectedFiles()) {
        const flats = {};
        for (const code of codes) {
            const file = localeFile(code, name);
            flats[code] = fs.existsSync(file) ? flatten(readJson(file)) : {};
        }
        for (const key of Object.keys(flats[codes[0]])) rows.push({ scope: name, key, values: codes.map(code => flats[code][key] ?? '') });
    }
    return { codes, rows };
}

function tableCsv({ codes, rows }) {
    return BOM + toCsv([['scope', 'key', ...codes], ...rows.map(r => [r.scope, r.key, ...r.values])]);
}

function mdCell(text) { return String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>'); }

function tableMarkdown({ codes, rows }) {
    const lines = [
        '# 翻譯對照表',
        '',
        '> 此檔由 `npm run i18n:table` 自動產生，請勿手動編輯。要修改翻譯，請編輯 `locales/<語言>/` 底下的 JSON，或編輯 `translation-table.csv` 後以 `npm run i18n:import` 匯回。',
        '',
        `共 ${rows.length} 筆，語言：${codes.join('、')}。`,
        ''
    ];
    let scope = null;
    for (const row of rows) {
        if (row.scope !== scope) {
            scope = row.scope;
            lines.push('', `## ${scope}`, '', `| 鍵 | ${codes.join(' | ')} |`, `| --- | ${codes.map(() => '---').join(' | ')} |`);
        }
        lines.push(`| ${mdCell(row.key)} | ${row.values.map(mdCell).join(' | ')} |`);
    }
    return lines.join('\n') + '\n';
}

function table(outDir) {
    const built = buildTable();
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'translation-table.csv'), tableCsv(built), 'utf8');
    fs.writeFileSync(path.join(outDir, 'translation-table.md'), tableMarkdown(built), 'utf8');
    return built;
}

// ------------------------------------------------------------------ import

function importCsv(csvPath, { dryRun = false } = {}) {
    const registry = loadRegistry();
    const codes = registry.locales.map(item => item.code);
    const reference = registry.defaultLocale;
    const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
    if (rows.length < 2) throw new Error('CSV 沒有資料列');
    const header = rows[0];
    if (header[0] !== 'scope' || header[1] !== 'key') throw new Error('CSV 標題列必須以 scope,key 開頭');
    const columns = header.slice(2);
    for (const column of columns) if (!codes.includes(column)) throw new Error(`CSV 含有未登錄的語言欄：${column}`);
    const files = new Set(expectedFiles());

    const cache = {}; const problems = []; let changed = 0;
    const load = (code, name) => {
        const k = `${code}/${name}`;
        if (!cache[k]) cache[k] = { file: localeFile(code, name), json: readJson(localeFile(code, name)), dirty: false };
        return cache[k];
    };
    for (const [line, row] of rows.slice(1).entries()) {
        const [scope, key] = row;
        if (!files.has(scope)) { problems.push(`第 ${line + 2} 列：未知的 scope「${scope}」`); continue; }
        const refFlat = flatten(load(reference, scope).json);
        if (!(key in refFlat)) { problems.push(`第 ${line + 2} 列：${scope} 沒有鍵「${key}」`); continue; }
        columns.forEach((code, i) => {
            const value = row[2 + i];
            if (value === undefined || value.trim() === '') return;
            const entry = load(code, scope);
            const current = flatten(entry.json)[key];
            if (current === value) return;
            if (!sameList(placeholders(refFlat[key]), placeholders(value))) { problems.push(`第 ${line + 2} 列 [${code}] ${key}：占位符與 ${reference} 不一致`); return; }
            if (!sameList(markup(refFlat[key]), markup(value))) { problems.push(`第 ${line + 2} 列 [${code}] ${key}：標記與 ${reference} 不一致`); return; }
            if (!setByKey(entry.json, key, value)) { problems.push(`第 ${line + 2} 列 [${code}] ${key}：語系檔沒有此鍵`); return; }
            entry.dirty = true; changed += 1;
        });
    }
    if (!dryRun && problems.length === 0) for (const entry of Object.values(cache)) if (entry.dirty) writeJson(entry.file, entry.json);
    return { changed, problems, written: !dryRun && problems.length === 0 };
}

// ------------------------------------------------------------------ add

function addLocale(code, label, englishName) {
    if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(code)) throw new Error(`語言代碼格式不正確：${code}（例如 fr、pt-BR、zh-CN）`);
    const registry = loadRegistry();
    if (registry.locales.some(item => item.code === code)) throw new Error(`語言 ${code} 已存在`);
    if (!label) throw new Error('請提供語言顯示名稱，例如：npm run i18n:add -- fr Français French');
    for (const name of expectedFiles()) {
        const source = localeFile('en', name);
        writeJson(localeFile(code, name), readJson(source));
    }
    registry.locales.push({ code, label, englishName: englishName || label });
    writeJson(path.join(LOCALES_DIR, 'locales.json'), registry);
}

// ------------------------------------------------------------------ CLI

function main(argv) {
    const [command, ...args] = argv;
    switch (command) {
        case 'check': {
            const { errors, warnings, codes, files } = check();
            warnings.forEach(w => console.warn(`⚠️  ${w}`));
            errors.forEach(e => console.error(`❌ ${e}`));
            if (errors.length) { console.error(`\ni18n 檢查失敗：${errors.length} 個錯誤，${warnings.length} 個警告。`); return 1; }
            console.log(`✅ i18n 檢查通過：${codes.length} 種語言（${codes.join('、')}）、${files.length} 個檔案，${warnings.length} 個警告。`);
            return 0;
        }
        case 'table': {
            const outIndex = args.indexOf('--out');
            const outDir = path.resolve(ROOT, outIndex >= 0 ? args[outIndex + 1] : 'docs/i18n');
            const built = table(outDir);
            console.log(`✅ 已產生 ${built.rows.length} 筆對照：${path.relative(ROOT, outDir)}/translation-table.{csv,md}`);
            return 0;
        }
        case 'import': {
            const file = args.find(a => !a.startsWith('--'));
            if (!file) { console.error('用法：node scripts/i18n.js import <file.csv> [--dry-run]'); return 1; }
            const result = importCsv(path.resolve(file), { dryRun: args.includes('--dry-run') });
            result.problems.forEach(p => console.error(`❌ ${p}`));
            if (result.problems.length) { console.error(`\n匯入中止：${result.problems.length} 個問題，未寫入任何檔案。`); return 1; }
            console.log(result.written ? `✅ 已更新 ${result.changed} 筆翻譯。請執行 npm run i18n:check 與 npm run i18n:table。` : `（dry-run）將更新 ${result.changed} 筆翻譯。`);
            return 0;
        }
        case 'add': {
            const [code, label, englishName] = args;
            addLocale(code, label, englishName);
            console.log(`✅ 已建立 locales/${code}/（內容暫為英文）並登錄於 locales.json。\n下一步：翻譯 locales/${code}/ 內的 JSON，或執行 npm run i18n:table 後用試算表翻譯，再以 npm run i18n:import 匯回。`);
            return 0;
        }
        default:
            console.error('用法：node scripts/i18n.js <check|table|import|add> [...]');
            return 1;
    }
}

if (require.main === module) {
    try { process.exitCode = main(process.argv.slice(2)); }
    catch (error) { console.error(`❌ ${error.message}`); process.exitCode = 1; }
}

module.exports = { flatten, setByKey, placeholders, markup, toCsv, parseCsv, check, buildTable, tableCsv, importCsv, addLocale, expectedFiles };
