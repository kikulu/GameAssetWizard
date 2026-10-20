/**
 * 隨機抽卡邏輯（純函式，可在 Node 測試）
 * ------------------------------------------------------------
 * 舊作法是「每個子分類抽一個」，導致姿勢、服裝、場景等互斥內容一次出現好幾個。
 * 現在以「群組」為單位：結構檔中帶有相同 `group` 的子分類互為替代，整組只抽一個；
 * 沒有 group 的子分類各自成一組（例如髮型與髮色、種族與職業）。
 * 抽取時先均勻挑子分類，再挑標籤，避免標籤數量多的子分類佔盡機會，
 * 並會盡量避開 avoid 內的標籤（上一次的結果），讓連續抽卡不重複。
 * 釘選（pinned）的標籤會被保留：只要某個群組已含有釘選標籤，該群組就不再另外抽。
 * 手動選取時的「同群組只留一個」使用 exclusiveSiblings：宣告了 group 的子分類互為替代，
 * 標記 single 的子分類內只能選一個；其他子分類（例如配件）可以多選。
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

    /**
     * 手動選取時與 prompt 互斥的其他標籤：
     *  - 子分類帶有 group：同分類檔內同 group 的所有標籤（跨子分類）。
     *  - 子分類標記 single：同一個子分類內的其他標籤。
     *  - 其他：沒有互斥（回傳空陣列）。
     */
    function exclusiveSiblings(sheet, prompt) {
        let owner = null;
        for (const category of sheet.categories) {
            for (const sub of category.subcategories) if (sub.tags.includes(prompt)) owner = sub;
        }
        if (!owner) return [];
        if (owner.group) {
            return sheet.categories.flatMap(category => category.subcategories)
                .filter(sub => sub.group === owner.group)
                .flatMap(sub => sub.tags)
                .filter(tag => tag !== prompt);
        }
        if (owner.single) return owner.tags.filter(tag => tag !== prompt);
        return [];
    }

    /**
     * 手動互斥模式下，給「尚未選取的互斥標籤」的提示：
     *   selection：Map(提示詞 → { pinned })，只需包含這個分類的已選標籤。
     * 回傳 Map(提示詞 → { replaces: [會被取代的已選標籤], pinnedBy: [其中已釘選的] })；
     * pinnedBy 不是空的代表釘選優先，這個標籤無法加入。
     */
    function exclusiveHints(sheet, selection) {
        const hints = new Map();
        for (const [selected, data] of selection) {
            for (const rival of exclusiveSiblings(sheet, selected)) {
                if (selection.has(rival)) continue;
                if (!hints.has(rival)) hints.set(rival, { replaces: [], pinnedBy: [] });
                const hint = hints.get(rival);
                hint.replaces.push(selected);
                if (data && data.pinned) hint.pinnedBy.push(selected);
            }
        }
        return hints;
    }

    /** 這個群組是否已含有釘選的標籤。 */
    function hasPinned(group, pinned) {
        return group.subs.some(sub => sub.tags.some(tag => pinned.has(tag)));
    }

    /** 回傳這個分類本次抽到的標籤陣列（每組一個）；已有釘選標籤的群組不抽。 */
    function pickForSheet(sheet, { variety = true, rng = Math.random, avoid = new Set(), pinned = new Set() } = {}) {
        return buildGroups(sheet, { variety })
            .filter(group => !hasPinned(group, pinned))
            .map(group => pickFromGroup(group, { rng, avoid }))
            .filter(Boolean);
    }

    return { buildGroups, pickFromGroup, pickForSheet, hasPinned, exclusiveSiblings, exclusiveHints };
}));
