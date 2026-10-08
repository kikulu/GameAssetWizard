'use strict';
// 翻譯工具與語系檔測試：npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const i18n = require('../scripts/i18n.js');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO, 'scripts/i18n.js');

function sandbox() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-test-'));
    for (const item of ['locales', 'config_sheets', 'index.html']) fs.cpSync(path.join(REPO, item), path.join(dir, item), { recursive: true });
    fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
    fs.cpSync(path.join(REPO, 'assets/js'), path.join(dir, 'assets/js'), { recursive: true });
    return dir;
}
function run(dir, ...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { env: { ...process.env, I18N_ROOT: dir }, encoding: 'utf8' });
}
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

test('flatten 與 setByKey 互為反向操作，且不會新增不存在的鍵', () => {
    const data = { a: { b: 'x', c: { d: 'y' } }, e: 'z' };
    assert.deepEqual(i18n.flatten(data), { 'a::b': 'x', 'a::c::d': 'y', e: 'z' });
    assert.equal(i18n.setByKey(data, 'a::c::d', 'new'), true);
    assert.equal(data.a.c.d, 'new');
    assert.equal(i18n.setByKey(data, 'a::nope', 'v'), false);
    assert.equal(i18n.setByKey(data, 'zzz::b', 'v'), false);
});

test('placeholders 與 markup 擷取', () => {
    assert.deepEqual(i18n.placeholders('{b} and {a} {b}'), ['a', 'b', 'b']);
    assert.deepEqual(i18n.markup('<b>x</b><br/><code>y</code>'), ['<b>', '<br>', '<code>', '</b>', '</code>'].sort());
});

test('CSV 可往返處理逗號、引號、換行與 BOM', () => {
    const rows = [['scope', 'key', 'en'], ['ui', 'a', 'He said "hi", twice'], ['ui', 'b', 'line1\nline2'], ['ui', 'c', '']];
    const csv = '\uFEFF' + i18n.toCsv(rows);
    assert.deepEqual(i18n.parseCsv(csv), rows);
});

test('專案語系檔完整：npm run i18n:check 無錯誤', () => {
    const { errors, codes } = i18n.check();
    assert.deepEqual(errors, []);
    assert.deepEqual(codes.slice().sort(), ['en', 'ja', 'ko', 'zh-TW']);
});

test('每個提示詞都有各語言的標籤，英文標籤與提示詞一致', () => {
    const index = readJson(path.join(REPO, 'config_sheets/index.json'));
    for (const id of index.sheets) {
        const sheet = readJson(path.join(REPO, 'config_sheets', `${id}.json`));
        const prompts = sheet.categories.flatMap(c => c.subcategories.flatMap(s => s.tags));
        for (const code of ['zh-TW', 'en', 'ja', 'ko']) {
            const labels = readJson(path.join(REPO, 'locales', code, 'tags', `${id}.json`)).tags;
            for (const prompt of prompts) assert.ok(labels[prompt], `${code}/${id}: ${prompt}`);
        }
        const en = readJson(path.join(REPO, 'locales/en/tags', `${id}.json`)).tags;
        for (const prompt of prompts) assert.equal(en[prompt], prompt);
    }
});

test('table 產生對照表，import 能把試算表的翻譯寫回語系檔', () => {
    const dir = sandbox();
    assert.equal(run(dir, 'table', '--out', 'out').status, 0);
    const csvPath = path.join(dir, 'out/translation-table.csv');
    const rows = i18n.parseCsv(fs.readFileSync(csvPath, 'utf8'));
    assert.deepEqual(rows[0], ['scope', 'key', 'zh-TW', 'en', 'ja', 'ko']);
    assert.ok(fs.existsSync(path.join(dir, 'out/translation-table.md')));

    const row = rows.find(r => r[0] === 'ui' && r[1] === 'app.language');
    row[4] = '言語（改）';
    fs.writeFileSync(csvPath, i18n.toCsv(rows), 'utf8');
    const result = run(dir, 'import', csvPath);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readJson(path.join(dir, 'locales/ja/ui.json'))['app.language'], '言語（改）');
    assert.equal(run(dir, 'check').status, 0);
});

test('import 遇到占位符不一致或未知鍵時中止且不寫入任何檔案', () => {
    const dir = sandbox();
    run(dir, 'table', '--out', 'out');
    const csvPath = path.join(dir, 'out/translation-table.csv');
    const before = fs.readFileSync(path.join(dir, 'locales/ja/ui.json'), 'utf8');
    const rows = i18n.parseCsv(fs.readFileSync(csvPath, 'utf8'));
    rows.find(r => r[1] === 'app.language')[4] = '改過但會被拒絕前的值';
    rows.find(r => r[1] === 'gen.done')[4] = '完成（少了占位符）';
    fs.writeFileSync(csvPath, i18n.toCsv(rows), 'utf8');
    const result = run(dir, 'import', csvPath);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /占位符/);
    assert.equal(fs.readFileSync(path.join(dir, 'locales/ja/ui.json'), 'utf8'), before);

    rows.find(r => r[1] === 'gen.done')[4] = '';
    rows.push(['ui', 'no.such.key', 'x', 'x', 'x', 'x']);
    fs.writeFileSync(csvPath, i18n.toCsv(rows), 'utf8');
    assert.equal(run(dir, 'import', csvPath).status, 1);
});

test('check 會抓出缺少的鍵與錯誤的占位符', () => {
    const dir = sandbox();
    const uiFile = path.join(dir, 'locales/ko/ui.json');
    const ui = readJson(uiFile);
    delete ui['app.title'];
    ui['gen.done'] = '완료';
    fs.writeFileSync(uiFile, JSON.stringify(ui, null, 2));
    const result = run(dir, 'check');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /app\.title/);
    assert.match(result.stderr, /占位符不一致/);
});

test('add 可新增語言並通過檢查', () => {
    const dir = sandbox();
    const result = run(dir, 'add', 'fr', 'Français', 'French');
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(dir, 'locales/fr/ui.json')));
    assert.ok(readJson(path.join(dir, 'locales/locales.json')).locales.some(l => l.code === 'fr'));
    assert.equal(run(dir, 'check').status, 0);
    assert.equal(run(dir, 'add', 'fr', 'Français').status, 1);
    assert.equal(run(dir, 'add', 'bad code', 'x').status, 1);
});
