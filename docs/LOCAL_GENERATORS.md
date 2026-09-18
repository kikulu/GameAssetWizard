# 本機產圖後端設定

工作台支援 Draw Things、AUTOMATIC1111／Forge 的 SD WebUI API，以及 ComfyUI。所有連線由瀏覽器直接送往本機後端；不會把提示詞或圖片上傳到專案伺服器。

## Draw Things

- 預設位址：`http://127.0.0.1:7860`
- 在 Draw Things 設定中開啟 HTTP API Server。
- 支援提示詞、負面提示詞、尺寸、steps、CFG、sampler、seed、batch。

## SD WebUI / Forge

- 預設位址：`http://127.0.0.1:7860`
- 請以 `--api` 啟動 WebUI，例如在 `webui-user.bat` 設定 `COMMANDLINE_ARGS=--api`。
- 使用 `/sdapi/v1/txt2img`，支援 checkpoint、VAE、CLIP skip、LoRA prompt 語法、denoise、scheduler、batch，及已安裝 ControlNet extension 時的基本 ControlNet 欄位。
- ControlNet extension 各版本的 API 參數可能不同；若失敗，請先清空 ControlNet 欄位確認基本 txt2img 流程。

## ComfyUI

- 預設位址：`http://127.0.0.1:8188`
- 預設會提交 CheckpointLoaderSimple → CLIPTextEncode → EmptyLatentImage → KSampler → VAEDecode → SaveImage 工作流。
- 在 Checkpoint 欄位填入 ComfyUI 的 checkpoint 檔名；未填時會使用 `model.safetensors`，請改成實際檔名。
- 有自訂節點、LoRA、ControlNet、Refiner 或圖生圖需求時，在 ComfyUI 用 **Save (API Format)** 匯出 workflow JSON 後貼入。自訂 workflow 會原樣提交，請先在 ComfyUI 驗證。

## 參數建議

| 情境 | Steps | CFG | Denoise | 說明 |
| --- | ---: | ---: | ---: | --- |
| 快速草稿 | 16–24 | 5–7 | 0.55–0.7 | 優先迭代構圖 |
| 遊戲角色 | 28–40 | 6–8 | 0.6–0.75 | 預設建議範圍 |
| 高細節素材 | 35–50 | 5–7 | 0.65–0.8 | 增加 VRAM 與時間成本 |

每個後端的 API 位址會保存在瀏覽器 localStorage；清除網站資料即可重設。
