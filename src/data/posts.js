export const POSTS = [
  {
    id: "pf-revamp-engine-overview",
    slug: "pf-revamp-engine-overview",
    title: "[PF Revamp] Phantom Forces 차세대 엔진 리워크 & 모션 시스템 종합 아카이브",
    date: "2026-09-20",
    summary: "Phantom Forces의 대규모 리워크 프로젝트인 PF Revamp의 핵심 변경사항을 정리합니다. 새로운 물리 엔진, 무기 반동 모션, 틱레이트 개선 및 애니메이션 시스템 수정을 상세히 다룹니다.",
    content: `
# Phantom Forces Revamp: 엔진 리워크 & 모션 시스템 종합 아카이브

Phantom Forces 개발팀 Stylis Studios에서 진행 중인 <mark>PF Revamp</mark> 프로젝트는 단순한 그래픽 업데이트를 넘어 게임의 가상 커스텀 엔진 프레임워크 자체를 재설계하는 대규모 아카이빙 프로젝트입니다.[^1: **중요:** 9월 20일 [r|#roadmap] 메시지 기준입니다.]

이 문서에서는 지금까지 공개된 PF Revamp 테스트 서버(Test Place)의 변경사항과 개발자 디스코드 노트를 종합하여 아카이빙합니다.

---

## 1. 개요 및 주요 핵심 목표

PF Revamp의 주요 목표는 2015년부터 축적된 기존 Luau 레거시 코드베이스를 완전히 현대화하고, <span style="color: #f97316;">네트워크 틱레이트 안정성</span> 및 관성(Inertia) 이동 모션을 현실적으로 개편하는 것입니다.

* **네트워크 틱레이트 개선**: 서버 렌더링 프레임 60Hz 고정 및 패킷 동기화 최적화
* **무기 반동 애니메이션(Procedural Recoil)**: 카메라 반동과 무기 절차적 반동 분리
* **슬라이딩 & 조작감 개편**: 기존의 무제한 슬라이딩 취약점 수정 및 충돌 판정 정상화

> **Stylis Dev Quote:**
> *"Revamp는 단순한 무기 모델링 변경이 아닌, 향후 5년 이상 지속 가능한 Phantom Forces의 코어 엔진 프레임워크 재설계 작업입니다."*

---

## 2. 모션 물리 및 이동(Movement) 시스템 변경점

기존 Phantom Forces에서는 슬라이드 캔슬(Slide Cancel)과 엠페러 홉(Emperor Hop) 등의 물리 버그 기반 테크닉이 승패를 좌우했습니다. Revamp에서는 물리 가속도 공식이 다음과 같이 수정되었습니다.

::: 레거시 vs Revamp 이동 물리 상세 비교
| **구문 구분** | **레거시 PF** | **PF Revamp** |
|---|---|---|
| 기본 조깅 속도 | 16 studs/s | 16.5 studs/s |
| 전술 스프린트 | 20 studs/s | 21 studs/s |
| 슬라이딩 관성 유지 | 최대 1.8초 | 최대 1.1초 |
:::

---

## 3. 무기 절차적 반동 시스템 (Procedural Motion)

Revamp에서는 무기가 발사될 때 전사(Soldier)의 어깨 부착 지점과 그립 지점을 기반으로 3차원 절차적 반동이 발생합니다.[^2: 개발팀 공식 영상에서 검증된 사양입니다.]

[[https://www.youtube.com/watch?v=dQw4w9WgXcQ]]

---

## 4. 결론 및 향후 아카이빙 계획

PF Revamp는 현재 Test Place에서 커뮤니티 피드백을 수집하며 주기적인 빌드 업데이트가 이루어지고 있습니다.[^1: **중요:** 9월 20일 [r|#roadmap] 메시지 기준입니다.]

본 아카이브에서는 패치마다 변경되는 총기 스탯 및 맵 리워크 소식을 지속적으로 서술할 예정입니다.
    `
  },
  {
    id: "weapon-balance-2026-q3",
    slug: "weapon-balance-2026-q3",
    title: "[밸런스 패치] 2026 Q3 돌격소총(Assault Rifle) 메타 분석 및 스탯 변경표",
    date: "2026-09-15",
    summary: "2026년 3분기 밸런스 패치로 변경된 M4A1, AK47, HK416 및 C7A2의 딜레이, 사거리, 데미지 감쇄 수치를 한눈에 비교 분석합니다.",
    content: `
# 2026 Q3 돌격소총(Assault Rifle) 메타 분석 & 스탯 변경표

이번 3분기 패치에서는 장거리 근접 교전에서 우위를 점하던 고연사 소총들의 데미지 감쇄(Damage Dropoff) 거리 및 사격 후 조준선 회복 속도가 집중 조절되었습니다.[^1: 2026 Q3 공식 패치노트 참조.]

---

## 1. 주요 돌격소총 스탯 비교

| **Weapon** | [r|Damage] |
|---|---|
| *M4A1* | ==32 → 19== |
| *AK47* | ==40 → 25== |
| *HK416* | ==30 → 18== |

[^1: 2026 Q3 공식 패치노트 참조.]
    `
  }
];
