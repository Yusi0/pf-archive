import React, { useState, useRef, useEffect } from 'react';

// Minimalist, modern palette for damage curves
const CURVE_PALETTES = [
  {
    base: '#38bdf8',  // Sky Blue
    head: '#34d399',  // Mint Green
    torso: '#94a3b8'  // Muted Slate
  },
  {
    base: '#fb923c',  // Coral Orange
    head: '#facc15',  // Gold
    torso: '#cbd5e1'  // Light Slate
  },
  // More curves are needed by :::compare (up to 4 guns); each keeps its own base / head / torso trio
  {
    base: '#a78bfa',  // Violet
    head: '#f0abfc',  // Orchid
    torso: '#c4b5fd'  // Lavender
  },
  {
    base: '#fb7185',  // Rose
    head: '#fda4af',  // Blush
    torso: '#fecdd3'  // Pale Rose
  },
  {
    base: '#2dd4bf',  // Teal
    head: '#5eead4',  // Aqua
    torso: '#99f6e4'  // Pale Aqua
  },
  {
    base: '#a3e635',  // Lime
    head: '#d9f99d',  // Pale Lime
    torso: '#bef264'  // Light Lime
  }
];

// Below this container width the graph switches to a simplified layout (fewer ticks, larger labels)
const COMPACT_BELOW_PX = 520;

// Smallest "nice" step that keeps the tick count within `target` intervals
const niceStep = (max, target, candidates) =>
  candidates.find((s) => max / s <= target) ?? candidates[candidates.length - 1];

// Where the shots-to-kill count rises along a damage curve: [{ range, bullets }] (bullets = the new count)
function btkSteps(points, mult) {
  const steps = [];
  for (let i = 0; i < points.length - 1; i++) {
    const d1 = points[i].damage * mult;
    const d2 = points[i + 1].damage * mult;
    if (!(d2 < d1)) continue;
    for (let n = 1; n <= 100; n++) {
      const t = 100 / n;
      if (t >= d1) continue;
      if (t <= d2) break;
      const ratio = (d1 - t) / (d1 - d2);
      steps.push({ range: points[i].range + ratio * (points[i + 1].range - points[i].range), bullets: n + 1 });
    }
  }
  return steps;
}

let measureCtx = null;
// Pixel width of a label, so the space reserved beside the graph fits it instead of a fixed guess
function textWidth(text, size) {
  try {
    measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
    measureCtx.font = `500 ${size}px ${getComputedStyle(document.body).fontFamily}`;
    return measureCtx.measureText(text).width;
  } catch {
    return text.length * size * 0.65;
  }
}

const shortName = (name, max) => (name.length > max ? `${name.slice(0, max - 1)}…` : name);

