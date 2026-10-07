'use strict';
// 以 Node 內建測試執行器驗證風格鎖定的純函式：npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { splitTokens, mergeTokens, slug, sanitizeProfile } = require('../assets/js/styleguide.js');

test('splitTokens 忽略括號內的逗號', () => {
    assert.deepEqual(splitTokens('a, (b, c:1.2), <lora:x:1>, d'), ['a', '(b, c:1.2)', '<lora:x:1>', 'd']);
});

test('mergeTokens 去除重複並保留先出現的順序', () => {
    assert.equal(mergeTokens('flat, Outline', 'outline, (x, y), flat, z'), 'flat, Outline, (x, y), z');
});

test('slug 保留中日韓文字並替換符號', () => {
    assert.equal(slug('騎士 Knight!!'), '騎士_Knight');
    assert.equal(slug('!!!'), 'item');
});

test('sanitizeProfile 正規化外部輸入', () => {
    const p = sanitizeProfile({ name: '  A ', params: { steps: 'x', cfg: 5, lora: 'l' }, seed: '12', seedMode: 'zzz' });
    assert.equal(p.name, 'A');
    assert.equal(p.params.steps, 28);
    assert.equal(p.params.cfg, 5);
    assert.equal(p.params.lora, 'l');
    assert.equal(p.seed, 12);
    assert.equal(p.seedMode, 'fixed');
});

test('sanitizeProfile 拒絕無效資料', () => {
    assert.equal(sanitizeProfile(null), null);
    assert.equal(sanitizeProfile({}), null);
    assert.equal(sanitizeProfile({ name: '   ' }), null);
});
