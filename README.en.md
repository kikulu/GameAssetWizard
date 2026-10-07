# Game Asset Prompt Generator

[繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

A JSON-library-driven prompt generator for game art. It helps mobile and Steam/PC teams compose prompts for characters, scenes, UI, icons, and store assets.

## Features

- Six mobile/Steam and general/2D/3D creative profiles.
- Editable JSON prompt libraries, random selection, tag weighting, and prompt copy.
- Local generation through Draw Things, SD WebUI/Forge, or ComfyUI.
- Advanced controls for sampler, scheduler, seed, batch, denoise, checkpoint, VAE, LoRA, ControlNet, and ComfyUI API workflows.
- Interface languages: Traditional Chinese, English, Japanese, and Korean.

## Quick start

```bash
npm start
```

Open `http://127.0.0.1:3000`. Node.js 18+ is required; no third-party runtime packages are required.

## Desktop app (Electron)

```bash
npm install          # desktop only; installs electron and electron-builder
npm run electron     # run the desktop app
npm run dist         # build an installer for the current OS (output: release/)
```

The desktop app sends requests to local generators from the main process, so no CORS proxy is needed. See [Desktop guide](docs/DESKTOP.md).

## Style lock and batch generation

Save a style preset (style prefix, negative prompt, parameters, seed), lock it, and generate a whole asset list in one consistent style. Presets can be exported and shared as JSON. See [Style consistency workflow](docs/STYLE_CONSISTENCY.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Local generator setup](docs/LOCAL_GENERATORS.md)
- [Roadmap](docs/ROADMAP.md)
- [Desktop guide](docs/DESKTOP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Config sheet formats](docs/CONFIG_SHEETS.md)
- [Style consistency workflow](docs/STYLE_CONSISTENCY.md)
- [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)

## Author

[kikulu](https://github.com/kikulu)
