# 桌面版（Electron）

同一份前端程式碼（`index.html`、`assets/`、`config_sheets/`）可同時以網頁或 Electron 桌面程式執行。

## 開發與執行

```bash
npm install          # 安裝 electron 與 electron-builder（僅開發相依套件）
npm run electron     # 啟動桌面版
```

## 打包

```bash
npm run dist         # 目前作業系統
npm run dist:win     # Windows：NSIS 安裝檔 + portable
npm run dist:mac     # macOS：dmg + zip
npm run dist:linux   # Linux：AppImage + deb
```

輸出位於 `release/`（已被 `.gitignore` 排除）。打包設定在 `package.json` 的 `build` 欄位，只會收錄 `index.html`、`assets/`、`config_sheets/`、`locales/`、`electron/` 與 `package.json`。

> 跨平台打包通常需在對應的作業系統上執行；macOS 安裝檔若要對外發佈，需另行設定 Apple 簽章與公證。
> 發佈前請把 `build.appId` 改成自己的反向網域識別碼，並視需求在 `build` 中加入 `icon`。

## 運作方式

| 元件 | 說明 |
| --- | --- |
| `electron/main.js` | 建立視窗、註冊 `app://` 協定、提供產圖 API 橋接 |
| `electron/preload.js` | 以 `contextBridge` 只暴露 `window.desktop.request()` |
| `assets/js/platform.js` | 提供 `apiFetch()`：網頁版＝`fetch`；桌面版＝經 IPC 由主程序代送 |

- **`app://local/`**：自訂協定讓 `fetch('config_sheets/…')` 與 `localStorage` 行為與網頁版一致（`file://` 會被擋）。
- **免 CORS 代理**：Draw Things、SD WebUI、ComfyUI 的請求由主程序送出，不受瀏覽器 CORS 限制，因此不需要 `server_proxy.js`。
- **安全設定**：`contextIsolation`、`sandbox` 開啟、`nodeIntegration` 關閉；IPC 只接受來自 `app://local/` 的請求，且僅允許 `http`／`https` 位址；外部連結改用系統瀏覽器開啟；僅允許單一執行個體。

## 撰寫相容兩種平台的程式碼

- 呼叫本機產圖後端：使用 `apiFetch()`，不要直接用 `fetch()`。
- 讀取專案內 JSON：使用一般 `fetch()`。
- 需要判斷平台時使用 `window.isDesktopApp`，或以 CSS 的 `.is-desktop`／`.is-web`（`<html>` 會自動加上）。

## 疑難排解

| 現象 | 可能原因與處理 |
| --- | --- |
| 視窗空白 | 從終端機啟動查看錯誤；確認 `npm install` 已完成 |
| 連線失敗 | 確認後端已啟動並開啟 API（Draw Things 的 HTTP API Server、SD WebUI 的 `--api`） |
| 設定消失 | 風格預設與後端位址存在 `localStorage`；移除應用程式資料夾會一併清除，重要風格請先匯出 |
