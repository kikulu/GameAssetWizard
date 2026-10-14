/**
 * 隨機抽卡邏輯（純函式，可在 Node 測試）
 * ------------------------------------------------------------
 * 舊作法是「每個子分類抽一個」，導致姿勢、服裝、場景等互斥內容一次出現好幾個。
 * 現在以「群組」為單位：結構檔中帶有相同 `group` 的子分類互為替代，整組只抽一個；
 * 沒有 group 的子分類各自成一組（例如髮型與髮色、種族與職業）。
 * 抽取時先均勻挑子分類，再挑標籤，避免標籤數量多的子分類佔盡機會，
 * 並會盡量避開 avoid 內的標籤（上一次的結果），讓連續抽卡不重複。
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Randomizer = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /** 將分類拆成群組：[{ key, subs: [{ id, tags }] }]；variety 關閉時每個子分類各自成組（舊行為）。 */
    function buildGroups(sheet, { variety = true } = {}) {
        const groups = new Map();
        for (const category of sheet.categories) {
            for (const sub of category.subcategories) {
                if (!sub.tags || sub.tags.length === 0) continue;
                const key = variety && sub.group ? `group:${sub.group}` : `sub:${category.id}/${sub.id}`;
                if (!groups.has(key)) groups.set(key, { key, subs: [] });
                groups.get(key).subs.push({ id: sub.id, tags: sub.tags });
            }
        }
        return [...groups.values()];
    }

    function choose(list, rng) { return list[Math.floor(rng() * list.length) % list.length]; }

    /** 從一個群組抽一個標籤；盡量避開 avoid，沒有其他選擇時才允許重複。 */
    function pickFromGroup(group, { rng = Math.random, avoid = new Set() } = {}) {
        const fresh = group.subs.filter(sub => sub.tags.some(tag => !avoid.has(tag)));
        const subs = fresh.length ? fresh : group.subs;
        if (!subs.length) return null;
        const sub = choose(subs, rng);
        const candidates = sub.tags.filter(tag => !avoid.has(tag));
        return choose(candidates.length ? candidates : sub.tags, rng);
    }

    /** 回傳這個分類本次抽到的標籤陣列（每組一個）。 */
    function pickForSheet(sheet, { variety = true, rng = Math.random, avoid = new Set() } = {}) {
        return buildGroups(sheet, { variety }).map(group => pickFromGroup(group, { rng, avoid })).filter(Boolean);
    }

    return { buildGroups, pickFromGroup, pickForSheet };
}));
