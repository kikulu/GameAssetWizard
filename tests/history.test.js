'use strict';
// 選取歷史（復原／重做）：npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { create, equalStates } = require('../assets/js/history.js');

const S = (...prompts) => prompts.map(prompt => ({ prompt, weight: 1, pinned: false }));
const names = state => state.map(item => item.prompt).join(',');

test('commit 記錄變更，復原與重做回到正確的快照', () => {
    const h = create();
    assert.equal(h.canUndo(), false);
    h.commit({ key: 'add' }, S(), S('a'));
    h.commit({ key: 'add' }, S('a'), S('a', 'b'));
    assert.equal(h.size, 2); assert.equal(h.cursor, 2);
    assert.equal(names(h.undo()), 'a');
    assert.equal(names(h.undo()), '');
    assert.equal(h.undo(), null);
    assert.equal(names(h.redo()), 'a');
    assert.equal(names(h.redo()), 'a,b');
    assert.equal(h.redo(), null);
});

test('前後相同的變更不會被記錄', () => {
    const h = create();
    assert.equal(h.commit({ key: 'x' }, S('a'), S('a')), false);
    assert.equal(h.size, 0);
});

test('順序、權重與釘選都算狀態的一部分', () => {
    assert.equal(equalStates(S('a', 'b'), S('b', 'a')), false);
    assert.equal(equalStates([{ prompt: 'a', weight: 1, pinned: false }], [{ prompt: 'a', weight: 1.1, pinned: false }]), false);
    assert.equal(equalStates([{ prompt: 'a', weight: 1, pinned: false }], [{ prompt: 'a', weight: 1, pinned: true }]), false);
    assert.equal(equalStates([{ prompt: 'a', weight: 1 }], [{ prompt: 'a', weight: 1, pinned: false }]), true);
});

test('復原後出現新動作，會丟棄可重做的項目', () => {
    const h = create();
    h.commit({}, S(), S('a')); h.commit({}, S('a'), S('a', 'b'));
    h.undo();
    assert.equal(h.canRedo(), true);
    h.commit({}, S('a'), S('a', 'c'));
    assert.equal(h.canRedo(), false);
    assert.equal(h.size, 2);
    assert.equal(names(h.undo()), 'a');
});

test('超過上限時丟棄最舊的項目', () => {
    const h = create({ limit: 3 });
    for (let i = 0; i < 6; i += 1) h.commit({ i }, S(...Array.from({ length: i }, (_, n) => `t${n}`)), S(...Array.from({ length: i + 1 }, (_, n) => `t${n}`)));
    assert.equal(h.size, 3); assert.equal(h.cursor, 3);
    h.undo(); h.undo(); const oldest = h.undo();
    assert.equal(oldest.length, 3, '最舊的可復原狀態是第 4 次變更之前');
    assert.equal(h.undo(), null);
});

test('同一個 key 在時間窗內的連續變更合併成一步；超過時間窗或不同 key 則分開', () => {
    const h = create({ coalesceMs: 1000 });
    const w = n => [{ prompt: 'a', weight: n, pinned: false }];
    h.commit({ key: 'w:a' }, w(1), w(1.1), { key: 'w:a', now: 0 });
    h.commit({ key: 'w:a' }, w(1.1), w(1.2), { key: 'w:a', now: 500 });
    h.commit({ key: 'w:a' }, w(1.2), w(1.3), { key: 'w:a', now: 900 });
    assert.equal(h.size, 1);
    assert.equal(h.undo()[0].weight, 1, '一次復原回到第一次調整之前');
    h.redo();
    assert.equal(h.redo(), null);
    h.commit({ key: 'w:a' }, w(1.3), w(1.4), { key: 'w:a', now: 5000 });
    assert.equal(h.size, 2, '超過時間窗不合併');
    h.commit({ key: 'w:b' }, w(1.4), w(1.5), { key: 'w:b', now: 5100 });
    assert.equal(h.size, 3, '不同 key 不合併');
});

test('合併後回到原狀時整步移除', () => {
    const h = create();
    const w = n => [{ prompt: 'a', weight: n, pinned: false }];
    h.commit({}, w(1), w(1.1), { key: 'w', now: 0 });
    h.commit({}, w(1.1), w(1), { key: 'w', now: 100 });
    assert.equal(h.size, 0); assert.equal(h.canUndo(), false);
});

test('復原後不會把新動作合併進舊項目', () => {
    const h = create();
    const w = n => [{ prompt: 'a', weight: n, pinned: false }];
    h.commit({}, w(1), w(1.1), { key: 'w', now: 0 });
    h.undo();
    h.commit({}, w(1), w(0.9), { key: 'w', now: 50 });
    assert.equal(h.size, 1);
    assert.equal(h.undo()[0].weight, 1);
});

test('jumpTo 可跳到任一位置（0＝最初狀態）並設定游標', () => {
    const h = create();
    h.commit({}, S(), S('a')); h.commit({}, S('a'), S('a', 'b')); h.commit({}, S('a', 'b'), S('a', 'b', 'c'));
    assert.equal(names(h.jumpTo(0)), '');
    assert.equal(h.cursor, 0);
    assert.equal(names(h.jumpTo(2)), 'a,b');
    assert.equal(h.cursor, 2);
    assert.equal(names(h.jumpTo(3)), 'a,b,c');
    assert.equal(h.jumpTo(4), null);
    assert.equal(h.jumpTo(-1), null);
    assert.equal(h.jumpTo(1.5), null);
});

test('list 與 undoLabel／redoLabel 反映游標位置', () => {
    const h = create();
    h.commit({ key: 'one' }, S(), S('a')); h.commit({ key: 'two' }, S('a'), S());
    assert.deepEqual(h.list().map(x => [x.label.key, x.applied]), [['one', true], ['two', true]]);
    assert.equal(h.undoLabel.key, 'two'); assert.equal(h.redoLabel, null);
    h.undo();
    assert.deepEqual(h.list().map(x => x.applied), [true, false]);
    assert.equal(h.undoLabel.key, 'one'); assert.equal(h.redoLabel.key, 'two');
    h.clear();
    assert.equal(h.size, 0); assert.equal(h.undoLabel, null);
});

test('快照被複製，後續修改原陣列不會影響歷史', () => {
    const h = create();
    const before = S('a'), after = S('a', 'b');
    h.commit({}, before, after);
    before[0].prompt = 'changed'; after.push({ prompt: 'z', weight: 1, pinned: false });
    assert.equal(names(h.undo()), 'a');
    assert.equal(names(h.redo()), 'a,b');
});
