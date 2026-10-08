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

## 多言語対応

UI、辞書（タグ）、テンプレート、生成スタジオが繁体字中国語・English・日本語・한국어に対応しています。辞書は言語に依存しない構造ファイルと言語別のラベルファイルに分かれており、翻訳対応表（CSV／Markdown）と、取り込み・検証ツールを用意しています。詳細は[多言語化・翻訳ガイド](docs/I18N.md)を参照してください。

## デスクトップ版（Electron）

```bash
npm install          # デスクトップ版のみ必要（electron と electron-builder）
npm run electron     # デスクトップ版を起動
npm run dist         # 現在の OS 向けインストーラーを作成（出力: release/）
```

デスクトップ版はメインプロセスからローカル生成バックエンドへリクエストを送るため、CORS プロキシは不要です。詳細は[デスクトップ版ガイド](docs/DESKTOP.md)を参照してください。

## スタイルロックとバッチ生成

スタイルプリセット（スタイル用プロンプト、ネガティブプロンプト、パラメーター、シード）を保存してロックし、素材リストを同じスタイルでまとめて生成できます。プリセットは JSON でエクスポート・共有できます。詳細は[スタイル一貫化ワークフロー](docs/STYLE_CONSISTENCY.md)を参照してください。

## ドキュメント

- [アーキテクチャ](docs/ARCHITECTURE.md)
- [開発ガイド](docs/DEVELOPMENT.md)
- [ローカル生成バックエンド設定](docs/LOCAL_GENERATORS.md)
- [ロードマップ](docs/ROADMAP.md)
- [デスクトップ版ガイド](docs/DESKTOP.md)
- [デプロイ](docs/DEPLOYMENT.md)
- [辞書・設定ファイル形式](docs/CONFIG_SHEETS.md)
- [スタイル一貫化ワークフロー](docs/STYLE_CONSISTENCY.md)
- [多言語化・翻訳ガイド](docs/I18N.md) · [翻訳対応表](docs/i18n/translation-table.md)
- [変更履歴](CHANGELOG.md) · [コントリビュート](CONTRIBUTING.md)

## 作者

[kikulu](https://github.com/kikulu)

## ライセンス

[MIT License](LICENSE) の下で公開されています。Copyright (c) 2026 kikulu.
