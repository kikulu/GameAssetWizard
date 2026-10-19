'use strict';
// 工作階段驗證與分享連結：npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const Session = require('../assets/js/session.js');

const ctx = {
    prompts: new Set(['knight', 'close-up shot', 'battle stance']),
    engines: ['sdxl', 'midjourney', 'dalle3'],
    sheets: ['poses', 'costumes'],
    templates: ['mobile-anime-rpg'],
    backgrounds: ['clean studio background', 'transparent background, isolated on white'],
    qualities: ['masterpiece, best quality, highly detailed, 4k']
};
const valid = {
    platform: 'steam', dimension: '3d', engine: 'midjourney', background: 'clean studio background',
    quality: 'masterpiece, best quality, highly detailed, 4k', width: 1920, height: 1080, preset: 'steam-main-capsule', template: 'mobile-anime-rpg',
    selections: [{ prompt: 'knight', weight: 1.3, pinned: true }, { prompt: 'battle stance', weight: 0.6 }],
    random: { sheets: ['poses'], variety: false, locked: ['costumes'], exclusive: true }
};

test('sanitize 接受有效的工作階段並保留釘選與權重', () => {
    const { state, skipped } = Session.sanitize(valid, ctx);
    assert.equal(skipped, 0);
    assert.equal(state.platform, 'steam');
    assert.equal(state.engine, 'midjourney');
    assert.deepEqual(state.selections, [{ prompt: 'knight', weight: 1.3, pinned: true }, { prompt: 'battle stance', weight: 0.6, pinned: false }]);
    assert.deepEqual(state.random, { sheets: ['poses'], variety: false, locked: ['costumes'], exclusive: true });
    assert.equal(state.template, 'mobile-anime-rpg');
});

test('sanitize 略過詞庫中不存在的提示詞並回報數量，不會塞入任意文字', () => {
    const { state, skipped } = Session.sanitize({ ...valid, selections: [...valid.selections, { prompt: '<script>alert(1)</script>', weight: 1 }, 'unknown tag'] }, ctx);
    assert.equal(skipped, 2);
    assert.deepEqual(state.selections.map(s => s.prompt), ['knight', 'battle stance']);
});

test('sanitize 修正權重、去除重複並套用預設值', () => {
    const { state } = Session.sanitize({ platform: 'xbox', dimension: '4d', engine: 'nope', width: 3, height: 'abc', template: 'nope',
        selections: [{ prompt: 'knight', weight: 99 }, { prompt: 'knight', weight: 1 }, { prompt: 'battle stance', weight: 'x' }, { prompt: 'close-up shot', weight: 0.01 }],
        random: { sheets: ['poses', 'nope', 5], locked: ['costumes', 'nope', 7] } }, ctx);
    assert.equal(state.platform, 'mobile');
    assert.equal(state.dimension, 'general');
    assert.equal(state.engine, 'sdxl');
    assert.equal(state.width, null);
    assert.equal(state.height, null);
    assert.equal(state.template, null);
    assert.deepEqual(state.selections.map(s => s.weight), [2, 1, 0.2]);
    assert.deepEqual(state.random, { sheets: ['poses'], variety: true, locked: ['costumes'], exclusive: false });
});

test('sanitize 拒絕非物件', () => {
    for (const bad of [null, undefined, 'x', 5, [], true]) assert.equal(Session.sanitize(bad, ctx), null);
});

test('分享代碼可往返，含中文與特殊字元', () => {
    const state = { ...valid, note: '騎士 & "cape" 🎮' };
    const code = Session.encodeShare(state);
    assert.match(code, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(Session.decodeShare(code), state);
});

test('extractPayload 支援網址、hash、查詢字串與純代碼', () => {
    const code = Session.encodeShare(valid);
    assert.equal(Session.extractPayload(`https://example.com/app/index.html#s=${code}`), code);
    assert.equal(Session.extractPayload(`#s=${code}`), code);
    assert.equal(Session.extractPayload(`https://example.com/?x=1&s=${code}`), code);
    assert.equal(Session.extractPayload(`  ${code}  `), code);
    assert.equal(Session.extractPayload('hello world'), null);
    assert.equal(Session.extractPayload(''), null);
});

test('decodeShare 對毀損或過大的內容回傳 null', () => {
    assert.equal(Session.decodeShare('!!!not-base64!!!'), null);
    assert.equal(Session.decodeShare('abcdefghijklmnopqrstuvwxyz'), null);
    assert.equal(Session.decodeShare(`#s=${'A'.repeat(Session.MAX_PAYLOAD + 1)}`), null);
});

test('匯出檔可還原；parseFile 也接受只含 state 的物件，拒絕其他內容', () => {
    const file = Session.exportFile(valid);
    assert.deepEqual(Session.parseFile(file), valid);
    assert.deepEqual(Session.parseFile(JSON.stringify(valid)), valid);
    assert.equal(Session.parseFile('not json'), null);
    assert.equal(Session.parseFile('{"hello":1}'), null);
});

test('分享的工作階段不含 API 位址或產圖參數', () => {
    const { state } = Session.sanitize({ ...valid, apiBase: 'http://127.0.0.1:7860', steps: 30, seed: 1 }, ctx);
    assert.deepEqual(Object.keys(state).sort(), ['background', 'dimension', 'engine', 'height', 'platform', 'preset', 'quality', 'random', 'selections', 'template', 'version', 'width'].sort());
});
