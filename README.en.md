# Game Asset Prompt Generator

[繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

A JSON-library-driven prompt generator for game art. It helps mobile and Steam/PC teams compose prompts for characters, scenes, UI, icons, and store assets.

## Features

- Six mobile/Steam and general/2D/3D creative profiles.
- Editable JSON prompt libraries (18 categories, 361 tags: camera, characters, costumes, scenes, effects, creatures, vehicles, materials, lighting, color palettes, layout examples, store assets…), tag weighting, and prompt copy.
- Creative template packs in a collapsible panel: click a row to apply, click again to remove.
- Pin tags with 📌 and lock whole categories with 🔒: re-rolls keep what you like and only change the rest. An optional "one per group" mode keeps mutually exclusive tags from stacking when you select manually and shows which tag a click would replace; one click locks every category that already has tags.
- Undo / redo (`Ctrl+Z`) with a history list you can jump through: recover from an accidental clear or re-roll. See [Undo and history](docs/HISTORY.md).
- Engine-aware prompt output: `(tag:weight)` for Stable Diffusion, `--ar` / `--v` / `--no` for Midjourney, natural sentences for Ideogram and DALL·E 3 (local generation always uses the Stable Diffusion format). See [Prompt formats](docs/PROMPT_FORMATS.md).
- Autosaved sessions with shareable links (a share code on desktop) and JSON export/import; API addresses and generation parameters are never included. See [Sessions](docs/SESSION.md).
- Group-aware random picking: one pick per group (never four poses at once), no immediate repeats on re-roll, and a per-category 🎲 re-roll. See [Random picking](docs/RANDOM_PICK.md).
- Local generation through Draw Things, SD WebUI/Forge, or ComfyUI.
- Advanced controls for sampler, scheduler, seed, batch, denoise, checkpoint, VAE, LoRA, ControlNet, and ComfyUI API workflows.
- Fully localized interface, tag libraries, templates and generation studio in Traditional Chinese, English, Japanese, and Korean. Tag libraries are split into a language-neutral structure plus per-language label files, with a translation lookup table and import/check tooling. See the [i18n guide](docs/I18N.md).

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
- [Tag library overview and writing guide](docs/TAG_LIBRARY.md) (Traditional Chinese)
- [Style consistency workflow](docs/STYLE_CONSISTENCY.md)
- [Random picking, pinning and locking](docs/RANDOM_PICK.md)
- [Undo and history](docs/HISTORY.md)
- [Prompt formats per engine](docs/PROMPT_FORMATS.md)
- [Sessions: autosave and sharing](docs/SESSION.md)
- [AI-assisted development prompts](docs/AI_DEV_PROMPTS.md) (Traditional Chinese)
- [i18n and translation guide](docs/I18N.md) · [Translation table](docs/i18n/translation-table.md)
- [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)

## Author

[kikulu](https://github.com/kikulu)

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 kikulu.
