# Game Asset Prompt Generator

[繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

以 JSON 詞庫驅動的遊戲美術提示詞產生器，協助手機遊戲與 Steam／PC 專案快速組合角色、場景、UI、商店素材等圖像生成提示詞。可選擇性串接本機的 Draw Things HTTP API 產圖。

## 功能

- 支援手機遊戲／Steam・PC，以及綜合、2D、3D 六種創作模式。
- 提供 RPG、卡牌、休閒模擬、黑暗奇幻、科幻與像素 Roguelike 等可微調的創作範本套餐。
- 以可獨立編輯的 JSON 詞庫管理鏡頭、角色、服裝、場景、特效與行銷素材標籤。
- 手動選取、分類隨機抽卡與標籤權重調整。
- 產生正向／反向提示詞並一鍵複製。
- 支援 Draw Things、SD WebUI／Forge 與 ComfyUI 本機產圖。
- 提供 sampler、scheduler、denoise、checkpoint、VAE、LoRA、ControlNet 與 ComfyUI workflow 等進階參數。

## 技術棧

| 層級 | 技術 |
| --- | --- |
| 前端 | HTML5、CSS3、原生 JavaScript（檔案分離） |
| 本機服務 | Node.js 18+、Node.js 內建 `http` 模組 |
| 資料 | JSON 詞庫 |
| 選用整合 | Draw Things、SD WebUI／Forge、ComfyUI API |

## 快速開始

```bash
git clone <YOUR_REPOSITORY_URL>
cd game-asset-prompt-generator
npm start
```

在瀏覽器開啟 [http://127.0.0.1:3000](http://127.0.0.1:3000)。專案不使用第三方執行期套件，因此無須 `npm install`。

執行語法檢查：

```bash
npm run check
```

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
├── assets/
│   ├── css/styles.css       # 視覺樣式
│   └── js/app.js            # 前端互動、詞庫與 API 邏輯
├── config_sheets/           # 遊戲美術提示詞詞庫
├── docs/                    # 架構、開發與 roadmap 文件
├── index.html               # 頁面結構
├── server.js                # Node.js 靜態開發服務
└── server_proxy.js          # Draw Things CORS 代理
```

## 文件

- [架構說明](docs/ARCHITECTURE.md)
- [開發指南](docs/DEVELOPMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [本機產圖後端設定](docs/LOCAL_GENERATORS.md)

## 貢獻規範

請先閱讀開發指南。提交 PR 前請執行 `npm run check`，並在瀏覽器驗證詞庫載入、提示詞組合及模式切換。請勿提交 API token、個人 `.env` 設定或產生的圖片檔。

## 授權

目前未指定公開授權；發布至公開 GitHub 前，請由專案擁有者補上適用的 `LICENSE`。
