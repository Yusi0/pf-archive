import { autocompletion, snippetCompletion } from '@codemirror/autocomplete';

// "/" at the start of a line (or after whitespace) opens a template menu. Picking one inserts a
// snippet; Tab / Shift+Tab jump between its blanks.

const weapon = [
  '### ${1:무기명}',
  '${2}',
  '',
  ':::graph',
  '@${3:무기명}',
  '40 @ 50',
  '34 @ 100',
  '1.4, 1.1, 1.0',
  ':::',
  '',
  '| **해금 랭크** |${4}랭크 |',
  '| **분류** |${5}',
  '| **연사력** |${6}',
  '| **탄속** |${7}studs/s |',
  '| **관통력** |${8}studs |',
  '| **탄창** |${9}',
  '| **장전 속도** |${10}',
  '| **설명** |${11}',
  '',
  '- [+] ${12}',
  '- [-] ${13}',
].join('\n');

const ITEMS = [
  { label: 'weapon', detail: '무기 틀 (제목·그래프·스탯 표·장단점)', template: weapon },
  {
    label: 'graph',
    detail: '데미지 그래프 블록',
    template: [':::graph', '@${1:무기명}', '40 @ 50', '34 @ 100', '1.4, 1.1, 1.0', ':::'].join('\n'),
  },
  {
    label: 'compare',
    detail: '총기 비교표 (연사력·피해·TTK 등 + 피해 그래프)',
    template: [':::compare', '${1:SPEAR LT}, ${2:VZ. 808}', '거리: 50', ':::'].join('\n'),
  },
  {
    label: 'variants',
    detail: '한 총의 부착물·탄약 비교 (기본 + 변형)',
    template: [':::compare', '${1:UAR A3}', '변형: 탄약 전체', ':::'].join('\n'),
  },
  {
    label: 'gallery',
    detail: '이미지를 가로로 나열 (옆으로 스크롤)',
    template: [':::gallery', '![](${1})', '![](${2})', ':::'].join('\n'),
  },
  {
    label: 'fold',
    detail: '접기 블록',
    template: ['::: ${1:제목}', '${2}', ':::'].join('\n'),
  },
  {
    label: 'callout',
    detail: '안내 상자 (info / note / warning / danger)',
    template: ['> [!${1:info}] ${2:제목}', '> ${3}'].join('\n'),
  },
  {
    label: 'table',
    detail: '헤더 있는 표',
    template: ['| ${1:항목} | ${2:값} |', '|---|---|', '| ${3} | ${4} |'].join('\n'),
  },
];

const completions = ITEMS.map(({ label, detail, template }) =>
  snippetCompletion(template, { label, detail, type: 'keyword' }),
);

function slashSource(context) {
  const word = context.matchBefore(/\/[A-Za-z]*/);
  if (!word) return null;
  const before = context.state.sliceDoc(Math.max(0, word.from - 1), word.from);
  // Only at the start of a line or after whitespace (so URLs and "a/b" are left alone)
  if (word.from !== 0 && before !== '\n' && !/\s/.test(before)) return null;
  return { from: word.from, options: completions.map((c) => ({ ...c, label: '/' + c.label })), validFor: /^\/[A-Za-z]*$/ };
}

export const slashMenu = autocompletion({
  override: [slashSource],
  icons: false,
  activateOnTyping: true,
});
