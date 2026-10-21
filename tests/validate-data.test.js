'use strict';
// 資料結構驗證測試：npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { validate } = require('../scripts/validate-data.js');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO, 'scripts/validate-data.js');

function sandbox() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-test-'));
    fs.cpSync(path.join(REPO, 'config_sheets'), path.join(dir, 'config_sheets'), { recursive: true });
    return dir;
}
const run = dir => spawnSync(process.execPath, [SCRIPT], { env: { ...process.env, I18N_ROOT: dir }, encoding: 'utf8' });
const edit = (dir, file, fn) => { const p = path.join(dir, 'config_sheets', file); const data = JSON.parse(fs.readFileSync(p, 'utf8')); fn(data); fs.writeFileSync(p, JSON.stringify(data, null, 2)); };

test('專案資料通過驗證', () => {
    const result = validate();
    assert.deepEqual(result.errors, []);
    assert.equal(result.sheets, 18);
    assert.equal(result.prompts, 361);
});

test('抓出重複的提示詞與錯誤的 group', () => {
    const dir = sandbox();
    edit(dir, 'poses.json', d => { d.categories[0].subcategories[0].tags.push(d.categories[1].subcategories[0].tags[0]); d.categories[0].subcategories[0].group = 'Bad Group'; });
    const result = run(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /提示詞重複/);
    assert.match(result.stderr, /group/);
});

test('抓出不存在的分類與錯誤的尺寸', () => {
    const dir = sandbox();
    edit(dir, 'profiles.json', d => { d.mobile.defaultRandomSheets.push('no-such-sheet'); d.mobile.presets[0].w = 0; });
    const result = run(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no-such-sheet/);
    assert.match(result.stderr, /整數/);
});

test('抓出 id 與檔名不一致', () => {
    const dir = sandbox();
    edit(dir, 'hair.json', d => { d.id = 'wrong'; });
    assert.match(run(dir).stderr, /id 必須等於檔名/);
});

test('single 必須是布林值，且不可與 group 同時使用', () => {
    const dir = sandbox();
    edit(dir, 'hair.json', d => { d.categories[0].subcategories[0].single = 'yes'; });
    assert.match(run(dir).stderr, /single 必須是布林值/);
    const dir2 = sandbox();
    edit(dir2, 'poses.json', d => { d.categories[0].subcategories[0].single = true; });
    assert.match(run(dir2).stderr, /single 與 group 不可同時使用/);
});
