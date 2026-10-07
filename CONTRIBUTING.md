# 貢獻指南

感謝你協助改進 Game Asset Prompt Generator。

## 開始之前

1. 閱讀 [開發指南](docs/DEVELOPMENT.md) 與 [架構說明](docs/ARCHITECTURE.md)。
2. 網頁版不需安裝套件：`npm start`。桌面版需 `npm install`，見 [桌面版說明](docs/DESKTOP.md)。

## 提交流程

1. 從 `main` 建立描述性分支，例如 `feat/style-lock`、`fix/comfy-timeout`。
2. 保持小型、單一目的的 commit，訊息採用 [Conventional Commits](https://www.conventionalcommits.org/)：`feat:`、`fix:`、`docs:`、`chore:`、`refactor:`、`test:`。
3. 提交前執行：

   ```bash
   npm run check   # 語法檢查
   npm test        # 單元測試
   ```

4. 在瀏覽器（必要時也在桌面版）驗證受影響的流程，再開 Pull Request 並填寫範本。

## 程式風格

- 前端維持原生 JavaScript，不引入執行期套件。
- 呼叫本機產圖後端請使用 `apiFetch()`（見 [桌面版說明](docs/DESKTOP.md)）。
- 使用者提供的文字一律以 `textContent` 或安全的 DOM API 寫入畫面。
- 詞庫項目必須同時有 `en` 與 `cn`。

## 請勿提交

API token、`.env`、個人設定、產生的圖片、`release/` 與 `node_modules/`。

## 版本與發佈

遵循[語意化版本](https://semver.org/lang/zh-TW/)。發佈時：更新 `package.json` 版本與 [CHANGELOG](CHANGELOG.md)，建立 `chore(release): vX.Y.Z` commit 並打上同名的 annotated tag（`git tag -a vX.Y.Z -m "…"`）。
