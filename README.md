# PF Archive (Phantom Forces Update Archive)

Phantom Forces 테스트 서버 및 프로덕션 서버 패치노트 아카이브 웹 애플리케이션입니다.

- **사이트 주소**: [https://yusi0.github.io/pf-archive/](https://yusi0.github.io/pf-archive/)
- **주요 기능**:
  - 커스텀 마크다운 파서 (7색상 팔레트, 형광펜 하이라이트, 테이블 셀 배경색, 본문 각주 팝오버, 미디어 임베드)
  - 미니멀 SVG 무기 대미지/사거리 프로필 차트 (`:::graph`)
  - 총기·부착물 비교표 + 피해 곡선 겹쳐 보기 (`:::compare`, 문법은 에디터의 `?` 도움말 8-2 참고)
  - 접이식 헤딩(H1~H6) 및 대미지 그래프 일괄 접기/펼치기
  - 탭 기반 계층형 트리 리스트 (상위/하위 리스트 접기/펼치기)
  - 심플 & 모던 무테 목차 (Sticky Table of Contents)
  - 실시간 웹 에디터 및 이미지 붙여넣기 지원
  - 다크 / 라이트 모드 전환

## 로컬 개발 환경 실행

```bash
npm install
npm run dev
```

## 비교표(`:::compare`) 데이터 갱신

`public/data/compare/`의 파일은 직접 고치지 않고 **RecoilSim**의 canonical 데이터에서 뽑습니다. 패치로 RecoilSim 데이터가 바뀌면 다시 내보내고 커밋하세요.

```bash
cd ../RecoilSim
npx ts-node --project tsconfig.json scripts/export_compare_stats.ts
```

- 무기 기본 스탯은 `<버전>/weapons.json`, 부착물·탄약 변형(Ammo 슬롯)은 `<버전>/variants/<무기id>.json`입니다. 변형은 게임의 수정값 엔진으로 계산해 기본값과 달라지는 항목만 담습니다.
- 다른 슬롯도 필요하면 `--slots Ammo,Barrel`처럼 지정합니다(파일이 그만큼 늘어납니다).
- 비교 로직 테스트: `npm test` (내보낸 데이터를 읽으므로 데이터를 갱신한 뒤 실행해 값이 맞는지 확인).

## 프로덕션 빌드

```bash
npm run build
```
