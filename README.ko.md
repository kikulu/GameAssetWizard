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
- [스타일 일관성 워크플로](docs/STYLE_CONSISTENCY.md)
- [변경 기록](CHANGELOG.md) · [기여 가이드](CONTRIBUTING.md)

## 작성자

[kikulu](https://github.com/kikulu)

## 라이선스

[MIT License](LICENSE)로 배포됩니다. Copyright (c) 2026 kikulu.
