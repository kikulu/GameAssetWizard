# 開發指南

## 環境需求

- Node.js 18 或以上
- 現代瀏覽器
- （選用）啟用 HTTP API Server 的 Draw Things

## 啟動

```bash
npm start
```

開啟 `http://127.0.0.1:3000`。此專案沒有第三方相依套件，因此不需要 `npm install`。

要使用 Draw Things CORS 代理，另開一個終端機：

```bash
npm run proxy
```

在網頁的 API 位址輸入 `http://127.0.0.1:8791`。可複製 `.env.example` 的值作為啟動參數；目前代理讀取的環境變數為 `DT_HOST`、`DT_PORT`、`PROXY_PORT`。

## 桌面版（Electron）

```bash
npm install
npm run electron
```

- 前端以 `app://local/` 自訂協定載入，使 `fetch('config_sheets/...')` 與 `localStorage` 行為和網頁版一致。
- 產圖後端請求一律透過 `assets/js/platform.js` 的 `apiFetch()`：網頁版等同 `fetch`，桌面版改走 IPC 由主程序代送（無 CORS 問題）。**新增呼叫本機後端的程式碼時請使用 `apiFetch`，不要直接用 `fetch`**；讀取專案內 JSON 則仍用 `fetch`。
- 打包：`npm run dist`（或 `dist:win`／`dist:mac`／`dist:linux`），輸出於 `release/`。

## 品質檢查

```bash
npm run check   # 語法檢查
npm test        # 單元測試（Node 內建測試執行器，無需額外套件）
npm run i18n:check   # 只檢查語系檔（已包含在 npm run check）
```

`check` 會驗證 Node.js、Electron 與瀏覽器 JavaScript 的語法，並檢查所有語系檔的完整性；`test` 涵蓋風格鎖定與翻譯工具。新增功能時，請手動驗證：詞庫載入、標籤權重、提示詞複製、模式/尺寸切換與代理錯誤訊息。

## 擴充詞庫

詳細格式見 [詞庫與設定檔格式](CONFIG_SHEETS.md)。

1. 在 `config_sheets/<sheetId>.json` 新增或更新結構，新分類加入 `config_sheets/index.json`。
2. 在每個語言的 `locales/<語言>/tags/<sheetId>.json` 補上顯示文字。
3. 執行 `npm run i18n:check`，缺漏的鍵會逐一列出。

## 擴充創作範本

在 `config_sheets/templates.json` 新增套餐（`id`、`gameType`、`styleType`、`platform`、`dimension`、`prompt`、`negative`），並在各語言的 `locales/<語言>/templates.json` 補上名稱與說明。範本只會提供提示詞基礎層，使用者仍可從詞庫選擇標籤及調整權重。

## 多語系

新增任何使用者看得到的文字，都要走語系檔：HTML 用 `data-i18n`，JavaScript 用 `t('鍵')`，並在每個語言的 `ui.json` 加入該鍵。翻譯流程、試算表對照表與新增語言見 [多語系與翻譯指南](I18N.md)。

## Git 工作方式

- 預設且唯一的長期分支為 `master`；功能分支完成後合併回 `master` 並刪除。
- 每個功能使用一個描述性的分支與小型 commit，訊息採 Conventional Commits（`feat:`、`fix:`、`docs:`…）。
- 版本遵循語意化版本，發佈時更新 `package.json` 與 `CHANGELOG.md`，並建立 annotated tag（`vX.Y.Z`）。細節見 [CONTRIBUTING](../CONTRIBUTING.md)。
- 不提交 `.env`、產圖結果、token 或個人設定。
- 合併前執行 `npm run check` 與 `npm test`，並在瀏覽器完成核心操作驗收。
