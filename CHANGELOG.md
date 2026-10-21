# Changelog

格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本遵循[語意化版本](https://semver.org/lang/zh-TW/)。

## [1.9.0] — 2026-10-14

### Added
- **標籤庫擴充**：新增 6 個分類、143 個提示詞（總計 18 個分類、361 個）——生物與怪物、載具、材質、光影、色彩配置、版面與構圖範例。全部提示詞在全專案唯一，並有繁中、English、日本語、한국어標籤（日韓為機器輔助起稿，待母語校對）。
- 互斥群組：生物（`creature`）、載具（`vehicle`）、主材質（`main-material`）、配色（`palette`）、版面（`layout`）每次隨機只抽一個；光影的「光線方向」與「光線氛圍」各為 `single`，隨機抽出一個方向加一個氛圍。
- `docs/TAG_LIBRARY.md`：分類一覽、互斥規則、預設抽卡分類與撰寫提示詞的規範。
- 新分類的單元測試；`npm test` 現有 72 項測試。

### Changed
- 六種模式的預設隨機抽卡分類**維持不變**，新分類預設不勾選（需要時自行勾選或按分類的 🎲）。
- 資料驗證預期更新為 18 個分類、361 個提示詞。

## [1.8.0] — 2026-10-14

### Added
- **復原／重做與歷史清單**：已選標籤的加入、剔除、權重、釘選、重抽、清空與載入工作階段都會記錄；↩／↪ 按鈕、`Ctrl+Z`／`Ctrl+Shift+Z`／`Ctrl+Y`（文字欄位內保留原生復原），以及可展開、可跳到任一步的「🕘 歷史」清單。連按權重會合併成一步，最多保留 50 步，歷史只存在記憶體。詳見 `docs/HISTORY.md`。
- **鎖定快捷操作**：🔒 全部鎖定、🔓 全部解除、🔒 鎖定已選內容的分類（加入既有鎖定）；無作用時自動停用。
- **互斥衝突提示**：開啟「同群組只留一個」時，會被取代的標籤以虛線與 ⇄ 標示，被釘選擋住的標籤變暗並標示 🚫；滑過時在選項下方顯示「點選將取代「X」」，同樣文字放在標籤的 `title`。
- `history.js`（純函式）、`Randomizer.exclusiveHints` 與單元測試；`npm test` 現有 69 項測試。
- 新增 22 個 UI 字串（四種語言）。

### Changed
- 任何會改變已選標籤的動作都必須經過 `recordedChange` 才會進入歷史（見 `docs/HISTORY.md`「維護者」）。
- 修正按過勾選框後 `Ctrl+Z` 被當成文字欄位而失效的問題：只有可輸入文字的欄位才保留原生復原。

## [1.7.0] — 2026-10-14

### Added
- **鎖定整個分類**：分類標題的 🔓／🔒 可鎖定分類；重抽（全部或單獨 🎲）會略過已鎖定的分類，該分類的 🎲 停用。全部勾選的分類都已鎖定時會提示。鎖定狀態存入工作階段。
- **手動選取：同群組只留一個**（預設關閉）：開啟後點選標籤會取代同群組或單選子分類內的互斥標籤；互斥標籤已釘選時釘選優先，新標籤不加入並顯示提示。選項存入工作階段。
- 資料欄位 `single`（選填）：標記只能選一個的子分類。目前用於景別、視角、髮色、種族、職業；`npm run validate` 會檢查它必須是布林值且不可與 `group` 同時使用。
- `Randomizer.exclusiveSiblings`（純函式）與單元測試；`npm test` 現有 54 項測試。

### Changed
- 「❌ 清空重選」現在會保留已鎖定分類裡的標籤，只清除其他分類（沒有鎖定時行為不變）。
- 工作階段格式新增 `random.locked` 與 `random.exclusive`；舊的工作階段與分享連結仍可載入（缺少時使用預設值）。
- 新增 6 個 UI 字串（四種語言）。

## [1.6.0] — 2026-10-14

### Added
- **釘選標籤**：已選標籤可 📌 釘選；隨機抽卡與分類 🎲 重抽時保留釘選的標籤，且其所在的群組不再另外抽（`randomizer.js` 新增 `pinned` 參數）。釘選會標示在清單與詞庫，並存入工作階段。
- **依繪圖引擎輸出提示詞格式**（`promptformat.js`）：Stable Diffusion XL（`(標籤:權重)`）、Midjourney（預設版本／v7／v6.1：`--ar` 由尺寸換算、`--v`、`--no` 最多 10 項；僅 v6.1 使用 `::` 權重）、Leonardo.Ai、Ideogram 與 DALL·E 3（自然語句、DALL·E 3 的反向詞改寫為 Avoid 句子）。引擎選單下方顯示說明。詳見 `docs/PROMPT_FORMATS.md`。
- **工作階段**（`session.js`、`session-ui.js`）：自動儲存與還原、複製分享連結（桌面版為分享代碼）、匯出／匯入 JSON、貼上連結或代碼套用、重設。不包含 API 位址與產圖參數；載入時只接受目前詞庫中存在的提示詞與已知選項。詳見 `docs/SESSION.md`。
- 提示詞格式、工作階段與釘選的單元測試；`npm test` 現有 50 項測試。
- `docs/AI_DEV_PROMPTS.md`：在新對話中以 AI 協助開發的專案背景提示詞，以及新功能、修正錯誤、修改既有功能、翻譯、標籤擴充、審查、重構、發佈與交接各階段的提示詞，並附 ROADMAP 項目的起手式。

### Changed
- 繪圖引擎選單的值改為 id，且**不再把引擎名稱當關鍵字加進提示詞**（先前會出現 `Midjourney v6 game art style`、`SDXL, game asset lora` 等文字）。選 Midjourney、Leonardo、Ideogram、DALL·E 3 時，畫面上的提示詞格式會改變。
- 本機產圖一律使用 Stable Diffusion 格式，不受「繪圖引擎」影響；產圖工作台加上說明。
- 修改尺寸、選尺寸預設或切換引擎時，畫面上的提示詞會即時更新（Midjourney 的 `--ar` 依尺寸換算）。
- `npm run i18n:check` 能辨識動態組合的語系鍵，不再誤報「未使用」。
- 新增 32 個 UI 字串（四種語言），並調整 `settings.engine` 的文字。

## [1.5.0] — 2026-10-14

### Added
- 隨機抽卡改以「群組」為單位：結構檔的子分類可帶 `group`，同組互為替代只抽一個。姿勢、表情、場景、武器、主特效、UI 元素、圖示與商店素材不再一次抽到多個；服裝為 1 件主服裝＋1 個配件。詳見 `docs/RANDOM_PICK.md`。
- 隨機抽卡會避開目前已選的標籤，連續重抽不會抽到同一個結果；每個分類標題新增 🎲 按鈕，可單獨重抽該分類。
- 「🎯 同類只抽一個」開關（預設開啟、會記住選擇），關閉後回到舊行為。
- `assets/js/randomizer.js`（純函式）與單元測試。
- `npm run validate`：詞庫與設定檔結構驗證（id 格式與唯一性、`group`、提示詞唯一性、模式與範本欄位），已納入 `npm run check`。

### Changed
- 創作範本面板重新設計：預設收合，標題列顯示目前套用的套餐；清單點選即套用、再點取消，選中項目展開說明；篩選改為兩個精簡下拉選單，移除「套用」按鈕與說明框。面板移到主控面板最上方。
- 移除不再使用的 UI 字串（`template.note`、`template.package`、`template.apply`、`template.applied`、`template.meta`），新增 `template.current`、`template.none`、`random.variety`、`random.rollSheet`。
- 隨機抽卡的預設行為改變：每個互斥分類一次只出現一個結果（可用「同類只抽一個」開關還原）。
- Roadmap 重新整理，加入後續優化與改版建議。

## [1.4.0] — 2026-10-08

### Added
- 介面全面多語系化：繁體中文、English、日本語、한국어，涵蓋主介面、範本、產圖工作台、風格鎖定與批次產圖；依瀏覽器語言自動選擇並記住選擇。
- 標籤庫、模式名稱、尺寸預設與創作範本的各語系檔案（`locales/<語言>/`），日文與韓文標籤為機器輔助起稿。
- 翻譯工具 `scripts/i18n.js`：`i18n:check`（完整性、占位符與標記檢查）、`i18n:table`（產生 CSV／Markdown 對照表）、`i18n:import`（由試算表匯回）、`i18n:add`（新增語言）。
- `docs/i18n/translation-table.{csv,md}` 翻譯對照表與 `docs/I18N.md` 翻譯指南。
- 翻譯工具與語系檔的單元測試。

### Changed
- **資料格式（破壞性變更）**：`config_sheets/` 改為語言中立的結構（英文 id＋提示詞），分類檔改用英文檔名並由 `index.json` 列出；顯示文字移到 `locales/`。自訂詞庫需依 [詞庫與設定檔格式](docs/CONFIG_SHEETS.md) 遷移。
- 範本的遊戲類型與風格類型、模式的預設分類改用 id。
- 移除已被取代的舊版 Draw Things 面板與函式（產圖改由產圖工作台負責）。
- 網頁版產圖工作台加入 CORS 代理提示（桌面版自動隱藏）。
- 選取標籤清單改以事件監聽取代 inline 事件，並避免以 `innerHTML` 寫入資料。
- `npm run check` 納入語系檔檢查；Electron 打包納入 `locales/`。

## [1.3.1] — 2026-10-07

### Changed
- 授權改為 MIT，新增 `LICENSE` 並更新 `package.json` 與各語言 README。
- Git 分支統一為單一 `master`（移除 `main`）。

## [1.3.0] — 2026-10-07

### Added
- 風格鎖定：儲存／匯出／匯入風格預設，鎖定產圖參數與種子，並自動套用風格前綴與反向詞。
- 批次產圖：以素材清單套用同一風格依序產圖，支援停止、全部下載與匯出設定紀錄。
- `npm test`（Node 內建測試執行器）與風格鎖定單元測試。
- 文件：桌面版、部署、詞庫格式、風格一致化流程、貢獻指南、Changelog、Bug 回報範本。

### Changed
- `generation.js` 新增 `generationSettings()` 掛勾與 `runProvider()`，供風格鎖定與批次使用。
- 統一專案作者為 kikulu，補齊 `package.json` 的作者、repository 與 bugs 欄位。
- 更新 README（四種語言）、Roadmap 與本地化說明。

## [1.2.0] — 2026-10-07

### Added
- Electron 桌面版（`npm run electron`、`npm run dist`），可打包 Windows／macOS／Linux。
- `assets/js/platform.js`：`apiFetch()` 讓同一份前端同時支援網頁與桌面；桌面版免 CORS 代理。

## [1.1.0] — 2026-09-18

### Added
- 遊戲與美術風格創作範本套餐（`config_sheets/templates.json`）。

## [1.0.1] — 2026-09-18

### Changed
- 補上多語言介面文件，並統一儲存庫文字檔格式（`.gitattributes`）。

## [1.0.0] — 2026-09-18

### Added
- HTML／CSS／JavaScript 分離的詞庫驅動提示詞產生器。
- Node.js 本機靜態服務與 Draw Things CORS 代理。
- Draw Things、SD WebUI／Forge、ComfyUI 本機產圖。
- 繁體中文、English、日本語、한국어介面。
