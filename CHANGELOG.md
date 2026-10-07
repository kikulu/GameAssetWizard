# Changelog

格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本遵循[語意化版本](https://semver.org/lang/zh-TW/)。

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
