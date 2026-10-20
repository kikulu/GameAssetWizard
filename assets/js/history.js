/**
 * 選取歷史（復原／重做）：純函式模組，可在 Node 測試
 * ------------------------------------------------------------
 * 以「線性時間軸」記錄已選標籤的每一次變更。每個項目保存變更前後的快照，
 * 所以復原、重做與跳到任一步都只是切換游標位置。
 *
 *   位置 0：最初狀態；位置 k：第 k 個項目套用之後的狀態。
 *   cursor 指向目前位置；cursor 之後的項目是「已復原、可重做」的項目。
 *
 * 快照是 [{ prompt, weight, pinned }, …]（含順序）。標籤文字不存在歷史裡，
 * 只存標籤 id 與參數，所以切換語言後歷史清單會以新語言重新顯示。
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SelectionHistory = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function equalStates(a, b) {
        if (a.length !== b.length) return false;
        return a.every((item, i) => item.prompt === b[i].prompt && item.weight === b[i].weight && Boolean(item.pinned) === Boolean(b[i].pinned));
    }

    function clone(state) { return state.map(item => ({ prompt: item.prompt, weight: item.weight, pinned: Boolean(item.pinned) })); }

    /**
     * limit：最多保留幾個項目；coalesceMs：同一個 key 的連續變更（例如連按權重 ➕）合併成一步的時間窗。
     */
    function create({ limit = 50, coalesceMs = 1500 } = {}) {
        let entries = [];
        let cursor = 0;
        let lastKey = null;
        let lastAt = 0;

        const api = {
            /**
             * 記錄一次變更。before／after 相同時不記錄。
             * label：{ key, … } 描述這個動作（由介面端決定如何顯示）。
             * 回傳是否有新增或更新項目。
             */
            commit(label, before, after, { key = null, now = Date.now() } = {}) {
                if (equalStates(before, after)) return false;
                const canCoalesce = key !== null && key === lastKey && cursor === entries.length && cursor > 0 && now - lastAt <= coalesceMs;
                if (canCoalesce) {
                    const last = entries[entries.length - 1];
                    if (equalStates(last.before, after)) { entries.pop(); cursor -= 1; lastKey = null; }   // 合併後回到原狀：整步移除
                    else last.after = clone(after);
                    lastAt = now;
                    return true;
                }
                entries = entries.slice(0, cursor);                    // 有新動作就丟棄可重做的項目
                entries.push({ label, before: clone(before), after: clone(after) });
                if (entries.length > limit) entries.shift();
                cursor = entries.length;
                lastKey = key;
                lastAt = now;
                return true;
            },
            canUndo() { return cursor > 0; },
            canRedo() { return cursor < entries.length; },
            /** 復原一步，回傳要還原成的快照；沒有可復原的回傳 null。 */
            undo() {
                if (!api.canUndo()) return null;
                cursor -= 1; lastKey = null;
                return clone(entries[cursor].before);
            },
            redo() {
                if (!api.canRedo()) return null;
                const state = clone(entries[cursor].after);
                cursor += 1; lastKey = null;
                return state;
            },
            /** 跳到位置 position（0＝最初狀態），回傳該位置的快照；位置無效回傳 null。 */
            jumpTo(position) {
                if (!Number.isInteger(position) || position < 0 || position > entries.length) return null;
                cursor = position; lastKey = null;
                return position === 0 ? (entries[0] ? clone(entries[0].before) : null) : clone(entries[position - 1].after);
            },
            get cursor() { return cursor; },
            get size() { return entries.length; },
            /** 目前上一步／下一步的動作說明，供按鈕提示使用。 */
            get undoLabel() { return cursor > 0 ? entries[cursor - 1].label : null; },
            get redoLabel() { return cursor < entries.length ? entries[cursor].label : null; },
            /** 供介面列出：[{ label, applied }]，依時間順序（舊→新）。 */
            list() { return entries.map((entry, index) => ({ label: entry.label, applied: index < cursor })); },
            clear() { entries = []; cursor = 0; lastKey = null; }
        };
        return api;
    }

    return { create, equalStates };
}));
