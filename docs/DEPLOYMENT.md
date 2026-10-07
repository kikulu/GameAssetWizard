# 部署

## 網頁版（靜態）

專案本體是純靜態檔案，可放在任何靜態主機（GitHub Pages、Netlify、Nginx…）：

- 上傳 `index.html`、`assets/`、`config_sheets/`。
- 需注意：頁面若以 `https://` 提供，瀏覽器會封鎖對 `http://127.0.0.1` 的「混合內容」請求，連本機產圖後端可能失敗。本機使用請以 `npm start` 開啟 `http://127.0.0.1:3000`，或改用桌面版。
- 瀏覽器直連本機後端時可能遇到 CORS，可執行 `npm run proxy`（見 [README](../README.md)）。

## 本機開發伺服器

```bash
npm start     # http://127.0.0.1:3000（僅綁定 127.0.0.1）
```

`server.js` 只供開發使用，只提供 GET／HEAD 與基本 MIME 類型，不建議對外網開放。

## 桌面版

見 [桌面版說明](DESKTOP.md)。
