---
title: "AxisAngle - 250505 #roadmap 공지"
date: "2026-09-24"
summary: "서버 권한 구조를 통한 안티치트와 자체 물리엔진 개발, 이동/충돌 매커니즘 세부 개선 등"
---

## 보안 개편

::: 원문
Hello everyone.  

I thought I should also try my hand a writing an update so the roadmap can cover a wider variety of things which are in the works for our next major update coming sometime late this year.  

**Security Update Roadmap**  
We want to make the game more secure to reduce exploits and lessen the burden on our moderation team.  

**Server Authoritative Architecture**  
To make the game more secure, we'll be transitioning many elements of our game to a server authoritative system. This means your device will only send basic inputs (mouse movements, keypresses) while game logic will execute server-side, permanently eliminating whole classes of state exploits where the client can modify its state and report hacked state to the server. (Rendering exploits like ESP and input exploits like aimbot are still possible, but we can work on these later)  

**Required System Upgrades**  
This transition necessitates rebuilding several core systems including:

* Gun system  
* Third-person rendering  
* Camera system  
* Character physics  

After rebuilding each of these components, server authority will be activated and Phantom Forces will have industry-leading server authority (And on Roblox, no less!).  

**Character Physics Development**  
The most challenging part of this journey is recreating the character movement system. From the beginning, Phantom Forces has used Roblox's default Humanoid system, which you're all familiar with (used in almost every Roblox game!). Our first milestone will be replacing Roblox Humanoids with our own custom implementation. Ideally, we are building a drop-in replacement for Roblox Humanoids. We're excited about this step because it enables several things: 
 
* Better security (as mentioned above)  
* More trust, less rubberbanding: the system will NEVER despawn or set you back or limit your velocity.  
* Less spongy, less jittery: the system will have better defined behavior than the existing Roblox Humanoid while trying to maintain the intentional feel.  

The current testing is quite promising. Several major breakthroughs have been made only in the past month on making better character physics.  

* More responsive: 0-frame delay between input and execution. (PF Currently has 1-2 frames of delay)  
* Resizable, smoother collider: can change the shape of the collider when crouching or prone to prevent catching surfaces.  
* Reduced collision issues: less or no jittering when pushing into walls, railing or corners.  
:::
::: 번역본
여러분 안녕하세요.  

올해 말 예정된 다음 대규모 업데이트를 위해 준비 중인 다양한 작업들을 로드맵에 담아보고자 저도 개발 소식을 직접 작성해보게 되었습니다.  

**보안 업데이트 로드맵**  
저희는 핵(Exploit)을 줄이고 운영팀의 부담을 덜기 위해 게임의 보안을 한층 더 강화하고자 합니다.  

**서버 권한(Server Authoritative) 아키텍처**  
게임의 보안성을 높이기 위해 게임 내 수많은 요소를 '서버 권한 시스템'으로 전환할 예정입니다. 즉, 여러분의 기기(클라이언트)는 오직 기본적인 입력값(마우스 움직임, 키보드 입력)만을 전송하고, 모든 게임 로직은 서버 측에서 직접 실행됩니다. 이를 통해 클라이언트가 자신의 상태를 임의로 조작하여 해킹된 정보를 서버로 보고하는 형태의 '상태 변조 핵' 계열을 완전히, 영구적으로 근절할 수 있습니다. (ESP 같은 렌더링 핵이나 에임봇 같은 입력 핵은 여전히 존재할 수 있지만, 이는 추후에 대응해 나갈 수 있습니다.)  

**필수 시스템 업그레이드**  
이러한 전환을 위해서는 다음과 같은 핵심 시스템들을 밑바닥부터 다시 구축해야 합니다.

* 총기 시스템  
* 3인칭 렌더링  
* 카메라 시스템  
* 캐릭터 물리 엔진  

이 구성 요소들을 모두 재구축하고 나면 서버 권한 체계가 활성화되며, 팬텀 포스는 (그것도 무려 로블록스 환경에서!) 업계 최고 수준의 서버 권한 시스템을 갖추게 될 것입니다.  

**캐릭터 물리 엔진 개발**  
이 여정에서 가장 어려운 부분은 캐릭터 이동 시스템을 새롭게 다시 만드는 일이었습니다. 처음부터 팬텀 포스는 여러분 모두에게 익숙한 로블록스 기본 '휴머노이드(Humanoid)' 시스템(거의 모든 로블록스 게임에서 쓰이는 시스템)을 사용해 왔습니다. 우리의 첫 번째 마일스톤은 이 로블록스 휴머노이드를 저희가 자체 개발한 커스텀 물리 시스템으로 완전히 교체하는 것입니다. 이상적으로는 기존 휴머노이드 자리에 그대로 끼워 넣을 수 있는 대체재(drop-in replacement)를 목표로 구축 중입니다. 이 작업이 기대되는 이유는 다음과 같은 개선이 가능해지기 때문입니다.

* 보안성 대폭 강화 (앞서 언급한 바와 같음)  
* 신뢰성 향상 및 러버밴딩(위치 롤백) 감소: 시스템이 플레이어를 강제로 디스폰시키거나, 뒤로 되돌리거나(백트랙), 속도를 강제로 제한하는 일이 절대로 발생하지 않습니다.  
* 흐물거리거나 덜덜 떨리는 현상 완화: 의도된 고유의 조작감은 유지하면서도, 기존 로블록스 휴머노이드보다 훨씬 명확하고 정교한 물리 동작을 제공합니다.  

현재 테스트 결과는 대단히 유망합니다. 지난 한 달 동안 더 뛰어난 캐릭터 물리를 구현하는 데 있어 여러 중대한 기술적 돌파구를 마련했습니다.
  
* 극대화된 반응성: 키 입력과 실행 사이의 딜레이가 0프레임입니다. (현재 PF는 1~2프레임의 지연이 존재함)  
* 가변적이고 부드러운 충돌체(Collider): 웅크리거나 엎드릴 때 충돌체의 크기와 모양을 유연하게 변경하여 오브젝트 표면에 걸리는 현상을 방지합니다.  
* 충돌 버그 대폭 감소: 벽, 난간, 모서리에 몸을 비빌 때 화면이나 캐릭터가 덜덜 떨리는 현상이 거의 없거나 완전히 사라집니다.  
:::
서버 권한(Server Authoritative) 구조 도입과 자체 물리 엔진 개발이 주된 내용인데... 과연 됐을지?