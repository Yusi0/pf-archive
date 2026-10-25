import React, { useEffect, useMemo, useState } from 'react';
import WeaponDamageGraph from './WeaponDamageGraph';
import { buildComparison, buildGraphData, neededVariantWeapons } from '../utils/compare/build';
import { loadVariants, loadVersions, loadWeapons } from '../utils/compare/loadData';

const DISTANCE_MIN = 10;
const DISTANCE_MAX = 200;

const signed = (pct) => `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`;

function Cell({ cell }) {
  return (
    <td className={cell.changed ? 'is-changed' : undefined}>
      <span className="compare-value">{cell.text}</span>
      {cell.sub && <span className="compare-sub">{cell.sub}</span>}
      {cell.pct !== null && cell.pct !== undefined && <span className="compare-pct">{signed(cell.pct)}</span>}
    </td>
  );
}

function ItemHead({ item }) {
  return (
    <>
      <span className="compare-title">{item.title}</span>
      {item.sub && <span className="compare-sub">{item.sub}</span>}
    </>
  );
}

/** :::compare — a gun / ammo comparison table with the damage curves under it. */
export default function WeaponCompare({ config }) {
  const [state, setState] = useState({ status: 'loading' });
  const [distance, setDistance] = useState(config.valid ? config.options.distance : 50);
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState(null); // { rowId, dir } — only in the "guns as rows" layout

  useEffect(() => {
    if (!config.valid) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const versions = await loadVersions();
        const version = config.options.version ?? versions.default;
        if (!versions.versions.some((v) => v.label === version)) {
          throw new Error(`${version} 버전 데이터가 없습니다 (있는 버전: ${versions.versions.map((v) => v.label).join(', ')})`);
        }
        const { index, note } = await loadWeapons(version);
        const files = new Map();
        await Promise.all(
          neededVariantWeapons(index, config).map(async (id) => {
            const file = await loadVariants(version, id);
            if (file) files.set(id, file);
          }),
        );
        if (!cancelled) setState({ status: 'ready', version, note, index, files });
      } catch (error) {
        if (!cancelled) setState({ status: 'error', message: error.message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config]);

  const table = useMemo(
    () => (state.status === 'ready'
      ? buildComparison({ index: state.index, variantFiles: state.files, config, version: state.version, distance })
      : null),
    [state, config, distance],
  );
  const graph = useMemo(() => (table ? buildGraphData(table.items, config) : null), [table, config]);

  if (!config.valid) {
    return <div className="compare compare-error" role="alert">:::compare 오류 — {config.error}</div>;
  }
  if (state.status === 'loading') return <div className="compare compare-loading">비교표를 불러오는 중…</div>;
  if (state.status === 'error') {
    return <div className="compare compare-error" role="alert">비교 데이터를 불러오지 못했습니다 ({state.message})</div>;
  }

  const visibleRows = table.rows.filter((row) => showAll || !row.hidden);
  const hasSlider = table.rows.some((row) => row.id === 'ttk');
  const hasNotes = table.items.some((item) => item.note);
  const isRowLayout = table.layout === 'row';

  // "Guns as rows" can be sorted by any column
  let orderedItems = table.items.map((item, i) => ({ item, i }));
  if (isRowLayout && sort) {
    const row = table.rows.find((r) => r.id === sort.rowId);
    if (row) {
      orderedItems = [...orderedItems].sort((a, b) => {
        const va = row.cells[a.i].value;
        const vb = row.cells[b.i].value;
        if (va === undefined && vb === undefined) return 0;
        if (va === undefined) return 1;
        if (vb === undefined) return -1;
        return (va - vb) * sort.dir;
      });
    }
  }

  const toggleSort = (rowId) => {
    setSort((prev) => (prev && prev.rowId === rowId ? (prev.dir === 1 ? { rowId, dir: -1 } : null) : { rowId, dir: 1 }));
  };

  return (
    <figure className="compare">
      <div className="compare-bar">
        <span className="compare-caption">
          {table.mode === 'variant' ? `${table.items[0]?.weapon.name} · 변형 비교` : '총기 비교'} · {state.version}
        </span>
        {hasSlider && (
          <label className="compare-slider">
            <span>TTK 거리</span>
            <input
              type="range"
              min={DISTANCE_MIN}
              max={DISTANCE_MAX}
              step="5"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              aria-label="TTK 계산 거리"
            />
            <output>{distance} studs</output>
          </label>
        )}
        {table.hiddenCount > 0 && (
          <button type="button" className="compare-toggle" onClick={() => setShowAll((v) => !v)}>
            {showAll ? '차이나는 항목만' : `전부 보기 (+${table.hiddenCount})`}
          </button>
        )}
      </div>

      {table.errors.length > 0 && (
        <ul className="compare-problems" role="alert">
          {table.errors.map((message) => <li key={message}>{message}</li>)}
        </ul>
      )}

      {table.items.length > 0 && (
        <div className="compare-scroll">
          {isRowLayout ? (
            <table className="compare-table is-rows">
              <thead>
                <tr>
                  <th scope="col" className="compare-corner">총기</th>
                  {visibleRows.map((row) => (
                    <th key={row.id} scope="col" aria-sort={sort?.rowId === row.id ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" className="compare-sort" onClick={() => toggleSort(row.id)}>
                        {row.label}
                        <span aria-hidden="true">{sort?.rowId === row.id ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</span>
                      </button>
                    </th>
                  ))}
                  {hasNotes && <th scope="col">비고</th>}
                </tr>
              </thead>
              <tbody>
                {orderedItems.map(({ item, i }) => (
                  <tr key={`${item.title}-${i}`}>
                    <th scope="row"><ItemHead item={item} /></th>
                    {visibleRows.map((row) => <Cell key={row.id} cell={row.cells[i]} />)}
                    {hasNotes && <td className="compare-note">{item.note}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="compare-table is-columns">
              <thead>
                <tr>
                  <td className="compare-corner" />
                  {table.items.map((item, i) => (
                    <th key={`${item.title}-${i}`} scope="col"><ItemHead item={item} /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className={row.core ? 'is-core' : undefined}>
                    <th scope="row">{row.label}</th>
                    {row.cells.map((cell, i) => <Cell key={i} cell={cell} />)}
                  </tr>
                ))}
                {hasNotes && (
                  <tr>
                    <th scope="row">비고</th>
                    {table.items.map((item, i) => <td key={i} className="compare-note">{item.note}</td>)}
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {table.footnotes.length > 0 && (
        <ul className="compare-footnotes">
          {table.footnotes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      )}

      {graph && (
        <div className="compare-graph">
          <WeaponDamageGraph graphData={graph} />
        </div>
      )}
    </figure>
  );
}
