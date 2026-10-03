import React, { useState, useRef } from 'react';

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
  }
];

export default function WeaponDamageGraph({ graphData }) {
  const [hoverData, setHoverData] = useState(null); // { range, damages: [{ name, part, dmg, hits, color }] }
  const svgRef = useRef(null);

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

  // 2. Piecewise linear calculation for damage at exact range
  const calcDamageAt = (points, mult, r) => {
    if (!points || points.length === 0) return 0;
    if (r <= points[0].range) return points[0].damage * mult;
    const last = points[points.length - 1];
    if (r >= last.range) return last.damage * mult;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (r >= p1.range && r <= p2.range) {
        const ratio = (r - p1.range) / (p2.range - p1.range);
        return (p1.damage + ratio * (p2.damage - p1.damage)) * mult;
      }
    }
    return last.damage * mult;
  };

  // 3. Build curve paths
  let minDmg = 0;
  let maxDmg = 0;

  const curves = [];
  series.forEach((s, sIdx) => {
    const pal = CURVE_PALETTES[sIdx % CURVE_PALETTES.length];
    const points = s.points || [];
    if (points.length === 0) return;

    const mults = s.multipliers || { head: 1.0, torso: 1.0, limb: 1.0 };

    const parts = [
      { key: 'base', name: 'Base', mult: 1.0, color: pal.base, isBase: true },
      { key: 'head', name: `Head (x${mults.head})`, mult: mults.head, color: pal.head, dash: '4,4' }
    ];

    if (mults.torso && mults.torso !== 1.0 && mults.torso !== mults.head) {
      parts.push({ key: 'torso', name: `Torso (x${mults.torso})`, mult: mults.torso, color: pal.torso, dash: '2,2' });
    }

    parts.forEach(part => {
      const curvePoints = [];
      const d0 = points[0].damage * part.mult;
      curvePoints.push({ range: 0, damage: d0 });

      points.forEach(p => {
        const d = p.damage * part.mult;
        curvePoints.push({ range: p.range, damage: d, isAnchor: true });
        if (d > maxDmg) maxDmg = d;
      });

      const dLast = points[points.length - 1].damage * part.mult;
      if (points[points.length - 1].range < maxX) {
        curvePoints.push({ range: maxX, damage: dLast });
      }

      if (d0 > maxDmg) maxDmg = d0;

      curves.push({
        seriesName: s.name,
        partName: part.name,
        mult: part.mult,
        color: part.color,
        dash: part.dash,
        isBase: part.isBase,
        points: curvePoints,
        anchors: curvePoints.filter(p => p.isAnchor)
      });
    });
  });

  const minY = 0;
  const maxY = Math.ceil((maxDmg + 10) / 10) * 10;

  // Dimensions
  const svgWidth = 660;
  const svgHeight = 220;
  const margin = { top: 15, right: 20, bottom: 30, left: 35 };

  const graphW = svgWidth - margin.left - margin.right;
  const graphH = svgHeight - margin.top - margin.bottom;

  const xToSvg = (x) => margin.left + (x / maxX) * graphW;
  const yToSvg = (y) => margin.top + (1 - (y - minY) / (maxY - minY)) * graphH;
  const svgToX = (px) => Math.max(0, Math.min(maxX, ((px - margin.left) / graphW) * maxX));

  // Ticks
  const xStep = maxX > 250 ? 50 : 25;
  const xTicks = [];
  for (let x = 0; x <= maxX; x += xStep) xTicks.push(x);

  const yStep = maxY > 80 ? 25 : 20;
  const yTicks = [];
  for (let y = yStep; y <= maxY; y += yStep) yTicks.push(y);

  // Mouse move handler
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    if (mouseSvgX >= margin.left && mouseSvgX <= svgWidth - margin.right) {
      const r = Math.round(svgToX(mouseSvgX));
      const damages = curves.map(c => {
        const s = series.find(ser => ser.name === c.seriesName) || series[0];
        const dmg = calcDamageAt(s.points, c.mult, r);
        const hits = Math.ceil(100 / dmg);
        return {
          name: c.seriesName,
          part: c.partName.split(' ')[0],
          dmg: dmg.toFixed(1),
          hits,
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
      margin: '2rem 0',
      padding: '1rem 0 0.5rem 0',
      fontFamily: 'var(--font-mono)'
    }}>
      {/* Sleek Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        fontSize: '0.78rem',
        marginBottom: '0.65rem',
        paddingBottom: '0.45rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        {/* Left: Weapon title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          <span>{series.map(s => s.name).join(' vs ')}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>Damage Profile</span>
        </div>

        {/* Right: Dynamic Readout on hover OR Static Legend */}
        {hoverData ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.74rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{hoverData.range} studs:</span>
            {hoverData.damages.map((d, i) => (
              <span key={i} style={{ color: d.color }}>
                {d.part} <strong style={{ color: 'var(--text-primary)' }}>{d.dmg}</strong> ({d.hits}방)
              </span>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {curves.slice(0, 3).map((c, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
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
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
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
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 6}
                  y={yPos + 3}
                  fill="var(--text-muted)"
                  fontSize="9.5"
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
                <line
                  x1={xPos}
                  y1={svgHeight - margin.bottom}
                  x2={xPos}
                  y2={svgHeight - margin.bottom + 4}
                  stroke="rgba(255, 255, 255, 0.15)"
                />
                <text
                  x={xPos}
                  y={svgHeight - margin.bottom + 15}
                  fill="var(--text-muted)"
                  fontSize="9.5"
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
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />

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
                {curve.anchors.map((ap, pIdx) => (
                  <circle
                    key={`pt-${pIdx}`}
                    cx={xToSvg(ap.range)}
                    cy={yToSvg(ap.damage)}
                    r="2.5"
                    fill={curve.color}
                  />
                ))}
              </g>
            );
          })}

          {/* Vertical Hairline Guide on Hover */}
          {hoverData && (
            <g>
              <line
                x1={xToSvg(hoverData.range)}
                y1={margin.top}
                x2={xToSvg(hoverData.range)}
                y2={svgHeight - margin.bottom}
                stroke="rgba(255, 255, 255, 0.2)"
                strokeDasharray="2,2"
                strokeWidth="1"
              />

              {curves.map((curve, idx) => {
                const s = series.find(ser => ser.name === curve.seriesName) || series[0];
                const dmgAt = calcDamageAt(s.points, curve.mult, hoverData.range);
                return (
                  <circle
                    key={`hover-dot-${idx}`}
                    cx={xToSvg(hoverData.range)}
                    cy={yToSvg(dmgAt)}
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
