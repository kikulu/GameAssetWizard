# 依繪圖引擎輸出提示詞格式

主控面板「🖌️ 繪圖引擎」決定**畫面上提示詞的輸出格式**。同一組標籤與權重會被轉成各引擎吃得懂的語法。轉換邏輯在 `assets/js/promptformat.js`（純函式，有單元測試）。

> **本機產圖不受影響**：Draw Things、SD WebUI、ComfyUI 一律使用 Stable Diffusion 格式，即使你選了 Midjourney。

## 各引擎輸出

範例輸入：標籤 `knight`（1.0）、`battle stance`（1.3）、`cape`（0.6）、`dust`（0.3），尺寸 1024×1536。

| 引擎 | 輸出特點 |
| --- | --- |
| **Stable Diffusion XL**（預設） | 基礎提示詞在前；權重寫成 `(battle stance:1.3)`；反向詞放在 Negative 欄位 |
| **Midjourney**（預設版本） | 主體在前、風格在後；依權重排序、低於 0.5 的標籤省略；參數放最後：`--ar 2:3 --no ...`；不加 `--v`、不用 `::` |
| **Midjourney v7** | 同上，並加上 `--v 7` |
| **Midjourney v6.1** | 權重轉為 `::`：`knight, 風格…::1 battle stance::1.3 cape::0.6`，並加上 `--v 6.1` |
| **Leonardo.Ai** | 沒有權重語法：依權重排序，低於 0.5 的標籤省略；反向詞放在 Negative prompt 欄位 |
| **Ideogram** | 自然語句：`A game art illustration featuring … Emphasize … Include a subtle hint of … Style: … Quality: … Background: ….` |
| **DALL·E 3** | 同上，並把反向詞改寫成句尾的 `Avoid …` 句子（DALL·E 3 沒有反向提示詞） |

### Midjourney 參數規則

- 參數一律放在文字之後，且參數之後不能再有文字。
- `--ar` 由尺寸欄位換算成**最簡整數比例**（`1024×1536` → `2:3`，`1920×1080` → `16:9`）；改尺寸或選尺寸預設時會自動更新。
- `--no` 最多保留 10 項反向詞（預設反向詞很長，全部帶入通常沒有幫助）。
- **V7 以後不支援 `::` 多重提示權重**，因此預設與 v7 只用順序表達權重；只有 v6.x 使用 `::`。

> ⚠️ Midjourney 的版本與參數經常變動。這些規則依 2026 年 10 月可查到的文件與第三方整理（目前預設版本為 V8.2；`--v` 可釘選舊版本）。實際行為以 [Midjourney 官方文件](https://docs.midjourney.com) 為準；若有出入，請修改 `promptformat.js` 內的 `ENGINES` 並回報。

### 沒有權重語法時的權重處理

Leonardo、Midjourney（預設／v7）沒有權重語法，所以：

- 權重只影響**輸出順序**（高的在前），
- 權重 **< 0.5** 的標籤會省略。

自然語句引擎（Ideogram、DALL·E 3）把 `> 1.1` 的標籤放進 `Emphasize …`，`< 0.9` 的放進 `Include a subtle hint of …`。

## 新增或調整引擎

編輯 `assets/js/promptformat.js`：

```js
const ENGINES = {
    'midjourney-7': { family: 'midjourney', version: '7', multiPrompt: false },
    // 新增：{ family: 'sd' | 'plain' | 'midjourney' | 'sentence', ... }
};
```

接著：

1. 在 `index.html` 的 `#dt-model` 加入 `<option value="引擎id">`。
2. 在四個語言的 `ui.json` 加入 `engine.note.<引擎id>`（顯示在引擎選單下方的說明）。
3. 在 `tests/promptformat.test.js` 補測試，執行 `npm run check` 與 `npm test`。

## 與既有資料的差異（v1.6.0）

- 引擎選單的值從關鍵字字串改為 id（如 `midjourney-7`），並**不再把引擎名稱當關鍵字塞進提示詞**（例如先前會出現 `Midjourney v6 game art style`、`SDXL, game asset lora`）。
- 舊版匯出的檔案與連結不受影響（工作階段在 v1.6.0 才出現）。
