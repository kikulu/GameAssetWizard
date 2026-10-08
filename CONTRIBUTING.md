# 貢獻指南

感謝你協助改進 Game Asset Prompt Generator。

## 開始之前

1. 閱讀 [開發指南](docs/DEVELOPMENT.md) 與 [架構說明](docs/ARCHITECTURE.md)。
2. 網頁版不需安裝套件：`npm start`。桌面版需 `npm install`，見 [桌面版說明](docs/DESKTOP.md)。

## 提交流程

1. 從 `master` 建立描述性分支，例如 `feat/style-lock`、`fix/comfy-timeout`。
2. 保持小型、單一目的的 commit，訊息採用 [Conventional Commits](https://www.conventionalcommits.org/)：`feat:`、`fix:`、`docs:`、`chore:`、`refactor:`、`test:`。
3. 提交前執行：

   ```bash
   npm run check   # 語法檢查與語系檔完整性
   npm test        # 單元測試
   ```

4. 在瀏覽器（必要時也在桌面版）驗證受影響的流程，再開 Pull Request 並填寫範本。

## 程式風格

- 前端維持原生 JavaScript，不引入執行期套件。
- 呼叫本機產圖後端請使用 `apiFetch()`（見 [桌面版說明](docs/DESKTOP.md)）。
- 使用者提供的文字一律以 `textContent` 或安全的 DOM API 寫入畫面。
- 新增詞庫項目時，結構檔（`config_sheets/`）與各語言的顯示文字（`locales/`）要一起提交，並通過 `npm run i18n:check`。
- 使用者看得到的文字一律走語系檔（`data-i18n`／`t('鍵')`），不要硬寫在 HTML 或 JavaScript。

## 翻譯貢獻

不需要寫程式也能貢獻翻譯：執行 `npm run i18n:table` 產生對照表，用試算表翻譯後以 `npm run i18n:import` 匯回，或直接編輯 `locales/<語言>/` 的 JSON。完整流程、新增語言與翻譯慣例見 [多語系與翻譯指南](docs/I18N.md)。日文與韓文標籤歡迎母語使用者校對。

## 請勿提交

API token、`.env`、個人設定、產生的圖片、`release/` 與 `node_modules/`。

## 授權

提交貢獻即表示你同意以 [MIT License](LICENSE) 授權你的變更。

## 版本與發佈

遵循[語意化版本](https://semver.org/lang/zh-TW/)。發佈時：更新 `package.json` 版本與 [CHANGELOG](CHANGELOG.md)，建立 `chore(release): vX.Y.Z` commit 並打上同名的 annotated tag（`git tag -a vX.Y.Z -m "…"`）。
