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

## 品質檢查

```bash
npm run check
```

此指令會驗證所有 Node.js 與瀏覽器 JavaScript 的語法。新增功能時，請手動驗證：詞庫載入、標籤權重、提示詞複製、模式/尺寸切換與代理錯誤訊息。

## 擴充詞庫

1. 在 `config_sheets` 新增或更新 JSON 檔。
2. 新分類須加入 `assets/js/app.js` 的 `SHEET_FILES` 陣列。
3. 確保每個項目均有 `en` 與 `cn`，並以 `node --check assets/js/app.js` 確認前端未被破壞。

## 擴充創作範本

在 `config_sheets/templates.json` 新增套餐。每筆需包含 `gameType`、`styleType`、`label`、`description`、`platform`、`dimension`、`prompt` 與 `negative`。範本只會提供提示詞基礎層，使用者仍可從詞庫選擇標籤及調整權重。

## Git 工作方式

- 每個功能使用一個描述性的分支與小型 commit。
- 不提交 `.env`、產圖結果、token 或個人設定。
- 合併前執行 `npm run check`，並在瀏覽器完成核心操作驗收。
