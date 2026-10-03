import React from 'react';

export default function AboutPage() {
  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      <header className="article-header">
        <h1 className="article-title">About</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
          Phantom Forces Revamp Personal Archive
        </p>
      </header>

      <section className="markdown-body">
        <h2>About This Archive</h2>
        <p>
          본 사이트는 Roblox FPS 게임 <em>Phantom Forces</em>의 차세대 프레임워크 리워크(PF Revamp), 무기 밸런스 패치 스탯, 맵 구조 변경점 및 기술 자료를 아카이빙하는 개인 기록 공간입니다.
        </p>
        <p>
          일회성 소식으로 소실되기 쉬운 정보들을 마크다운 문서로 축적하며, <strong>Pretendard JP</strong> 서체와 무채색 텍스트 중심 레이아웃으로 담백하고 오랫동안 읽기 편한 독서 환경을 지향합니다.
        </p>

        <h2>Design Principles</h2>
        <ul>
          <li><strong>No SaaS Slop / No Hero Cards</strong>: 둥근 카드, 과도한 라운딩, 장식용 아이콘, 그라데이션을 모두 제거했습니다.</li>
          <li><strong>Monochromatic Palette</strong>: 무채색(`#111111`, `#181818`, `#888888`, `#eeeeee`) 위주로 구성하며 주황색 포인트 컬러는 필수적인 구분에만 제한적으로 사용합니다.</li>
          <li><strong>Text & Typography First</strong>: 텍스트 본문과 마크다운 요소(표, 코드 블록, 인용문, YouTube embed)에 최우선 집중합니다.</li>
        </ul>
      </section>
    </div>
  );
}
