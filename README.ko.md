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

## 문서

- [아키텍처](docs/ARCHITECTURE.md)
- [개발 가이드](docs/DEVELOPMENT.md)
- [로컬 생성 백엔드 설정](docs/LOCAL_GENERATORS.md)
- [로드맵](docs/ROADMAP.md)
