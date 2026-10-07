# 詞庫與設定檔格式

所有創作資料都在 `config_sheets/`，與程式碼分離，編輯 JSON 即可擴充。檔案一律使用 UTF-8。

## 分類詞庫（`<分類名>.json`）

```json
{
  "sheetName": "特效",
  "data": {
    "魔法特效": {
      "元素特效": [
        { "en": "fire magic effect", "cn": "火焰魔法特效" }
      ]
    }
  }
}
```

- 結構為 `sheetName` → `data` → 大類 → 小類 → 標籤陣列。
- 每個標籤都必須有 `en`（實際送進提示詞）與 `cn`（介面顯示說明）。
- 新增分類檔後，需把檔名（不含 `.json`）加入 `assets/js/app.js` 的 `SHEET_FILES`。

## `base_settings.json`

| 欄位 | 說明 |
| --- | --- |
| `baseNegative` | 預設的基礎反向提示詞 |

## `profiles.json`

以 `mobile`、`mobile2d`、`mobile3d`、`steam`、`steam2d`、`steam3d` 為鍵，每組包含：

| 欄位 | 說明 |
| --- | --- |
| `label` / `platformLabel` / `dimensionLabel` | 介面顯示名稱 |
| `styleTags` | 此模式附加的風格提示詞 |
| `defaultRandomSheets` | 隨機抽卡預設勾選的分類名稱 |
| `presets` | 尺寸預設陣列：`{ "label", "w", "h", "note" }` |

## `templates.json`

`{ "templates": [ … ] }`，每筆需包含：

| 欄位 | 說明 |
| --- | --- |
| `id` | 唯一識別碼（建議 kebab-case） |
| `gameType` / `styleType` | 遊戲類型與風格類型（用於範本篩選） |
| `label` / `description` | 顯示名稱與說明 |
| `platform` | `mobile` 或 `steam` |
| `dimension` | `2d` 或 `3d` |
| `prompt` / `negative` | 範本提供的提示詞基礎層與反向詞 |

## 驗證

修改後請執行 `npm run check`，並在瀏覽器確認詞庫載入、範本套用與提示詞組合正常。（JSON schema 自動驗證列於 [Roadmap](ROADMAP.md)。）

> 這裡的「詞庫」是創作標籤；與產圖用的「風格預設」（見 [風格一致化流程](STYLE_CONSISTENCY.md)）是不同概念。
