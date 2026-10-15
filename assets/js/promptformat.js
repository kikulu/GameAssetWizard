/**
 * 依繪圖引擎輸出提示詞格式（純函式，可在 Node 測試）
 * ------------------------------------------------------------
 * 不同引擎吃的語法不同，同一組標籤與權重會被轉成：
 *  - sd（Stable Diffusion／SDXL／ComfyUI）：逗號分隔，權重為 (標籤:權重)，反向詞另放。
 *  - plain（Leonardo）：沒有權重語法，權重只影響順序，低於 0.5 的標籤省略。
 *  - midjourney：主體在前、參數在最後：--ar 寬:高、--v 版本、--no 反向詞（最多 10 項）。
 *      v6.x 支援 `::` 多重提示權重；V7 以後不支援，因此預設與 v7 只用順序表達權重。
 *  - sentence（Ideogram、DALL·E 3）：輸出自然語句；權重轉為「強調／淡淡帶過」。
 *      DALL·E 3 沒有反向提示詞，反向詞改寫成句尾的 Avoid 句子。
 * Midjourney 的版本與參數會改變，請以官方文件為準；要調整只需修改下方 ENGINES。
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PromptFormat = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const DEFAULT_ENGINE = 'sdxl';
    const ENGINES = {
        'sdxl': { family: 'sd' },
        'midjourney': { family: 'midjourney', version: null, multiPrompt: false },
        'midjourney-7': { family: 'midjourney', version: '7', multiPrompt: false },
        'midjourney-6': { family: 'midjourney', version: '6.1', multiPrompt: true },
        'leonardo': { family: 'plain' },
        'ideogram': { family: 'sentence', mergeNegative: false },
        'dalle3': { family: 'sentence', mergeNegative: true }
    };
    const MIN_WEIGHT = 0.5;       // 沒有權重語法的引擎：低於此權重的標籤省略
    const MJ_NO_LIMIT = 10;       // --no 最多保留的項目數
    const AVOID_LIMIT = 12;       // DALL·E 3 的 Avoid 句子最多保留的項目數

    const ENGINE_IDS = Object.keys(ENGINES);
    const family = engineId => (ENGINES[engineId] || ENGINES[DEFAULT_ENGINE]).family;

    /** 以逗號切分，但忽略括號 ( ) [ ] < > 內的逗號。 */
    function splitTerms(text) {
        const terms = [];
        let depth = 0, current = '';
        for (const ch of String(text || '')) {
            if ('([<'.includes(ch)) depth += 1;
            else if (')]>'.includes(ch)) depth = Math.max(0, depth - 1);
            if (ch === ',' && depth === 0) { terms.push(current); current = ''; }
            else current += ch;
        }
        terms.push(current);
        return terms.map(term => term.trim()).filter(Boolean);
    }

    function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

    /** 寬高轉成最簡整數比例（Midjourney 的 --ar 只接受整數）。 */
    function aspectRatio(width, height) {
        const w = Math.round(Number(width)), h = Math.round(Number(height));
        if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return null;
        const d = gcd(w, h);
        return `${w / d}:${h / d}`;
    }

    function roundWeight(weight) { return Math.round(weight * 10) / 10; }

    function baseParts(base) {
        const order = ['style', 'quality', 'background', 'template'];
        return order.map(key => (base && base[key]) || '').filter(Boolean);
    }

    /** 依權重由高到低（同權重保持原順序），並省略權重過低的標籤。 */
    function orderedTags(tags) {
        return tags
            .map((tag, index) => ({ ...tag, index }))
            .filter(tag => tag.weight >= MIN_WEIGHT)
            .sort((a, b) => (b.weight - a.weight) || (a.index - b.index));
    }

    function listJoin(items) {
        if (items.length <= 1) return items.join('');
        if (items.length === 2) return `${items[0]} and ${items[1]}`;
        return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
    }

    // ---------------------------------------------------------------- 各格式

    function formatSd(input) {
        const tokens = input.tags.map(tag => (tag.weight === 1 ? tag.prompt : `(${tag.prompt}:${tag.weight})`));
        const base = baseParts(input.base).join(', ');
        return { positive: tokens.length ? `${base}, ${tokens.join(', ')}` : base, negative: input.negative };
    }

    function formatPlain(input) {
        const tags = orderedTags(input.tags).map(tag => tag.prompt);
        return { positive: [baseParts(input.base).join(', '), ...tags].filter(Boolean).join(', '), negative: input.negative };
    }

    function formatMidjourney(input, config) {
        const params = [];
        const ratio = aspectRatio(input.width, input.height);
        if (ratio) params.push(`--ar ${ratio}`);
        if (config.version) params.push(`--v ${config.version}`);
        const noTerms = splitTerms(input.negative).slice(0, MJ_NO_LIMIT);
        if (noTerms.length) params.push(`--no ${noTerms.join(', ')}`);

        let body;
        const weighted = input.tags.filter(tag => tag.weight !== 1 && tag.weight >= 0.1);
        if (config.multiPrompt && weighted.length) {
            // v6.x：未加權的內容合成一段（權重 1），加權標籤各自成段並以 :: 標示權重
            const plain = [...input.tags.filter(tag => tag.weight === 1).map(tag => tag.prompt), ...baseParts(input.base)].join(', ');
            const segments = [];
            if (plain) segments.push(`${plain}::1`);
            weighted.forEach(tag => segments.push(`${tag.prompt}::${roundWeight(tag.weight)}`));
            body = segments.join(' ');
        } else {
            // 主體在前、風格在後；沒有 :: 時權重只影響順序
            body = [...orderedTags(input.tags).map(tag => tag.prompt), ...baseParts(input.base)].join(', ');
        }
        return { positive: [body, ...params].filter(Boolean).join(' '), negative: input.negative };
    }

    function formatSentence(input, config) {
        const included = orderedTags(input.tags);
        const normal = included.filter(tag => tag.weight >= 0.9 && tag.weight <= 1.1).map(tag => tag.prompt);
        const emphasized = included.filter(tag => tag.weight > 1.1).map(tag => tag.prompt);
        const subtle = included.filter(tag => tag.weight < 0.9).map(tag => tag.prompt);
        const subject = [...emphasized, ...normal];

        const sentences = [];
        sentences.push(subject.length ? `A game art illustration featuring ${listJoin(subject)}.` : 'A game art illustration.');
        if (emphasized.length) sentences.push(`Emphasize ${listJoin(emphasized)}.`);
        if (subtle.length) sentences.push(`Include a subtle hint of ${listJoin(subtle)}.`);
        const style = [input.base && input.base.style, input.base && input.base.template].filter(Boolean).join(', ');
        if (style) sentences.push(`Style: ${style}.`);
        if (input.base && input.base.quality) sentences.push(`Quality: ${input.base.quality}.`);
        if (input.base && input.base.background) sentences.push(`Background: ${input.base.background}.`);
        if (config.mergeNegative) {
            const avoid = splitTerms(input.negative).slice(0, AVOID_LIMIT);
            if (avoid.length) sentences.push(`Avoid ${listJoin(avoid)}.`);
        }
        return { positive: sentences.join(' '), negative: input.negative };
    }

    /**
     * input: { base: { style, quality, background, template }, tags: [{ prompt, weight }],
     *          negative: '逗號分隔字串', width, height }
     * 回傳：{ positive, negative, family, noteKey }
     */
    function format(engineId, input) {
        const id = ENGINES[engineId] ? engineId : DEFAULT_ENGINE;
        const config = ENGINES[id];
        const normalized = { base: input.base || {}, tags: input.tags || [], negative: input.negative || '', width: input.width, height: input.height };
        let result;
        if (config.family === 'midjourney') result = formatMidjourney(normalized, config);
        else if (config.family === 'sentence') result = formatSentence(normalized, config);
        else if (config.family === 'plain') result = formatPlain(normalized);
        else result = formatSd(normalized);
        return { ...result, family: config.family, noteKey: `engine.note.${id}` };
    }

    return { ENGINES, ENGINE_IDS, DEFAULT_ENGINE, family, format, aspectRatio, splitTerms };
}));
