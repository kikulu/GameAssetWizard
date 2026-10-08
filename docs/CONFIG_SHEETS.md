# 詞庫與設定檔格式

創作資料與程式碼分離，編輯 JSON 即可擴充。檔案一律使用 UTF-8。資料分成兩層：

- `config_sheets/`：**語言中立**的結構、提示詞與數值。
- `locales/<語言>/`：各語言的顯示文字，見 [多語系與翻譯指南](I18N.md)。

## 分類清單（`config_sheets/index.json`）

```json
{ "sheets": ["camera-composition", "poses", "costumes"] }
```

依序列出所有分類 id（也是檔名）；畫面上的順序即此順序。

## 分類詞庫（`config_sheets/<sheetId>.json`）

```json
{
  "id": "effects",
  "categories": [
    {
      "id": "magic",
      "subcategories": [
        { "id": "elemental", "tags": ["fire magic effect", "ice frost effect"] }
      ]
    }
  ]
}
```

- 結構為 `id` → `categories[]` → `subcategories[]` → `tags[]`（提示詞字串）。
- 所有 id 使用小寫英文與連字號（kebab-case），檔名須等於 `id`。
- **標籤就是實際送進提示詞的英文原文**，且在全部分類中必須唯一（顯示文字以它為鍵）。
- 顯示名稱不寫在這裡，而是在每個語言的 `locales/<語言>/tags/<sheetId>.json`。

### 新增分類或標籤的步驟

1. 建立／修改 `config_sheets/<sheetId>.json`，新分類加入 `index.json`。
2. 在每個語言的 `tags/<sheetId>.json` 補上 `name`、`categories`、`subcategories`、`tags` 的顯示文字。
3. 執行 `npm run i18n:check`，確認沒有缺漏。

## `base_settings.json`

| 欄位 | 說明 |
| --- | --- |
| `baseNegative` | 預設的基礎反向提示詞 |

## `profiles.json`

以 `mobile`、`mobile2d`、`mobile3d`、`steam`、`steam2d`、`steam3d` 為鍵，每組包含：

| 欄位 | 說明 |
| --- | --- |
| `styleTags` | 此模式附加的風格提示詞 |
| `defaultRandomSheets` | 隨機抽卡預設勾選的分類 id |
| `presets` | 尺寸預設陣列：`{ "id", "w", "h" }` |

模式名稱、平台與尺寸預設的標籤／說明在 `locales/<語言>/profiles.json`：`profiles.<模式>.{label,platform,dimension}` 與 `presets.<預設id>.{label,note}`。預設 id 在不同模式間共用（同一個 id 代表相同用途與尺寸）。

## `templates.json`

`{ "templates": [ … ] }`，每筆需包含：

| 欄位 | 說明 |
| --- | --- |
| `id` | 唯一識別碼（kebab-case） |
| `gameType` / `styleType` | 遊戲類型與風格類型的 id（用於篩選） |
| `platform` | `mobile` 或 `steam` |
| `dimension` | `2d` 或 `3d` |
| `prompt` / `negative` | 範本提供的提示詞基礎層與反向詞 |

名稱與說明在 `locales/<語言>/templates.json`：`gameTypes`、`styleTypes`、`templates.<id>.{label,description}`。

## 驗證

修改後請執行 `npm run check`（含 `i18n:check`）與 `npm test`，並在瀏覽器切換各語言確認載入、範本套用與提示詞組合正常。（JSON schema 自動驗證列於 [Roadmap](ROADMAP.md)。）

> 這裡的「詞庫」是創作標籤；與產圖用的「風格預設」（見 [風格一致化流程](STYLE_CONSISTENCY.md)）是不同概念。