export default function WeaponDamageGraph({ graphData }) {
  const [hoverData, setHoverData] = useState(null); // { range, damages: [{ name, part, dmg, hits, color }] }
  const [width, setWidth] = useState(660);
  const svgRef = useRef(null);
  const wrapRef = useRef(null);

  const hasGraph = Boolean(graphData && graphData.valid && graphData.series && graphData.series.length > 0);

  // Draw in real pixels (1 SVG unit = 1 CSS px) so labels keep their size on narrow screens
  useEffect(() => {
    const el = wrapRef.current;
    if (!hasGraph || !el) return undefined;

    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasGraph]);

  if (!graphData || !graphData.valid) return null;
  const { series = [] } = graphData;
  if (series.length === 0) return null;

  // 1. Calculate X axis max range
  let maxInputRange = 0;
  series.forEach(s => {
    if (s.points && s.points.length > 0) {
      const last = s.points[s.points.length - 1];
      if (last.range > maxInputRange) maxInputRange = last.range;
    }
  });

  const maxX = Math.max(150, Math.ceil((maxInputRange + 30) / 25) * 25);
  const minX = 0;

  // 2. Piecewise linear calculation for damage at exact range (returns both total & pellet dmg)
  const calcDamageAt = (points, mult, r) => {
    if (!points || points.length === 0) return { total: 0, pellet: 0 };
    const getPointPellet = (p) => (p.pelletDmg !== undefined ? p.pelletDmg : p.damage);

    if (r <= points[0].range) {
      return {
        total: points[0].damage * mult,
        pellet: getPointPellet(points[0]) * mult
      };
    }
    const last = points[points.length - 1];
    if (r >= last.range) {
      return {
        total: last.damage * mult,
        pellet: getPointPellet(last) * mult
      };
    }

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (r >= p1.range && r <= p2.range) {
        const ratio = (r - p1.range) / (p2.range - p1.range);
        const total = (p1.damage + ratio * (p2.damage - p1.damage)) * mult;
        const p1P = getPointPellet(p1);
        const p2P = getPointPellet(p2);
        const pellet = (p1P + ratio * (p2P - p1P)) * mult;
        return { total, pellet };
      }
    }
    return {
      total: last.damage * mult,
      pellet: getPointPellet(last) * mult
    };
  };

  // 3. Build curve paths
  let minDmg = Infinity;
  let maxDmg = 0;

  const band = series.length > 1;
  const curves = [];
  series.forEach((s, sIdx) => {
    const pal = CURVE_PALETTES[sIdx % CURVE_PALETTES.length];
    const points = s.points || [];
    if (points.length === 0) return;

    const mults = s.multipliers || { head: 1.0, torso: 1.0, limb: 1.0 };

    let parts;
    if (band) {
      // Several guns: one line per gun at torso damage (what BTK is based on), in the gun's own colour
      parts = [{ key: 'torso', name: 'Torso', mult: mults.torso || 1.0, color: pal.base, isBase: true }];
    } else {
      parts = [
        { key: 'base', name: 'Base', mult: 1.0, color: pal.base, isBase: true },
        { key: 'head', name: `Head (x${mults.head})`, mult: mults.head, color: pal.head, dash: '4,4' }
      ];

      if (mults.torso && mults.torso !== 1.0 && mults.torso !== mults.head) {
        parts.push({ key: 'torso', name: `Torso (x${mults.torso})`, mult: mults.torso, color: pal.torso, dash: '2,2' });
      }
    }

    parts.forEach(part => {
      const curvePoints = [];
      const d0 = points[0].damage * part.mult;
      curvePoints.push({ range: 0, damage: d0 });

      points.forEach(p => {
        const d = p.damage * part.mult;
        curvePoints.push({ range: p.range, damage: d, isAnchor: true });
        if (d > maxDmg) maxDmg = d;
        if (d < minDmg) minDmg = d;
      });

      const dLast = points[points.length - 1].damage * part.mult;
      if (points[points.length - 1].range < maxX) {
        curvePoints.push({ range: maxX, damage: dLast });
      }

      if (d0 > maxDmg) maxDmg = d0;
      if (d0 < minDmg) minDmg = d0;

      curves.push({
        seriesName: s.name,
        partName: part.name,
        mult: part.mult,
        color: part.color,
        dash: part.dash,
        isBase: part.isBase,
        seriesIdx: sIdx,
        points: curvePoints,
        anchors: curvePoints.filter(p => p.isAnchor),
        steps: band ? btkSteps(points, part.mult) : []
      });
    });
  });

  // Several guns share one axis that starts 10 below the lowest damage, so the differences are visible
  const minY = band && Number.isFinite(minDmg) ? Math.max(0, Math.floor((minDmg - 10) / 5) * 5) : 0;
  const maxY = Math.ceil((maxDmg + 10) / 10) * 10;

  // Dimensions
  const compact = width < COMPACT_BELOW_PX;
  const svgWidth = Math.max(260, width);
  const svgHeight = compact ? 200 : 220;
  // Several guns: room for the longest "name N발" label at the end of the lines, and no more
  const endLabelFont = compact ? 11 : 12;
  const endLabelWidth = band
    ? Math.ceil(Math.max(...curves.map((c) => {
        const last = c.points[c.points.length - 1].damage;
        return textWidth(`${shortName(c.seriesName, compact ? 6 : 10)} ${Math.ceil(100 / last - 1e-9)}발`, endLabelFont);
      })))
    : 0;
  const margin = compact
    ? { top: 14, right: band ? endLabelWidth + 14 : 18, bottom: 28, left: 32 }
    : { top: 15, right: band ? endLabelWidth + 16 : 20, bottom: 30, left: 35 };
  const axisFontSize = compact ? 11.5 : 10;
  // On narrow screens the hover readout can wrap to two lines (3+ curves, shotgun "NxM (펠릿)").
  // Reserve that height up front so hovering never makes the graph jump.
  const readoutMinHeight = compact && (curves.length > 2 || series.some((s) => s.isShotgun)) ? '3.7em' : '1.8em';
  const anchorRadius = compact ? 3 : 2.5;

  const graphW = svgWidth - margin.left - margin.right;
  const graphH = svgHeight - margin.top - margin.bottom;

  const xToSvg = (x) => margin.left + (x / maxX) * graphW;
  const yToSvg = (y) => margin.top + (1 - (y - minY) / (maxY - minY)) * graphH;
  const endLabels = [];
  if (band) {
    const minGap = compact ? 13 : 14;
    const raw = curves.map((c) => {
      const last = c.points[c.points.length - 1].damage;
      return { c, y: yToSvg(last) + 4, bullets: Math.ceil(100 / last - 1e-9) };
    }).sort((a, b) => a.y - b.y);
    raw.forEach((l, i) => {
      if (i > 0 && l.y < raw[i - 1].y + minGap) l.y = raw[i - 1].y + minGap;
      endLabels.push(l);
    });
  }
  // BTK step markers; a label too close to an earlier one goes below its dot instead of above
  const stepMarkers = [];
  if (band) {
    curves.forEach((c) => c.steps.forEach((st) => {
      stepMarkers.push({
        x: xToSvg(st.range),
        y: yToSvg(calcDamageAt(series[c.seriesIdx].points, c.mult, st.range).total),
        bullets: st.bullets,
        color: c.color,
        below: false
      });
    }));
    stepMarkers.sort((a, b) => a.x - b.x);
    stepMarkers.forEach((m, i) => {
      const crowded = stepMarkers.slice(0, i).filter((o) => Math.abs(o.x - m.x) < 26 && Math.abs(o.y - m.y) < 22 && !o.below).length;
      m.below = crowded > 0;
    });
  }
  const svgToX = (px) => Math.max(0, Math.min(maxX, ((px - margin.left) / graphW) * maxX));

  // Ticks
  const xStep = compact ? niceStep(maxX, 4, [25, 50, 100, 200, 500]) : (maxX > 250 ? 50 : 25);
  const xTicks = [];
  for (let x = 0; x <= maxX; x += xStep) xTicks.push(x);

  const yRange = maxY - minY;
  const yStep = band
    ? niceStep(yRange, compact ? 4 : 5, [5, 10, 20, 25, 50, 100])
    : compact ? niceStep(maxY, 4, [10, 20, 25, 50, 100]) : (maxY > 80 ? 25 : 20);
  const yTicks = [];
  for (let y = Math.ceil(Math.max(minY, 1e-9) / yStep) * yStep; y <= maxY; y += yStep) yTicks.push(y);

  // Mouse move handler
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    if (mouseSvgX >= margin.left && mouseSvgX <= svgWidth - margin.right) {
      const r = Math.round(svgToX(mouseSvgX));
      // Several guns: one entry per gun, torso damage and shots to kill
      const damages = band ? curves.map((c) => {
        const s = series[c.seriesIdx];
        const total = calcDamageAt(s.points, c.mult, r).total;
        return {
          name: c.seriesName,
          part: c.seriesName,
          dmg: Number.isInteger(total) ? total : total.toFixed(1),
          hitsLabel: `${Math.ceil(100 / total - 1e-9)}방`,
          color: c.color
        };
      }) : curves.map(c => {
        const s = series.find(ser => ser.name === c.seriesName) || series[0];
        const dmgObj = calcDamageAt(s.points, c.mult, r);

        let dmgText;
        let hitsLabel;

        if (s.isShotgun && s.pelletCount > 1) {
          const pelletsToKill = Math.ceil(100 / dmgObj.pellet);
          const formattedPellet = Number.isInteger(dmgObj.pellet)
            ? dmgObj.pellet
            : dmgObj.pellet.toFixed(1);
          dmgText = `${formattedPellet}x${s.pelletCount}`;
          hitsLabel = `${pelletsToKill}펠릿`;
        } else {
          const hits = Math.ceil(100 / dmgObj.total);
          dmgText = dmgObj.total.toFixed(1);
          hitsLabel = `${hits}방`;
        }

        return {
          name: c.seriesName,
          part: c.partName.split(' ')[0],
          dmg: dmgText,
          hitsLabel,
          color: c.color
        };
      });
      setHoverData({ range: r, damages });
    } else {
      setHoverData(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div className="minimal-weapon-graph" style={{
      margin: '0.85rem 0 1rem 0',
      padding: '0',
      fontVariantNumeric: 'tabular-nums'
    }}>
      {/* Sleek Top Header Bar */}
      <div style={{
        display: 'flex',
        flexDirection: compact ? 'column' : 'row',
        alignItems: compact ? 'stretch' : 'baseline',
        justifyContent: 'space-between',
        gap: compact ? '0.3rem' : '0.75rem',
        fontSize: '0.78rem',
        marginBottom: '0.65rem',
        paddingBottom: '0.45rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        {/* Left: Weapon title (never wraps mid-name; long "A vs B" titles truncate) */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: 0 }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {series.map(s => s.name).join(' vs ')}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, whiteSpace: 'nowrap', flexShrink: 0 }}>
            Damage Profile
          </span>
        </div>

        {/* Right / second row: Dynamic Readout on hover OR Static Legend.
            Items never break internally; the row wraps between items only. */}
        {hoverData ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.1rem 0.85rem', fontSize: '0.74rem', minHeight: readoutMinHeight }}>
            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{hoverData.range} studs:</span>
            {hoverData.damages.map((d, i) => (
              <span key={i} style={{ color: d.color, whiteSpace: 'nowrap' }}>
                {d.part} <strong style={{ color: 'var(--text-primary)' }}>{d.dmg}</strong>{d.hitsLabel ? ` (${d.hitsLabel})` : ''}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.1rem 0.85rem', fontSize: '0.72rem', color: 'var(--text-muted)', minHeight: readoutMinHeight }}>
            {band && <span>몸통 기준 · 점은 킬에 필요한 발수가 늘어나는 거리</span>}
            {!band && curves.slice(0, 3).map((c, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                <span style={{
                  display: 'inline-block',
                  width: c.dash ? '10px' : '12px',
                  height: '2px',
                  backgroundColor: c.color,
                  borderTop: c.dash ? `1px dashed ${c.color}` : 'none'
                }} />
                <span>{c.partName}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SVG Canvas Area */}
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Subtle Horizontal Grid */}
          {yTicks.map(yVal => {
            const yPos = yToSvg(yVal);
            return (
              <g key={`ygrid-${yVal}`}>
                <line
                  x1={margin.left}
                  y1={yPos}
                  x2={svgWidth - margin.right}
                  y2={yPos}
                  style={{ stroke: 'var(--text-primary)', strokeOpacity: 0.1 }}
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 6}
                  y={yPos + axisFontSize * 0.35}
                  fill="var(--text-muted)"
                  fontSize={axisFontSize}
                  textAnchor="end"
                >
                  {yVal}
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {xTicks.map(xVal => {
            const xPos = xToSvg(xVal);
            return (
              <g key={`xgrid-${xVal}`}>
                {/* Vertical grid line (skipped at 0: the left edge is the y axis) */}
                {xVal > 0 && (
                  <line
                    x1={xPos}
                    y1={margin.top}
                    x2={xPos}
                    y2={svgHeight - margin.bottom}
                    style={{ stroke: 'var(--text-primary)', strokeOpacity: 0.1 }}
                    strokeWidth="1"
                  />
                )}
                <line
                  x1={xPos}
                  y1={svgHeight - margin.bottom}
                  x2={xPos}
                  y2={svgHeight - margin.bottom + 4}
                  style={{ stroke: 'var(--text-primary)', strokeOpacity: 0.22 }}
                />
                <text
                  x={xPos}
                  y={svgHeight - margin.bottom + 6 + axisFontSize}
                  fill="var(--text-muted)"
                  fontSize={axisFontSize}
                  textAnchor="middle"
                >
                  {xVal}st
                </text>
              </g>
            );
          })}

          {/* Base Axis Line */}
          <line
            x1={margin.left}
            y1={svgHeight - margin.bottom}
            x2={svgWidth - margin.right}
            y2={svgHeight - margin.bottom}
            style={{ stroke: 'var(--text-primary)', strokeOpacity: 0.16 }}
            strokeWidth="1"
          />

          {/* Subtle 100 HP Threshold line if in range */}
          {maxY >= 100 && (
            <g key="hp-100-threshold">
              <line
                x1={margin.left}
                y1={yToSvg(100)}
                x2={svgWidth - margin.right}
                y2={yToSvg(100)}
                stroke="rgba(239, 68, 68, 0.22)"
                strokeDasharray="3,3"
                strokeWidth="1"
              />
              <text
                x={svgWidth - margin.right}
                y={yToSvg(100) - 3}
                fill="rgba(239, 68, 68, 0.7)"
                fontSize={compact ? 10 : 8.5}
                textAnchor="end"
              >
                100 HP
              </text>
            </g>
          )}

          {/* Curve Lines */}
          {curves.map((curve, idx) => {
            let pathD = '';
            curve.points.forEach((p, i) => {
              const px = xToSvg(p.range);
              const py = yToSvg(p.damage);
              pathD += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
            });

            return (
              <g key={`curve-${idx}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={curve.color}
                  strokeWidth={curve.isBase ? '2' : '1.5'}
                  strokeDasharray={curve.dash || undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Anchor Points */}
                {!band && curve.anchors.map((ap, pIdx) => (
                  <circle
                    key={`pt-${pIdx}`}
                    cx={xToSvg(ap.range)}
                    cy={yToSvg(ap.damage)}
                    r={anchorRadius}
                    fill={curve.color}
                  />
                ))}
              </g>
            );
          })}

          {/* Several guns: BTK step markers and end-of-line names */}
          {band && stepMarkers.map((m, i) => (
            <g key={`step-${i}`}>
              <circle cx={m.x} cy={m.y} r={compact ? 4.5 : 4} fill={m.color} stroke="var(--bg-primary)" strokeWidth="1.5" />
              <text x={m.x} y={m.below ? m.y + axisFontSize + 6 : m.y - 8} fill="var(--text-primary)" fontSize={axisFontSize} textAnchor="middle">{m.bullets}발</text>
            </g>
          ))}
          {endLabels.map((l, i) => (
            <text key={`end-${i}`} x={svgWidth - margin.right + 8} y={l.y} fontSize={compact ? 11 : 12} fontWeight="500" fill={l.c.color}>
              {shortName(l.c.seriesName, compact ? 6 : 10)}
              <tspan fill="var(--text-muted)" fontWeight="400"> {l.bullets}발</tspan>
            </text>
          ))}

          {/* Vertical Hairline Guide on Hover */}
          {hoverData && (
            <g>
              <line
                x1={xToSvg(hoverData.range)}
                y1={margin.top}
                x2={xToSvg(hoverData.range)}
                y2={svgHeight - margin.bottom}
                style={{ stroke: 'var(--text-primary)', strokeOpacity: 0.3 }}
                strokeDasharray="2,2"
                strokeWidth="1"
              />

              {curves.map((curve, idx) => {
                const s = series[curve.seriesIdx] || series[0];
                const dmgAt = calcDamageAt(s.points, curve.mult, hoverData.range);
                return (
                  <circle
                    key={`hover-dot-${idx}`}
                    cx={xToSvg(hoverData.range)}
                    cy={yToSvg(dmgAt.total)}
                    r="3.5"
                    fill={curve.color}
                    stroke="var(--bg-primary)"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
