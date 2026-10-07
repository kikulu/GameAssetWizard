# Game Asset Prompt Generator

[繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

以 JSON 詞庫驅動的遊戲美術提示詞產生器，協助手機遊戲與 Steam／PC 專案快速組合角色、場景、UI、商店素材等圖像生成提示詞。可選擇性串接本機的 Draw Things HTTP API 產圖。同一份程式碼同時支援**網頁**與 **Electron 桌面版**。

## 功能

- 支援手機遊戲／Steam・PC，以及綜合、2D、3D 六種創作模式。
- 提供 RPG、卡牌、休閒模擬、黑暗奇幻、科幻與像素 Roguelike 等可微調的創作範本套餐。
- 以可獨立編輯的 JSON 詞庫管理鏡頭、角色、服裝、場景、特效與行銷素材標籤。
- 手動選取、分類隨機抽卡與標籤權重調整。
- 產生正向／反向提示詞並一鍵複製。
- 支援 Draw Things、SD WebUI／Forge 與 ComfyUI 本機產圖。
- **風格鎖定與批次產圖**：儲存／匯出風格預設，鎖定參數與種子，一次產出整組風格一致的素材，詳見[風格一致化流程](docs/STYLE_CONSISTENCY.md)。
- 提供 sampler、scheduler、denoise、checkpoint、VAE、LoRA、ControlNet 與 ComfyUI workflow 等進階參數。

## 技術棧

| 層級 | 技術 |
| --- | --- |
| 前端 | HTML5、CSS3、原生 JavaScript（檔案分離） |
| 本機服務（網頁版） | Node.js 18+、Node.js 內建 `http` 模組 |
| 桌面版 | Electron（僅 devDependency，用於開發與打包） |
| 資料 | JSON 詞庫 |
| 選用整合 | Draw Things、SD WebUI／Forge、ComfyUI API |

## 快速開始

```bash
git clone https://github.com/kikulu/GameAssetWizard.git
cd GameAssetWizard
npm start
```

在瀏覽器開啟 [http://127.0.0.1:3000](http://127.0.0.1:3000)。專案不使用第三方執行期套件，因此無須 `npm install`。

執行檢查與測試：

```bash
npm run check   # 語法檢查
npm test        # 單元測試
```

## 桌面版（Electron）

```bash
npm install          # 僅桌面版需要，會安裝 electron 與 electron-builder
npm run electron     # 直接啟動桌面版
npm run dist         # 打包目前平台安裝檔（輸出至 release/）
npm run dist:win     # 或 dist:mac / dist:linux
```

桌面版由主程序代送產圖後端請求，**不受 CORS 限制，不需要執行 `server_proxy.js`**。網頁版與桌面版共用同一份 `index.html`、`assets/` 與 `config_sheets/`。

## Draw Things 整合

1. 在 Draw Things 開啟 **HTTP API Server**（預設 `127.0.0.1:7860`）。
2. 若瀏覽器可直接連線，在頁面保留預設 API 位址即可。
3. 如遇 CORS 錯誤，另開終端機執行：

   ```bash
   npm run proxy
   ```

4. 將網頁 API 位址改為 `http://127.0.0.1:8791`。

代理目標與連接埠可透過 `DT_HOST`、`DT_PORT`、`PROXY_PORT` 設定；參考 [`.env.example`](.env.example)。

其他本機後端的啟動方式、可用參數與 ComfyUI workflow 使用方式，請見[本機產圖後端設定](docs/LOCAL_GENERATORS.md)。

## 專案結構

```text
.
├── .github/                 # Issue／PR 範本
├── assets/
│   ├── css/                 # styles / generation / alchemy / templates / styleguide
│   └── js/
│       ├── platform.js      # 網頁／桌面版抽象層（apiFetch）
│       ├── app.js           # 前端互動、詞庫與提示詞組合
│       ├── generation.js    # Draw Things／SD WebUI／ComfyUI 產圖
│       ├── styleguide.js    # 風格鎖定與批次產圖
│       ├── templates.js     # 創作範本
│       └── i18n.js          # 介面多語言
├── config_sheets/           # 提示詞詞庫、模式設定與範本（JSON）
├── docs/                    # 架構、開發、部署與使用文件
├── electron/
│   ├── main.js              # Electron 主程序（app:// 協定、API 橋接）
│   └── preload.js           # 安全地暴露 window.desktop
├── tests/                   # 單元測試（node --test）
├── CHANGELOG.md             # 版本紀錄
├── CONTRIBUTING.md          # 貢獻指南
├── index.html               # 頁面結構
├── server.js                # Node.js 靜態開發服務
└── server_proxy.js          # Draw Things CORS 代理（網頁版選用）
```

## 文件

- [架構說明](docs/ARCHITECTURE.md)
- [開發指南](docs/DEVELOPMENT.md)
- [桌面版（Electron）](docs/DESKTOP.md)
- [部署](docs/DEPLOYMENT.md)
- [詞庫與設定檔格式](docs/CONFIG_SHEETS.md)
- [本機產圖後端設定](docs/LOCAL_GENERATORS.md)
- [風格一致化流程](docs/STYLE_CONSISTENCY.md)
- [介面語言](docs/LOCALIZATION.md)
- [Roadmap](docs/ROADMAP.md)
- [Changelog](CHANGELOG.md)

## 貢獻規範

請先閱讀[貢獻指南](CONTRIBUTING.md)與開發指南。提交 PR 前請執行 `npm run check` 與 `npm test`，並在瀏覽器驗證詞庫載入、提示詞組合及模式切換。請勿提交 API token、個人 `.env` 設定或產生的圖片檔。

## 授權

本專案以 [MIT License](LICENSE) 授權。Copyright (c) 2026 kikulu。

## 作者

[kikulu](https://github.com/kikulu)
