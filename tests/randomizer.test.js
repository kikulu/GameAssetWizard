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

test('釘選的標籤所在的群組不會再抽，其他群組照常抽', () => {
    const pose = sheets.poses.categories[0].subcategories[0].tags[0];
    for (let i = 0; i < 30; i += 1) assert.deepEqual(Randomizer.pickForSheet(sheets.poses, { rng: seeded(i), pinned: new Set([pose]) }), []);

    const accessories = sheets.costumes.categories.find(c => c.id === 'accessories').subcategories[0].tags;
    const outfitTag = sheets.costumes.categories[0].subcategories[0].tags[0];
    for (let i = 0; i < 30; i += 1) {
        const picks = Randomizer.pickForSheet(sheets.costumes, { rng: seeded(i), pinned: new Set([outfitTag]) });
        assert.equal(picks.length, 1);
        assert.ok(accessories.includes(picks[0]), '只會重抽配件');
    }
});

test('關閉 variety 時，釘選只會讓所在的子分類不抽', () => {
    const pose = sheets.poses.categories[0].subcategories[0].tags[0];
    const picks = Randomizer.pickForSheet(sheets.poses, { variety: false, pinned: new Set([pose]) });
    assert.equal(picks.length, 3);
    assert.ok(!picks.includes(pose));
});

test('exclusiveSiblings：group 內跨子分類互斥，single 只在子分類內互斥，其他不互斥', () => {
    const pose = sheets.poses.categories[0].subcategories[0].tags[0];
    const siblings = Randomizer.exclusiveSiblings(sheets.poses, pose);
    assert.equal(siblings.length, tagsOf(sheets.poses).length - 1, '姿勢整組互斥');
    assert.ok(!siblings.includes(pose));

    const shot = sheets['camera-composition'].categories.find(c => c.id === 'shot-size').subcategories[0];
    assert.deepEqual(Randomizer.exclusiveSiblings(sheets['camera-composition'], shot.tags[0]), shot.tags.slice(1), 'single 子分類內互斥');

    const lens = sheets['camera-composition'].categories.find(c => c.id === 'composition-lens').subcategories[0].tags[0];
    assert.deepEqual(Randomizer.exclusiveSiblings(sheets['camera-composition'], lens), [], '未宣告互斥的子分類可多選');
    const accessory = sheets.costumes.categories.find(c => c.id === 'accessories').subcategories[0].tags[0];
    assert.deepEqual(Randomizer.exclusiveSiblings(sheets.costumes, accessory), []);
    assert.deepEqual(Randomizer.exclusiveSiblings(sheets.poses, 'no such tag'), []);
});

test('exclusiveSiblings：服裝主體跨子分類互斥但不含配件', () => {
    const outfit = sheets.costumes.categories[0].subcategories[0].tags[0];
    const siblings = Randomizer.exclusiveSiblings(sheets.costumes, outfit);
    const accessories = sheets.costumes.categories.find(c => c.id === 'accessories').subcategories[0].tags;
    assert.ok(siblings.length > 5);
    siblings.forEach(tag => assert.ok(!accessories.includes(tag)));
});

test('標記 single 的子分類不應同時宣告 group，且每個 single 子分類至少有兩個標籤', () => {
    for (const sheet of Object.values(sheets)) {
        for (const sub of sheet.categories.flatMap(c => c.subcategories)) {
            if (sub.single) { assert.equal(sub.group, undefined, sub.id); assert.ok(sub.tags.length >= 2, sub.id); }
        }
    }
});

test('exclusiveHints：只標示尚未選取的互斥標籤，並指出會取代誰', () => {
    const poses = tagsOf(sheets.poses);
    const hints = Randomizer.exclusiveHints(sheets.poses, new Map([[poses[0], { pinned: false }]]));
    assert.equal(hints.size, poses.length - 1);
    assert.ok(!hints.has(poses[0]), '已選的標籤本身不會有提示');
    assert.deepEqual(hints.get(poses[5]), { replaces: [poses[0]], pinnedBy: [] });
});

