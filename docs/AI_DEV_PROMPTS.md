# AI 協作開發提示詞

在**新對話**中繼續開發時使用。AI 沒有先前對話的記憶，所以每次都要先給它「專案背景」，再依工作類型貼上對應階段的提示詞。

## 怎麼用

1. 開新對話，上傳專案 zip（或貼出 repo 連結／相關檔案）。
2. 先貼 **[0. 專案背景提示詞](#0-專案背景提示詞每次新對話都先貼)**，等 AI 確認理解。
3. 依工作類型，**一個階段一個階段**貼上提示詞，每階段結束後你先看過結果再進下一階段：
   - 新功能 → [A 系列](#a-新功能開發)
   - 修正錯誤 → [B 系列](#b-修正錯誤)
   - 修改既有功能 → [C 系列](#c-修改既有功能)
   - 翻譯、新增標籤、發佈、審查等 → [D 系列](#d-其他常見工作)
4. 對話快滿或要換新對話時，貼 [E. 交接提示詞](#e-對話交接)，把輸出存起來，下次開頭一併貼給新對話。

提示詞中的 `{{...}}` 是要你填寫的地方。**每階段的「停點」很重要**：它讓 AI 先交出規劃、等你確認，避免一次改太多。

---

## 0. 專案背景提示詞（每次新對話都先貼）

```text
你是這個專案的資深協作工程師。請先完整閱讀我上傳的專案（先看 README.md、docs/ARCHITECTURE.md、docs/DEVELOPMENT.md、CONTRIBUTING.md、docs/ROADMAP.md、CHANGELOG.md），再回答「我理解的專案現況」，不要急著改程式。

## 專案
Game Asset Prompt Generator：以 JSON 詞庫驅動的遊戲美術提示詞產生器，可選擇串接本機 Draw Things／SD WebUI／ComfyUI 產圖。同一份前端同時支援網頁版與 Electron 桌面版。目前版本以 package.json 與 CHANGELOG.md 為準。

## 技術與結構
- 原生 HTML／CSS／JavaScript（無框架、無執行期套件；Electron 只是 devDependency）。Node.js 18+。
- index.html 載入順序：platform.js → i18n.js → promptformat.js → session.js → randomizer.js → app.js → generation.js → styleguide.js → templates.js → session-ui.js（classic script，共用全域）。
- config_sheets/：語言中立資料。index.json 列出分類；<sheetId>.json 為「分類→子分類(可帶 group)→英文提示詞」；profiles.json（六種模式與尺寸預設 id）；templates.json；base_settings.json。
- locales/<zh-TW|en|ja|ko>/：各語言顯示文字 ui.json、profiles.json、templates.json、tags/<sheetId>.json。locales/locales.json 登錄語言。
- assets/js：app.js（狀態、矩陣 UI、提示詞組合）、i18n.js（執行層，全域 t()）、randomizer.js（純函式；群組、避免重複、釘選）、promptformat.js（依繪圖引擎輸出格式，純函式）、session.js（工作階段驗證／編碼，純函式）與 session-ui.js（自動儲存、分享、匯出入）、generation.js（產圖，generationSettings(promptOverride)／runProvider）、styleguide.js（風格鎖定與批次產圖，透過 window.applyStyleLock 掛勾）、templates.js、platform.js（apiFetch：網頁＝fetch，桌面＝IPC 代送）。
- electron/main.js、preload.js：app:// 協定、IPC 橋接、contextIsolation＋sandbox。
- scripts/i18n.js（check／table／import／add）、scripts/validate-data.js。tests/ 使用 node:test。
- 關鍵資料模型：已選標籤 activeSelections 是 Map，以「英文提示詞」為鍵、值為 { weight, pinned }；顯示文字由 locales 依目前語言查詢，因此切換語言不會影響已選內容。提示詞在所有分類中必須唯一。

## 指令
npm start（網頁，127.0.0.1:3000）｜npm run electron｜npm run check（語法＋資料驗證＋i18n 檢查）｜npm test｜npm run validate｜npm run i18n:check／i18n:table／i18n:import／i18n:add｜npm run dist

## 必須遵守的規則
1. 任何使用者看得到的文字都走語系檔：HTML 用 data-i18n*，JS 用 t('鍵', {參數})；新增鍵必須同時加入四個語言的 ui.json。不得硬寫中文或英文字串在 HTML／JS。
2. 呼叫本機產圖後端一律用 apiFetch()，不要直接 fetch；讀專案內 JSON 才用 fetch。
3. 新增動態內容用 textContent／DOM API，不用 innerHTML 寫入資料；不要新增 inline event handler。
4. 資料（config_sheets）與顯示文字（locales）分離；改資料結構時同步更新 docs/CONFIG_SHEETS.md、驗證腳本與測試。
5. 不新增執行期套件；若真的需要，先提出理由與替代方案，等我同意。
6. 純邏輯盡量放進可在 Node 測試的純函式模組，並補單元測試。
7. 不要改動已發佈的歷史（不 rebase／force-push、不改既有 tag）。
8. 畫面上的提示詞由 PromptFormat.format(引擎, promptInput()) 產生；本機產圖一律走 getGenerationPrompts()（Stable Diffusion 格式），不受引擎選擇影響。新增引擎或改格式請改 promptformat.js 並補測試。
9. 工作階段（自動儲存、分享連結、匯出檔）不得包含 API 位址與產圖參數；任何載入路徑都必須經 Session.sanitize（只接受詞庫中存在的提示詞與已知選項）。新增要儲存的設定時同步修改 session-ui.js 的 capture／apply 與 session.js 的 sanitize，並補測試。

## Git 與版本規則
- 只有一個長期分支 master。作者與提交者固定為 kikulu <kikulu@gmail.com>（repo 內已設定）。
- Conventional Commits（feat／fix／docs／refactor／test／chore），commit 小而單一目的，訊息含簡短條列說明。
- 語意化版本：新功能 minor、修正 patch、破壞性資料或行為變更需在 CHANGELOG 明確標註。發佈 = 更新 package.json 版本與 CHANGELOG，commit「chore(release): vX.Y.Z」並打 annotated tag（git tag -a）。授權 MIT。

## 品質門檻（每次改動都要做到）
- npm run check 與 npm test 全部通過。
- 動到介面時，在真實瀏覽器驗證（四種語言切換、控制台無錯誤）；產圖流程用模擬後端驗證（例如攔截 http://127.0.0.1:7860/sdapi/v1/txt2img）。目前專案內沒有瀏覽器端對端測試，若需要請說明你用什麼方式驗證。
- 更新相關文件（README 四種語言、docs/、CHANGELOG、ROADMAP）。

## 目前已知限制
見 docs/ROADMAP.md「規劃中」。日文與韓文標籤由機器輔助起稿尚待母語校對；桌面版尚未在各作業系統實機驗證，也沒有圖示與簽章。

請回覆：(1) 你理解的架構與資料流（5～10 行）；(2) 你發現的任何文件與程式不一致或風險；(3) 你還需要我提供什麼資訊。然後等待我的指示，不要修改任何檔案。
```

---

## A. 新功能開發

### A1. 需求釐清（不寫程式）

```text
我要新增功能：{{一句話描述，例如：標籤可釘選，重抽時保留}}。

背景與目的：{{使用者痛點、使用情境}}
我希望的行為：{{描述操作流程與預期結果}}
不在範圍內：{{明確排除的項目}}

請先不要寫程式。請你：
1. 用自己的話複述需求，列出你的假設。
2. 列出所有需要我決定的問題（一次問完，每題附你的建議預設值與理由）。
3. 列出邊界情況與可能的衝突（和既有功能：風格鎖定、批次產圖、範本、隨機抽卡、語言切換、桌面版的互動）。
4. 定義驗收條件（可勾選的清單，要能被測試驗證）。
停點：等我回答並確認驗收條件後，才進入下一階段。
```

### A2. 設計與規劃（不寫程式）

```text
需求與驗收條件已確認（以我們剛才的結論為準）。請提出實作計畫，先不要改檔案：
1. 受影響的檔案與模組清單，每個檔案說明要改什麼、為什麼。
2. 資料與狀態設計：新增／修改的資料結構、localStorage 鍵、事件、與 config_sheets／locales 的關係；是否為破壞性變更，是否需要遷移。
3. 介面設計：版面位置、互動、空狀態、錯誤狀態、窄螢幕行為，並說明如何不讓控制面板更雜亂。
4. 要新增的 i18n 鍵（列出鍵名與繁中原文；四種語言的翻譯我會在實作階段請你一起補上）。
5. 測試計畫：哪些邏輯抽成純函式做單元測試；哪些要在瀏覽器驗證（列出具體步驟）。
6. 風險、替代方案與取捨；預估拆成幾個 commit（各自的主題）。
7. 文件與 CHANGELOG／ROADMAP 需要更新的地方，以及建議的版本號。
停點：我確認計畫後才開始實作。若你認為需求需要調整，請直接說明。
```

### A3. 實作

```text
計畫已核准，請開始實作，並遵守專案背景中的規則。要求：
- 依計畫拆成小步驟，每完成一步就說明做了什麼；純邏輯先寫單元測試再實作。
- 所有使用者可見文字都加入 zh-TW／en／ja／ko 四個語言的 locale 檔（日韓譯文請盡力自然，並標註你不確定的地方供我校對）。
- 不要順手重構與本功能無關的程式；若發現無關問題，列在最後「發現但未處理」清單即可。
- 每個階段結束執行 npm run check 與 npm test，並貼出結果。
- 先不要 commit，也不要改版本號。
完成後回報：改了哪些檔案、新增哪些鍵、哪些驗收條件已滿足、哪些尚待驗證。
```

### A4. 驗證與回歸

```text
請驗證剛完成的功能，不要只靠閱讀程式碼：
1. 執行 npm run check、npm test、npm run validate，貼出結果。
2. 在真實瀏覽器中依驗收條件逐條操作（可使用 Playwright 並以模擬後端取代真實產圖服務），回報每一條的通過／失敗與證據（輸出值、截圖）。
3. 切換 zh-TW／en／ja／ko 檢查：沒有殘留未翻譯文字或鍵名、版面沒有跑掉、已選內容不因語言切換而改變；控制台無錯誤與警告。
4. 回歸檢查這些既有功能：標籤選取與權重、隨機抽卡（含分類 🎲 與「同類只抽一個」）、範本套用與移除、風格鎖定與批次產圖、平台與 2D／3D 切換、尺寸預設、複製提示詞。
5. 列出你沒有辦法驗證的部分（例如 Electron 視窗、真實產圖後端）並說明風險。
若有失敗，先修正再重驗，最後給我一份簡短的驗證報告。
```

### A5. 文件與 Git 版本

```text
功能已通過驗證，請整理文件與版本：
1. 更新文件：README 四種語言、docs/ 相關文件、docs/ROADMAP.md（勾選完成項目，必要時補上新的後續建議）、CHANGELOG.md（新版本條目，分 Added／Changed／Fixed；破壞性變更要明確標示）。若動到資料格式，更新 docs/CONFIG_SHEETS.md 與驗證腳本；若新增鍵，重新產生 docs/i18n/translation-table（npm run i18n:table）。
2. Git：依主題拆成多個 commit（功能、測試、文件各自獨立，且每個 commit 單獨檢出時 npm run check／npm test 都能通過）；最後一個是「chore(release): vX.Y.Z」（更新 package.json 版本）並打 annotated tag。作者為 kikulu。
3. 不要改動既有歷史或既有 tag。
4. 最後輸出：commit 清單（hash＋標題）、新版本號、更新過的檔案清單，以及我需要執行的推送指令。
```

---

## B. 修正錯誤

### B1. 重現與分流

```text
我遇到一個問題：{{現象，例如：切到日文後，範本清單的名稱還是中文}}
重現步驟：{{1. … 2. … 3. …}}
預期：{{…}}　實際：{{…}}
環境：{{網頁／桌面版、瀏覽器與版本、作業系統、語言、使用的產圖後端、專案版本}}
相關訊息：{{控制台錯誤、截圖描述}}

請先不要修改程式。請你：
1. 在專案中實際重現（可用 Playwright 加模擬後端）；若無法重現，列出你需要我補充的資訊。
2. 判斷影響範圍：哪些使用者、哪些情境會受影響；是否造成資料遺失或安全疑慮；嚴重度（高／中／低）。
3. 列出最可能的原因假設（依可能性排序），並說明你要用什麼證據驗證每個假設。
停點：重現成功並確認嚴重度後，再進入根因分析。
```

### B2. 根因分析與修正方案

```text
請找出根本原因，不要只處理表面症狀：
1. 說明資料與程式的實際流程，指出出錯的檔案與行為（附程式碼片段或函式名稱）。
2. 檢查是否有相同模式的其他地方也會出同樣的錯（例如其他分類、其他語言、桌面版與網頁版的差異），一併列出。
3. 提出修正方案（至少兩個選項並比較風險與改動範圍），建議最小且安全的方案，並說明為什麼這個錯誤先前沒有被測試抓到。
4. 說明修正會不會改變既有行為或資料格式。
停點：我選定方案後再改程式。
```

### B3. 修正與回歸測試

```text
請依選定的方案修正：
1. 先寫一個會失敗的測試（單元測試優先；純 UI 問題則寫可重複執行的瀏覽器驗證步驟），證明問題存在，再修正到測試通過。
2. 只改與此錯誤直接相關的程式；順便發現的其他問題只列清單，不要一起改。
3. 若錯誤與文字或資料有關，同步修正四種語言與 locale／資料檔，並確保 npm run i18n:check 與 npm run validate 能抓出同類問題（必要時強化檢查腳本）。
4. 執行 npm run check 與 npm test，貼出結果。先不要 commit。
完成後說明：根因、改了什麼、新增了哪些測試。
```

### B4. 驗證與收尾

```text
請驗證修正：
1. 用 B1 的重現步驟確認問題已消失（四種語言、網頁版；能驗證時也包含桌面版）。
2. 回歸檢查與此修正相鄰的功能，以及：標籤選取、隨機抽卡、範本、風格鎖定／批次產圖、語言切換。
3. 控制台無錯誤。
再整理版本：更新 CHANGELOG（Fixed 條目，描述使用者可見的影響）、必要的文件；commit 使用 fix: 前綴（測試與修正可同一個 commit，文件另開 docs: commit），最後 chore(release) 升 patch 版本並打 annotated tag。作者 kikulu，不改既有歷史。
最後回報 commit 清單與推送指令。
```

---

## C. 修改既有功能

### C1. 理解現況（特徵化）

```text
我想修改既有功能：{{功能名稱，例如：隨機抽卡／風格鎖定／範本面板}}。
想改的方向：{{描述想要的新行為與動機}}

請先不要修改程式。請你：
1. 找出這個功能涉及的所有檔案、函式、資料與 locale 鍵，並畫出目前的資料流與互動流程（文字說明即可）。
2. 用實際操作（Playwright 或單元測試）記錄「現在的行為」，列出你觀察到的結果，作為修改前的基準。
3. 找出依賴它的其他功能與測試（例如抽卡影響已選清單與提示詞組合；風格鎖定會掛勾 generationSettings）。
4. 指出目前設計中你認為不合理或有風險的地方。
停點：我確認你的理解正確後，再進行影響分析。
```

### C2. 影響分析與變更計畫

```text
請提出變更計畫，先不要改檔案：
1. 新舊行為對照表（舊／新／是否破壞相容）。
2. 向下相容策略：是否保留舊行為的開關、舊資料（localStorage、匯出的風格設定 JSON、config_sheets 自訂詞庫）如何遷移或容錯。
3. 受影響的檔案、locale 鍵（新增／修改／移除，四種語言都要列）、文件、測試與驗證腳本。
4. 需要先補的「保護測試」（在動手前先鎖住現有行為中要保留的部分）。
5. 風險與回滾方式；建議的 commit 拆分與版本號（破壞性變更要建議是否升 minor 並在 CHANGELOG 標註）。
停點：我核准後才開始實作。
```

### C3. 實作

```text
計畫已核准。請依下列順序進行：
1. 先補保護測試並確認在舊程式上通過。
2. 再實作變更；對移除或改名的 locale 鍵，四個語言一起處理，並確認 npm run i18n:check 沒有殘留未使用或缺漏的鍵。
3. 遵守專案規則（apiFetch、t()、textContent、不新增 inline handler、不新增執行期套件）。
4. 不順手重構無關程式；發現的其他問題只列清單。
5. 每步後執行 npm run check 與 npm test。先不要 commit。
完成後回報：行為差異、改動檔案、被移除或改名的鍵、剩餘風險。
```

### C4. 驗證、文件與版本

```text
請驗證並收尾：
1. 對照 C2 的「新舊行為對照表」逐條實測，貼出證據；回歸檢查所有相鄰功能與四種語言，控制台無錯誤。
2. 檢查舊資料（舊版匯出的風格 JSON、已存的 localStorage、自訂詞庫）是否仍能正常使用或給出清楚的錯誤訊息。
3. 更新文件：README 四種語言、docs/、ROADMAP、CHANGELOG（Changed；破壞性變更明確標示並寫遷移方式）、重新產生翻譯對照表。
4. Git：保護測試／實作／文件拆成獨立 commit，每個 commit 單獨檢出都能通過 check 與 test；最後 chore(release) 與 annotated tag。作者 kikulu，不改既有歷史。
最後回報 commit 清單、版本號與推送指令。
```

---

## D. 其他常見工作

### D1. 翻譯與在地化

```text
任務：{{新增語言 {{代碼與名稱，例如 fr Français}}｜校對 ja／ko 的標籤｜修改某些術語}}。
請先閱讀 docs/I18N.md，使用專案內建工具完成，不要手動大量改 JSON：
1. 新增語言用 npm run i18n:add；批次翻譯用 npm run i18n:table 產生對照表，翻譯後以 npm run i18n:import 匯回（先 --dry-run）。
2. 翻譯慣例：保留 {占位符} 與 <b>／<code>／<br> 標記與 emoji；產品與參數名稱不翻；標籤用遊戲美術業界常見用語並盡量簡短；英文提示詞本身不翻。
3. 完成後執行 npm run i18n:check 與 npm test，並在瀏覽器切換到該語言檢查版面（長字串不可破版）。
4. 新語言請一併新增 README.<代碼>.md 並更新各 README 頂端語言連結、docs/LOCALIZATION.md。
5. 列出你不確定的翻譯供我校對。依慣例拆 commit（feat(i18n)／docs）。
```

### D2. 擴充標籤庫或範本

```text
任務：{{新增分類 {{名稱}}｜在既有分類新增標籤｜新增範本}}。
內容方向：{{描述，例如：載具、怪物、材質、光影}}
請先閱讀 docs/CONFIG_SHEETS.md 與 docs/RANDOM_PICK.md，然後：
1. 先給我提案：分類／子分類結構、哪些子分類互為替代（group）、標籤清單（英文提示詞要實用、簡短、符合 SD／Midjourney 常見用法，且在全專案中唯一）。我確認後再動手。
2. 實作：config_sheets 結構檔、index.json、profiles.json 的 defaultRandomSheets（如需要）、四個語言的 locales/tags/<sheetId>.json。
3. 執行 npm run validate、npm run i18n:check、npm test，並在瀏覽器確認新分類顯示、隨機抽卡每次結果數量合理、四種語言正常。
4. 更新 CHANGELOG 與翻譯對照表，拆成獨立 commit。
```

### D3. 程式碼審查（只審查，不修改）

```text
請對 {{最近 N 個 commit｜某個檔案或模組｜整個專案}} 做嚴格的程式碼審查，不要修改任何檔案：
- 分「錯誤與風險／安全／可維護性／效能／無障礙／i18n 遺漏／測試缺口」列出發現，每項附位置、嚴重度（高／中／低）與具體修正建議。
- 特別檢查：硬寫字串、直接 fetch、innerHTML 寫入資料、inline handler、全域變數耦合、IPC 與 Electron 安全設定、localStorage 錯誤處理、文件與程式不一致。
- 最後給出建議的處理優先順序，以及哪些適合列入 ROADMAP。
```

### D4. 重構（不改行為）

```text
任務：重構 {{模組或目標，例如：把 app.js 拆成 ES modules}}，要求行為完全不變。
1. 先補足保護測試（單元或瀏覽器驗證步驟），確認重構前全部通過。
2. 提出分階段計畫，每階段都能獨立通過 check／test 並可單獨回滾；先給我確認。
3. 實作時一次只做一種機械性改動；每階段貼出測試結果。
4. 完成後比較重構前後的行為（四種語言、全部主要流程），更新 docs/ARCHITECTURE.md，並以 refactor: commit 拆分提交。
```

### D5. 桌面版（Electron）打包與驗證

```text
任務：{{加入應用程式圖示／簽章／自動更新／在 Windows、macOS、Linux 驗證打包}}。
請先閱讀 docs/DESKTOP.md。說明你的環境限制（能否安裝 electron、能否在目標作業系統執行）。
請提出計畫：需要的設定（package.json build 欄位）、需要我提供的資產與憑證、安全設定是否需要調整（contextIsolation、sandbox、IPC 白名單、CSP）、無法在你環境驗證的項目與我可以自行驗證的步驟清單。
停點：我確認計畫後再實作。不要把任何憑證或金鑰寫入專案。
```

### D6. 發佈

```text
請準備發佈新版本：
1. 檢查工作樹乾淨、npm run check 與 npm test 通過。
2. 依自上次 tag 以來的 commit 決定版本號（說明理由），更新 package.json、CHANGELOG（日期使用今天）、ROADMAP。
3. 確認 README 四種語言與 docs 沒有過時內容、翻譯對照表已重新產生。
4. 建立 chore(release): vX.Y.Z commit 與 annotated tag（作者 kikulu）。不改既有歷史。
5. 輸出：版本號、commit 清單、推送指令（git push origin master、git push origin vX.Y.Z）、桌面版打包指令（npm run dist）與發佈說明草稿。
```

---

## E. 對話交接

### E1. 在舊對話結束前貼（產生交接摘要）

```text
這個對話即將結束。請產生一份「交接摘要」，讓全新的對話只靠它加上專案 zip 就能無縫接手：
1. 本次對話完成了什麼（功能／修正／文件），對應的 commit 與版本號。
2. 目前專案狀態：分支、最新 tag、工作樹是否乾淨、check／test 是否通過。
3. 做出的重要決策與理由（包含被否決的方案）。
4. 已知問題、尚未驗證的項目、我需要手動做的事（例如推送、校對、實機測試）。
5. 建議的下一步（依優先順序），每項附可以直接貼到新對話的任務描述。
6. 任何不在 repo 內、但新對話需要知道的環境事項（例如驗證方式、模擬後端的做法）。
請用條列、精簡、可直接複製貼上。
```

### E2. 在新對話接續（貼在「專案背景提示詞」之後）

```text
以下是上一個對話的交接摘要，請以它與專案原始碼為準接續工作，若兩者不一致請先指出：

{{貼上交接摘要}}

請先回覆你的理解與疑問，然後等我給下一個任務。
```

---

## F. 依 ROADMAP 預先寫好的任務起手式

下列任務貼在「專案背景提示詞」之後，接著依 A 系列階段進行（跳過 A1 的重述部分即可）。

### F1～F3（已於 v1.6.0 完成）

釘選標籤、依繪圖引擎輸出提示詞格式、工作階段自動儲存與分享連結都已完成，詳見 [隨機抽卡與釘選](RANDOM_PICK.md)、[依繪圖引擎輸出提示詞格式](PROMPT_FORMATS.md)、[工作階段](SESSION.md)。後續延伸請見下面的 F6、F7。

### F4. CI 與端對端測試納入專案

```text
任務：新增 GitHub Actions（Node 18／20／22 執行 npm run check 與 npm test），並把瀏覽器端流程整理成專案內的 Playwright 測試：語言切換、範本套用／取消、隨機抽卡（群組、不重複、分類 🎲）、風格鎖定與批次產圖（以攔截的模擬後端取代真實服務）。
請先提出方案：測試放哪裡、如何啟動靜態伺服器、是否把 Playwright 設為 devDependency（說明對「無執行期套件」原則的影響）、CI 執行時間與快取、失敗時如何產生截圖與 trace。核准後再實作，並更新 CONTRIBUTING 與 docs/DEVELOPMENT.md。
```

### F5. 日文、韓文標籤校對流程

```text
任務：建立母語校對流程。請先閱讀 docs/I18N.md。提案：在語系檔或獨立中繼資料中記錄各語言各鍵的「已校對」狀態、npm run i18n:check 回報校對進度（不影響通過與否）、對照表 CSV 加上狀態欄位並支援匯入、校對者的貢獻指南。核准後再實作，並維持現有 CSV 匯入的相容性與測試。
```

---

### F6. Midjourney 版本與參數可設定化

```text
任務：目前 promptformat.js 內以程式碼硬寫各引擎格式（Midjourney 預設／v7／v6.1）。請改為可編輯的資料驅動設定，並加入選填的進階參數。
請先閱讀 docs/PROMPT_FORMATS.md。從 A1 開始，並特別考慮：
- 把 ENGINES 抽成 config_sheets 下的 JSON（含 family、version、是否支援 ::、--no 上限等），並在 npm run validate 與測試中驗證；版本與參數支援狀態要有明確的「資料來源與查證日期」欄位，且你必須先上網查證目前 Midjourney 官方文件，無法確認的標示為待確認，不要憑記憶。
- 選填欄位（--stylize、--chaos、--style raw、--seed、--weird）的 UI 位置、預設值、是否納入工作階段（session.js 的 sanitize 與版本相容）、i18n 與說明文字。
- 引擎選單改由設定檔產生時，如何維持現有 option id 與已存的工作階段相容。
```

### F7. 鎖定整個分類與手動選取的同組互斥

```text
功能：(1) 分類標題可「鎖定」，重抽時整個分類保持不變（釘選的延伸）；(2) 手動點選標籤時，可選擇「同群組只留一個」（點第二個標籤時取代而非疊加），預設關閉。
請從 A1 開始，並特別考慮：鎖定狀態是否存入工作階段（session-ui.js capture／apply 與 session.js sanitize）、與釘選的關係與優先順序、randomizer.js 的介面（建議新增 lockedSheets 或在呼叫端過濾）、手動互斥與 group 資料的關係（group 只在同一分類檔內有效）、清空與剔除時的行為、i18n 與無障礙（鎖定按鈕需要 aria-pressed）。
```

---

## 撰寫提示詞的小技巧

- **一次一個階段，一個階段一個停點**：結果不對時，在同一階段修正，不要跳關。
- **給驗收條件而不是實作細節**：描述「使用者看到什麼、會發生什麼」，讓 AI 自己決定怎麼做，再由 A2／C2 的計畫審查。
- **要求證據**：「貼出測試結果」「附截圖或輸出值」比「確認已完成」可靠。
- **限制範圍**：明確寫「只改與此相關的程式，其他發現列清單」，避免一次改一大堆。
- **新對話一定先貼背景**，並上傳最新的專案 zip；若手上有舊 zip，請確認版本與 CHANGELOG 一致。
- 專案規則改了（例如新增了 CI 或改了版本政策），記得同步更新 [0. 專案背景提示詞](#0-專案背景提示詞每次新對話都先貼) 本身。
