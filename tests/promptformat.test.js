'use strict';
// 依繪圖引擎輸出提示詞格式：npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const PromptFormat = require('../assets/js/promptformat.js');

const input = {
    base: { style: 'mobile game art, clean asset design', quality: 'masterpiece, best quality', background: 'clean studio background', template: '' },
    tags: [{ prompt: 'knight', weight: 1 }, { prompt: 'battle stance', weight: 1.3 }, { prompt: 'cape', weight: 0.6 }, { prompt: 'dust', weight: 0.3 }],
    negative: 'watermark, text, blurry, low quality',
    width: 1024, height: 1536
};
const fmt = (engine, patch = {}) => PromptFormat.format(engine, { ...input, ...patch });

test('Stable Diffusion：保留 (標籤:權重) 語法，權重 1 的標籤不加括號，反向詞原樣輸出', () => {
    const out = fmt('sdxl');
    assert.equal(out.positive, 'mobile game art, clean asset design, masterpiece, best quality, clean studio background, knight, (battle stance:1.3), (cape:0.6), (dust:0.3)');
    assert.equal(out.negative, input.negative);
    assert.equal(out.family, 'sd');
});

test('沒有標籤時只輸出基礎提示詞；未知引擎回到 Stable Diffusion', () => {
    assert.equal(fmt('sdxl', { tags: [] }).positive, 'mobile game art, clean asset design, masterpiece, best quality, clean studio background');
    assert.equal(fmt('no-such-engine').positive, fmt('sdxl').positive);
});

test('Midjourney：參數在最後，--ar 為最簡整數比例，--no 取代反向詞，預設版本不加 --v', () => {
    const out = fmt('midjourney');
    assert.match(out.positive, / --ar 2:3 --no watermark, text, blurry, low quality$/);
    assert.ok(!out.positive.includes('--v'));
    assert.ok(!out.positive.includes('::'));
    assert.ok(out.positive.startsWith('battle stance, knight, cape'), '主體在前、依權重排序、低於 0.5 的省略');
    assert.ok(!out.positive.includes('dust'));
    assert.equal(out.noteKey, 'engine.note.midjourney');
});

test('Midjourney v7 加上 --v 7 且不使用 ::', () => {
    const out = fmt('midjourney-7');
    assert.match(out.positive, / --ar 2:3 --v 7 --no /);
    assert.ok(!out.positive.includes('::'));
});

test('Midjourney v6.1 使用 :: 權重，未加權內容合成一段', () => {
    const out = fmt('midjourney-6');
    assert.ok(out.positive.includes('clean studio background::1 battle stance::1.3 cape::0.6 dust::0.3'));
    assert.match(out.positive, / --ar 2:3 --v 6.1 --no /);
    assert.equal(fmt('midjourney-6', { tags: [{ prompt: 'knight', weight: 1 }] }).positive.includes('::'), false, '沒有加權標籤時不使用 ::');
});

test('Midjourney 的 --no 最多 10 項，沒有反向詞或尺寸時省略對應參數', () => {
    const many = Array.from({ length: 15 }, (_, i) => `n${i}`).join(', ');
    const out = fmt('midjourney', { negative: many });
    assert.equal(out.positive.split('--no ')[1].split(', ').length, 10);
    const bare = fmt('midjourney', { negative: '', width: 0, height: 0 }).positive;
    assert.ok(!bare.includes('--no') && !bare.includes('--ar'));
});

test('aspectRatio 化為最簡比例，無效輸入回傳 null', () => {
    assert.equal(PromptFormat.aspectRatio(1024, 1024), '1:1');
    assert.equal(PromptFormat.aspectRatio(1920, 1080), '16:9');
    assert.equal(PromptFormat.aspectRatio(616, 353), '616:353');
    assert.equal(PromptFormat.aspectRatio(0, 10), null);
    assert.equal(PromptFormat.aspectRatio('x', 10), null);
});

test('Leonardo：不使用權重語法，依權重排序並省略過低權重', () => {
    const out = fmt('leonardo');
    assert.ok(!/[()]|::|--/.test(out.positive));
    assert.ok(out.positive.endsWith('battle stance, knight, cape'));
    assert.equal(out.negative, input.negative);
});

test('Ideogram 與 DALL·E 3 輸出自然語句；只有 DALL·E 3 會把反向詞改寫成 Avoid', () => {
    const ideogram = fmt('ideogram'), dalle = fmt('dalle3');
    for (const out of [ideogram, dalle]) {
        assert.ok(out.positive.startsWith('A game art illustration featuring battle stance and knight.'));
        assert.ok(out.positive.includes('Emphasize battle stance.'));
        assert.ok(out.positive.includes('Include a subtle hint of cape.'));
        assert.ok(!out.positive.includes('dust'));
        assert.ok(!/\(|::|--/.test(out.positive));
    }
    assert.ok(!ideogram.positive.includes('Avoid'));
    assert.ok(dalle.positive.endsWith('Avoid watermark, text, blurry, and low quality.'));
});

test('沒有標籤時自然語句仍然完整', () => {
    assert.ok(fmt('dalle3', { tags: [] }).positive.startsWith('A game art illustration. Style:'));
});

test('splitTerms 忽略括號內的逗號', () => {
    assert.deepEqual(PromptFormat.splitTerms('a, (b, c:1.2), <lora:x:1>, d'), ['a', '(b, c:1.2)', '<lora:x:1>', 'd']);
});

test('每個引擎都有對應的說明文字鍵', () => {
    for (const id of PromptFormat.ENGINE_IDS) assert.equal(fmt(id).noteKey, `engine.note.${id}`);
});
