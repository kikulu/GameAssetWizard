# Game Asset Prompt Generator

[繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

JSON 辞書をベースに、ゲーム用キャラクター、背景、UI、アイコン、ストア素材の画像生成プロンプトを作成するツールです。モバイルゲームと Steam/PC 向けの制作に対応しています。

## 主な機能

- モバイル/Steam と 総合/2D/3D の 6 プロファイル
- 編集可能な JSON 辞書、ランダム選択、タグの重み付け、プロンプトコピー
- Draw Things、SD WebUI/Forge、ComfyUI によるローカル生成
- sampler、scheduler、seed、batch、denoise、checkpoint、VAE、LoRA、ControlNet、ComfyUI API workflow の詳細設定
- 繁体字中国語、英語、日本語、韓国語の UI

## 起動方法

```bash
npm start
```

`http://127.0.0.1:3000` を開きます。Node.js 18 以上が必要です。追加の実行時パッケージは不要です。

## ドキュメント

- [アーキテクチャ](docs/ARCHITECTURE.md)
- [開発ガイド](docs/DEVELOPMENT.md)
- [ローカル生成バックエンド設定](docs/LOCAL_GENERATORS.md)
- [ロードマップ](docs/ROADMAP.md)
