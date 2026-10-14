'use strict';
// 隨機抽卡邏輯測試：npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Randomizer = require('../assets/js/randomizer.js');

const DIR = path.join(__dirname, '../config_sheets');
const sheets = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8')).sheets
    .map(id => [id, JSON.parse(fs.readFileSync(path.join(DIR, `${id}.json`), 'utf8'))]));
const tagsOf = sheet => sheet.categories.flatMap(c => c.subcategories.flatMap(s => s.tags));

/** 可重現的亂數產生器（mulberry32）。 */
function seeded(seed) {
    return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

test('姿勢、表情、場景等互斥分類每次只會抽到一個結果', () => {
    for (const [sheetId, expected] of [['poses', 1], ['expressions', 1]]) {
        for (let i = 0; i < 50; i += 1) assert.equal(Randomizer.pickForSheet(sheets[sheetId], { rng: seeded(i) }).length, expected, sheetId);
    }
});

test('服裝只抽一件主服裝加一個配件；髮型與髮色各一個', () => {
    for (let i = 0; i < 50; i += 1) {
        const outfit = Randomizer.pickForSheet(sheets.costumes, { rng: seeded(i) });
        assert.equal(outfit.length, 2);
        const accessories = sheets.costumes.categories.find(c => c.id === 'accessories').subcategories[0].tags;
        assert.equal(outfit.filter(tag => accessories.includes(tag)).length, 1);
        assert.equal(Randomizer.pickForSheet(sheets.hair, { rng: seeded(i) }).length, 2);
    }
});

test('關閉 variety 時維持舊行為：每個子分類各抽一個', () => {
    assert.equal(Randomizer.pickForSheet(sheets.poses, { variety: false }).length, 4);
    assert.equal(Randomizer.pickForSheet(sheets.costumes, { variety: false }).length, 4);
});

test('抽到的標籤一定屬於該分類，且同一次結果沒有重複', () => {
    for (const [id, sheet] of Object.entries(sheets)) {
        const all = new Set(tagsOf(sheet));
        for (let i = 0; i < 30; i += 1) {
            const picks = Randomizer.pickForSheet(sheet, { rng: seeded(i + 100) });
            assert.ok(picks.length >= 1, id);
            assert.equal(new Set(picks).size, picks.length, id);
            picks.forEach(tag => assert.ok(all.has(tag), `${id}: ${tag}`));
        }
    }
});

test('給定相同種子結果相同', () => {
    assert.deepEqual(Randomizer.pickForSheet(sheets.poses, { rng: seeded(7) }), Randomizer.pickForSheet(sheets.poses, { rng: seeded(7) }));
});

test('連續抽卡會避開上一次的結果', () => {
    for (const id of ['poses', 'expressions', 'camera-composition', 'hair']) {
        let previous = new Set();
        for (let i = 0; i < 40; i += 1) {
            const picks = Randomizer.pickForSheet(sheets[id], { rng: seeded(i * 31 + 5), avoid: previous });
            picks.forEach(tag => assert.ok(!previous.has(tag), `${id} 重複了上一次的 ${tag}`));
            previous = new Set(picks);
        }
    }
});

test('所有候選都在 avoid 內時仍能抽出結果（允許重複）', () => {
    const group = { key: 'g', subs: [{ id: 'a', tags: ['x', 'y'] }] };
    const pick = Randomizer.pickFromGroup(group, { rng: seeded(1), avoid: new Set(['x', 'y']) });
    assert.ok(['x', 'y'].includes(pick));
    assert.equal(Randomizer.pickFromGroup({ key: 'g', subs: [] }), null);
});

test('先均勻挑子分類，再挑標籤（小子分類不會被大子分類淹沒）', () => {
    const group = { key: 'g', subs: [{ id: 'big', tags: Array.from({ length: 30 }, (_, i) => `b${i}`) }, { id: 'small', tags: ['s1', 's2'] }] };
    let small = 0; const rng = seeded(42);
    for (let i = 0; i < 2000; i += 1) if (Randomizer.pickFromGroup(group, { rng }).startsWith('s')) small += 1;
    assert.ok(small > 800 && small < 1200, `small=${small}`);
});
