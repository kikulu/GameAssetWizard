# Changelog

格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本遵循[語意化版本](https://semver.org/lang/zh-TW/)。

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
