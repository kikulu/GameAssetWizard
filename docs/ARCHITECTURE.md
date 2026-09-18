# 架構說明

## 目標

此專案採用不需建置工具的 HTML5 前端與 Node.js 本機服務。它可離線管理提示詞詞庫，並選擇性地透過本機代理連接 Draw Things。

## 分層

```text
index.html                 頁面語意與操作介面
assets/css/styles.css      響應式視覺樣式
assets/js/app.js           UI 狀態、詞庫載入、提示詞組合與 Draw Things 呼叫
config_sheets/*.json       可編輯的提示詞資料來源
server.js                  開發用靜態檔案伺服器
server_proxy.js            Draw Things 的 CORS 轉送代理
```

## 資料流

1. 瀏覽器從 `config_sheets` 載入基礎設定、模式設定與分類詞庫。
2. 使用者選取或隨機抽取標籤；前端組合正向及反向提示詞。
3. 使用者可複製提示詞到外部工具，或將內容送到 Draw Things HTTP API。
4. 若 Draw Things 未提供 CORS 標頭，改經 `server_proxy.js` 轉送。

## 設計原則

- 詞庫與程式碼分離，內容人員無須修改 JavaScript 即可擴充資料。
- 不引入執行期套件，降低本機安裝門檻與供應鏈風險。
- Node.js 僅處理本機靜態服務與代理；不保存提示詞或圖片。