test('exclusiveHints：互斥的已選標籤已釘選時標示 pinnedBy', () => {
    const poses = tagsOf(sheets.poses);
    const hints = Randomizer.exclusiveHints(sheets.poses, new Map([[poses[0], { pinned: true }]]));
    assert.deepEqual(hints.get(poses[3]).pinnedBy, [poses[0]]);
});

test('exclusiveHints：single 子分類與一般子分類', () => {
    const cam = sheets['camera-composition'];
    const shot = cam.categories.find(c => c.id === 'shot-size').subcategories[0].tags;
    const hints = Randomizer.exclusiveHints(cam, new Map([[shot[0], { pinned: false }]]));
    assert.deepEqual([...hints.keys()].sort(), shot.slice(1).sort(), '只有同一個 single 子分類的標籤');
    const lens = cam.categories.find(c => c.id === 'composition-lens').subcategories[0].tags[0];
    assert.equal(Randomizer.exclusiveHints(cam, new Map([[lens, { pinned: false }]])).size, 0, '可多選的子分類沒有提示');
});

test('exclusiveHints：同組已選多個標籤時列出全部會被取代的標籤', () => {
    const poses = tagsOf(sheets.poses);
    const hints = Randomizer.exclusiveHints(sheets.poses, new Map([[poses[0], { pinned: false }], [poses[1], { pinned: true }]]));
    assert.deepEqual(hints.get(poses[2]), { replaces: [poses[0], poses[1]], pinnedBy: [poses[1]] });
});

test('新增分類：生物、載具、材質、色彩配置、版面各抽一個，光影抽「方向＋氛圍」兩個', () => {
    for (const id of ['creatures', 'vehicles', 'materials', 'color-palettes', 'layouts']) {
        for (let i = 0; i < 40; i += 1) assert.equal(Randomizer.pickForSheet(sheets[id], { rng: seeded(i) }).length, 1, id);
    }
    for (let i = 0; i < 40; i += 1) {
        const picks = Randomizer.pickForSheet(sheets.lighting, { rng: seeded(i) });
        assert.equal(picks.length, 2);
        const [direction, mood] = sheets.lighting.categories.map(c => c.subcategories[0].tags);
        assert.equal(picks.filter(tag => direction.includes(tag)).length, 1);
        assert.equal(picks.filter(tag => mood.includes(tag)).length, 1);
    }
});

test('新增分類的互斥規則：光影在各自子分類內單選、配色與載具跨子分類互斥', () => {
    const [direction, mood] = sheets.lighting.categories.map(c => c.subcategories[0]);
    assert.deepEqual(Randomizer.exclusiveSiblings(sheets.lighting, direction.tags[0]), direction.tags.slice(1));
    assert.ok(!Randomizer.exclusiveSiblings(sheets.lighting, direction.tags[0]).includes(mood.tags[0]), '方向與氛圍可同時選');
    const palettes = tagsOf(sheets['color-palettes']);
    assert.equal(Randomizer.exclusiveSiblings(sheets['color-palettes'], palettes[0]).length, palettes.length - 1);
    const vehicles = tagsOf(sheets.vehicles);
    assert.equal(Randomizer.exclusiveSiblings(sheets.vehicles, vehicles[0]).length, vehicles.length - 1);
});

test('生物與載具重抽時避開上一次結果，釘選的生物會被保留', () => {
    let previous = new Set();
    for (let i = 0; i < 40; i += 1) {
        const picks = Randomizer.pickForSheet(sheets.creatures, { rng: seeded(i * 7 + 1), avoid: previous });
        picks.forEach(tag => assert.ok(!previous.has(tag)));
        previous = new Set(picks);
    }
    const dragon = 'fire-breathing dragon';
    assert.deepEqual(Randomizer.pickForSheet(sheets.creatures, { rng: seeded(3), pinned: new Set([dragon]) }), []);
});
