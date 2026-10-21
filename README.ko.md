# Game Asset Prompt Generator

[繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

JSON 라이브러리를 기반으로 게임 캐릭터, 배경, UI, 아이콘, 스토어 에셋용 이미지 생성 프롬프트를 만드는 도구입니다. 모바일 게임과 Steam/PC 제작 흐름을 지원합니다.

## 주요 기능

- 모바일/Steam 및 종합/2D/3D의 6개 제작 프로필
- 편집 가능한 JSON 라이브러리, 무작위 선택, 태그 가중치, 프롬프트 복사
- Draw Things, SD WebUI/Forge, ComfyUI 로컬 생성 지원
- sampler, scheduler, seed, batch, denoise, checkpoint, VAE, LoRA, ControlNet, ComfyUI API workflow 상세 설정
- 번체 중국어, 영어, 일본어, 한국어 UI

## 시작하기

```bash
npm start
```

`http://127.0.0.1:3000`을 여세요. Node.js 18 이상이 필요하며 추가 런타임 패키지는 필요하지 않습니다.

## 주요 추가 기능 (v1.6)

- 태그를 📌 고정하고 카테고리 전체를 🔒 잠그면 다시 추첨해도 유지되고 나머지만 바뀝니다. 수동 선택에서는 "같은 그룹은 하나만" 옵션으로 서로 배타적인 태그가 겹치지 않게 하고 클릭하면 어떤 태그가 교체되는지 표시합니다. 선택한 태그가 있는 카테고리를 한 번에 잠글 수도 있습니다.
- 실행 취소/다시 실행(`Ctrl+Z`)과 원하는 시점으로 이동할 수 있는 기록 목록: 실수로 초기화하거나 다시 추첨해도 되돌릴 수 있습니다. 자세한 내용은 [실행 취소와 기록](docs/HISTORY.md)을 참고하세요.
- 이미지 엔진에 맞춰 프롬프트를 출력합니다 (Stable Diffusion은 `(태그:가중치)`, Midjourney는 `--ar` / `--v` / `--no` 포함, Ideogram·DALL·E 3는 자연스러운 문장). 로컬 생성은 항상 Stable Diffusion 형식을 사용합니다.
- 세션을 자동 저장하며 공유 링크(데스크톱 앱은 공유 코드)와 JSON 내보내기/가져오기로 공유할 수 있습니다. API 주소와 생성 파라미터는 포함되지 않습니다.

## 다국어 지원

인터페이스, 태그 라이브러리, 템플릿, 생성 스튜디오가 번체 중국어·English·日本語·한국어를 지원합니다. 태그 라이브러리는 언어와 무관한 구조 파일과 언어별 라벨 파일로 나뉘어 있으며, 번역 대조표(CSV／Markdown)와 가져오기·검사 도구를 제공합니다. 자세한 내용은 [다국어·번역 가이드](docs/I18N.md)를 참고하세요.

## 데스크톱 앱 (Electron)

```bash
npm install          # 데스크톱 앱에만 필요 (electron, electron-builder 설치)
npm run electron     # 데스크톱 앱 실행
npm run dist         # 현재 OS용 설치 파일 빌드 (출력: release/)
```

데스크톱 앱은 메인 프로세스에서 로컬 생성 백엔드로 요청을 보내므로 CORS 프록시가 필요하지 않습니다. 자세한 내용은 [데스크톱 가이드](docs/DESKTOP.md)를 참고하세요.

## 스타일 잠금 및 일괄 생성

스타일 프리셋(스타일 프롬프트, 네거티브 프롬프트, 파라미터, 시드)을 저장하고 잠근 뒤, 에셋 목록을 같은 스타일로 한 번에 생성할 수 있습니다. 프리셋은 JSON으로 내보내고 공유할 수 있습니다. 자세한 내용은 [스타일 일관성 워크플로](docs/STYLE_CONSISTENCY.md)를 참고하세요.

## 문서

- [아키텍처](docs/ARCHITECTURE.md)
- [개발 가이드](docs/DEVELOPMENT.md)
- [로컬 생성 백엔드 설정](docs/LOCAL_GENERATORS.md)
- [로드맵](docs/ROADMAP.md)
- [데스크톱 가이드](docs/DESKTOP.md)
- [배포](docs/DEPLOYMENT.md)
- [라이브러리·설정 파일 형식](docs/CONFIG_SHEETS.md)
- [태그 라이브러리 개요와 작성 가이드](docs/TAG_LIBRARY.md)
- [스타일 일관성 워크플로](docs/STYLE_CONSISTENCY.md)
- [무작위 추첨·고정·잠금](docs/RANDOM_PICK.md)
- [실행 취소와 기록](docs/HISTORY.md)
- [이미지 엔진별 프롬프트 형식](docs/PROMPT_FORMATS.md)
- [세션: 자동 저장과 공유](docs/SESSION.md)
- [다국어·번역 가이드](docs/I18N.md) · [번역 대조표](docs/i18n/translation-table.md)
- [변경 기록](CHANGELOG.md) · [기여 가이드](CONTRIBUTING.md)

## 작성자

[kikulu](https://github.com/kikulu)

## 라이선스

[MIT License](LICENSE)로 배포됩니다. Copyright (c) 2026 kikulu.
