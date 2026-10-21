# 標籤庫總覽與撰寫規範

目前有 **18 個分類、361 個提示詞**。結構在 `config_sheets/`，各語言顯示文字在 `locales/<語言>/tags/`（格式見 [詞庫與設定檔格式](CONFIG_SHEETS.md)）。

## 分類一覽

| 分類 id | 名稱 | 子分類 | 提示詞 | 互斥規則 |
| --- | --- | --- | --- | --- |
| `camera-composition` | 鏡頭構圖 / Camera & Composition | 3 | 22 | single：`shot-size`、`viewpoint` |
| `poses` | 動作姿勢 / Actions & Poses | 4 | 26 | group：`pose` |
| `costumes` | 服裝造型 / Costumes & Outfits | 4 | 23 | group：`outfit` |
| `expressions` | 表情情緒 / Expressions & Emotions | 3 | 17 | group：`expression` |
| `races-classes` | 身份種族 / Races & Classes | 2 | 18 | single：`fantasy-races`、`classes-roles` |
| `hair` | 髮型髮色 / Hairstyle & Hair Color | 2 | 16 | single：`hair-color` |
| `items-gear` | 道具裝備 / Items & Gear | 4 | 22 | group：`weapon` |
| `environments` | 場景環境 / Scenes & Environments | 4 | 20 | group：`location` |
| `effects` | 特效 / Visual Effects | 3 | 14 | group：`main-effect` |
| `ui-elements` | UI元素 / UI Elements | 3 | 14 | group：`ui-element` |
| `icons-badges` | 圖示徽章 / Icons & Badges | 3 | 13 | group：`icon` |
| `store-marketing` | 商店行銷 / Store & Marketing | 3 | 13 | group：`deliverable` |
| `creatures` | 生物與怪物 / Creatures & Monsters | 4 | 34 | group：`creature` |
| `vehicles` | 載具 / Vehicles | 5 | 28 | group：`vehicle` |
| `materials` | 材質 / Materials | 3 | 24 | group：`main-material` |
| `lighting` | 光影 / Lighting | 2 | 17 | single：`light-direction`、`light-mood` |
| `color-palettes` | 色彩配置 / Color Palettes | 2 | 21 | group：`palette` |
| `layouts` | 版面與構圖範例 / Layouts & Composition Examples | 3 | 19 | group：`layout` |

互斥規則的意義見 [隨機抽卡](RANDOM_PICK.md)：同一個 `group` 的子分類互為替代（隨機抽卡整組只抽一個；手動「同群組只留一個」時互相取代）；`single` 子分類內只能選一個；沒有標記的子分類可多選。

## 預設的隨機抽卡分類

六種模式的「隨機抽卡預設勾選」各自只有 3 個分類，取自種族職業、服裝造型、動作姿勢、髮型髮色、道具裝備與場景環境（見 `profiles.json` 的 `defaultRandomSheets`）。**生物與怪物、載具、材質、光影、色彩配置、版面與構圖範例預設不勾選**，需要時在「設定隨機抽卡包含的分類」自行勾選，或點該分類標題上的 🎲 單獨抽。

## 撰寫提示詞的規範

新增或修改標籤時請遵守：

1. **英文、小寫、簡短**：用繪圖模型常見的名詞片語，不含句號與引擎專用語法。優先 1～4 個英文字；除專有名詞外一律小寫（例如 `golden hour sunlight`）。
2. **不含權重與參數**：不要寫 `(tag:1.2)`、`::`、`--ar` 等語法，格式由[依繪圖引擎輸出提示詞格式](PROMPT_FORMATS.md)處理。
3. **全專案唯一**：同一個提示詞不能出現在兩個地方（`npm run validate` 會檢查）。要表達相近概念請換一個說法，例如 `isometric view`（鏡頭視角）與 `isometric diorama`（版面）。
4. **不使用受著作權或商標保護的名稱**：不要寫角色、作品、品牌或藝術家名字；用通用描述代替。
5. **一個標籤一個概念**：避免把多個概念塞進同一個標籤；需要組合時讓使用者選多個標籤。
6. **放在對的子分類**：互斥的標籤放同一個子分類或同一個 `group`；可以並存的標籤（例如光線方向與光線氛圍）放不同子分類並各自標 `single`。
7. **四種語言一起補齊**：繁中、英文（等於提示詞本身）、日文、韓文，翻譯要簡短並貼近遊戲美術業界用語；`npm run i18n:check` 會檢查缺漏。

## 新增分類的步驟

1. 建立 `config_sheets/<id>.json` 並加入 `index.json`（id 用 kebab-case，檔名等於 id）。
2. 為每個子分類決定 `group`／`single`（或不標記）。
3. 在四個語言的 `locales/<語言>/tags/<id>.json` 補齊 `name`、`categories`、`subcategories`、`tags`。
4. 執行 `npm run validate`、`npm run i18n:check`、`npm test`、`npm run i18n:table`；在瀏覽器切換四種語言確認顯示。
5. 若希望預設抽卡就包含它，才修改 `profiles.json` 的 `defaultRandomSheets`（會改變既有使用者的預設結果，請在 CHANGELOG 標註）。
