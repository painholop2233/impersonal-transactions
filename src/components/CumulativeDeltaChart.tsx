import React, { useState, useMemo } from 'react';
import { CumulativeTimelinePoint, Instrument } from '../types/moex';
import { formatRubles, formatPrice } from '../utils/formatters';

interface CumulativeDeltaChartProps {
  timeline: CumulativeTimelinePoint[];
  instrument: Instrument;
}

function parseTimeToSec(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
}

function formatSecToHHMM(sec: number): string {
  const normalized = ((sec % 86400) + 86400) % 86400;
  const h = Math.floor(normalized / 3600);
  const m = Math.floor((normalized % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const CumulativeDeltaChart: React.FC<CumulativeDeltaChartProps> = ({ timeline, instrument }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const stats = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let minDelta = Infinity;
    let maxDelta = -Infinity;

    const timesSec: number[] = [];
    let prevSec = -1;

    timeline.forEach((pt) => {
      if (pt.price < minPrice) minPrice = pt.price;
      if (pt.price > maxPrice) maxPrice = pt.price;
      if (pt.cumDeltaRub < minDelta) minDelta = pt.cumDeltaRub;
      if (pt.cumDeltaRub > maxDelta) maxDelta = pt.cumDeltaRub;

      let s = parseTimeToSec(pt.time);
      if (prevSec !== -1 && s < prevSec - 3600) {
        s += 86400; // handle post-midnight rollover if any
      }
      prevSec = s;
      timesSec.push(s);
    });

    // Ensure delta includes 0 level
    if (minDelta > 0) minDelta = 0;
    if (maxDelta < 0) maxDelta = 0;

    // Buffer padding
    const pricePadding = (maxPrice - minPrice) * 0.1 || instrument.minStep * 5;
    const deltaPadding = (maxDelta - minDelta) * 0.1 || 100000;

    const minSec = timesSec[0];
    const maxSec = Math.max(timesSec[timesSec.length - 1], minSec + 60);

    return {
      minPrice: minPrice - pricePadding,
      maxPrice: maxPrice + pricePadding,
      minDelta: minDelta - deltaPadding,
      maxDelta: maxDelta + deltaPadding,
      minSec,
      maxSec,
      timeSpan: maxSec - minSec,
      timesSec,
      count: timeline.length,
    };
  }, [timeline, instrument]);

  if (!stats || timeline.length < 2) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-400 text-xs">
        Недостаточно данных для построения графика кумулятивной дельты
      </div>
    );
  }

  // ViewBox dimensions
  const width = 800;
  const height = 345;
  const plotLeft = 15;
  const plotRight = width - 75;
  const plotWidth = plotRight - plotLeft;
  const priceHeight = 150;
  const chartGap = 30;
  const deltaTop = priceHeight + chartGap;
  const deltaHeight = height - deltaTop - 28;

  // True clock-time X scaling
  const getXBySec = (sec: number) =>
    plotLeft + ((sec - stats.minSec) / stats.timeSpan) * plotWidth;

  const getX = (index: number) => getXBySec(stats.timesSec[index]);

  const getYPrice = (price: number) => {
    const range = stats.maxPrice - stats.minPrice;
    if (range === 0) return priceHeight / 2;
    return priceHeight - ((price - stats.minPrice) / range) * (priceHeight - 20) - 10;
  };

  const getYDelta = (delta: number) => {
    const range = stats.maxDelta - stats.minDelta;
    if (range === 0) return deltaTop + deltaHeight / 2;
    return deltaTop + deltaHeight - ((delta - stats.minDelta) / range) * deltaHeight;
  };

  const zeroDeltaY = getYDelta(0);

  // Build SVG Paths
  const pricePathD = timeline.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getYPrice(pt.price);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const deltaPathD = timeline.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getYDelta(pt.cumDeltaRub);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const deltaAreaD = `${deltaPathD} L ${getX(timeline.length - 1)} ${zeroDeltaY} L ${getX(0)} ${zeroDeltaY} Z`;

  // Session markers (10:00 Main Day start, 19:00 Evening start)
  const sessionMarkers = [
    { sec: 10 * 3600, label: '10:00 Основная' },
    { sec: 19 * 3600, label: '19:00 Вечерняя' },
  ].filter((m) => m.sec > stats.minSec + 300 && m.sec < stats.maxSec - 300);

  // Evenly spaced clock-time ticks along bottom axis
  const timeTicks: Array<{ sec: number; x: number; label: string }> = [];
  const tickStep = stats.timeSpan > 10 * 3600 ? 7200 : stats.timeSpan > 4 * 3600 ? 3600 : 1800;
  const firstHourTick = Math.ceil(stats.minSec / tickStep) * tickStep;
  timeTicks.push({ sec: stats.minSec, x: plotLeft, label: timeline[0].time.slice(0, 5) });
  for (let s = firstHourTick; s < stats.maxSec; s += tickStep) {
    const x = getXBySec(s);
    const lastTickX = timeTicks[timeTicks.length - 1].x;
    if (x - lastTickX >= 48 && plotRight - x >= 48) {
      timeTicks.push({ sec: s, x, label: formatSecToHHMM(s) });
    }
  }
  if (plotRight - timeTicks[timeTicks.length - 1].x >= 35) {
    timeTicks.push({
      sec: stats.maxSec,
      x: plotRight,
      label: timeline[timeline.length - 1].time.slice(0, 5),
    });
  }

  const activePoint = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < timeline.length
    ? timeline[hoverIndex]
    : timeline[timeline.length - 1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-6 text-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
            <span>Кумулятивная Дельта (Cumulative Delta, ₽) vs Цена</span>
            <span className="text-[11px] font-mono font-normal bg-slate-950 text-blue-300 border border-slate-800 px-2 py-0.5 rounded">
              {timeline[0]?.time} — {timeline[timeline.length - 1]?.time} МСК
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Накопительный баланс покупок и продаж по времени торгового дня. Резкие скачки отражают вливание крупного рыночного капитала.
          </p>
        </div>

        {/* Hover / Current Inspector strip */}
        <div className="flex items-center gap-4 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded border border-slate-800 shrink-0">
          <div>
            <span className="text-slate-500 mr-1.5">Время:</span>
            <span className="text-slate-300 font-semibold">{activePoint.time}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1.5">Цена:</span>
            <span className="text-white font-bold">{formatPrice(activePoint.price, instrument.minStep)} ₽</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1.5">Кум. Дельта:</span>
            <span className={`font-bold ${activePoint.cumDeltaRub >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatRubles(activePoint.cumDeltaRub, true)}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * width;
            const ratio = Math.min(Math.max((relX - plotLeft) / plotWidth, 0), 1);
            const targetSec = stats.minSec + ratio * stats.timeSpan;

            // Find closest point in time
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < stats.timesSec.length; i++) {
              const dist = Math.abs(stats.timesSec[i] - targetSec);
              if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
              }
            }
            setHoverIndex(bestIdx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="deltaGreenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="deltaRedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Session Boundary Dividers (10:00, 19:00 MSK) */}
          {sessionMarkers.map((marker) => {
            const mx = getXBySec(marker.sec);
            return (
              <g key={marker.label}>
                <line
                  x1={mx}
                  y1={20}
                  x2={mx}
                  y2={height - 24}
                  stroke="#475569"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />
                <text
                  x={mx + 4}
                  y={priceHeight + 14}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {marker.label}
                </text>
              </g>
            );
          })}

          {/* Background Grid Lines */}
          <line x1={plotLeft} y1={priceHeight / 2} x2={plotRight} y2={priceHeight / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
          <line x1={plotLeft} y1={zeroDeltaY} x2={plotRight} y2={zeroDeltaY} stroke="#64748b" strokeWidth="1.2" opacity="0.8" />

          {/* Zero Level Label */}
          <text x={plotRight + 6} y={zeroDeltaY + 3} fill="#94a3b8" fontSize="10" fontFamily="monospace">
            0 ₽ (Паритет)
          </text>

          {/* Price Max/Min Labels */}
          <text x={plotRight + 6} y="15" fill="#38bdf8" fontSize="10" fontFamily="monospace">
            {formatPrice(stats.maxPrice, instrument.minStep)}
          </text>
          <text x={plotRight + 6} y={priceHeight} fill="#38bdf8" fontSize="10" fontFamily="monospace">
            {formatPrice(stats.minPrice, instrument.minStep)}
          </text>

          {/* Delta Max/Min Labels */}
          <text x={plotRight + 6} y={deltaTop + 12} fill="#10b981" fontSize="10" fontFamily="monospace">
            +{formatRubles(stats.maxDelta)}
          </text>
          <text x={plotRight + 6} y={height - 20} fill="#f43f5e" fontSize="10" fontFamily="monospace">
            {formatRubles(stats.minDelta)}
          </text>

          {/* Price Header inside SVG */}
          <text x={plotLeft} y="16" fill="#38bdf8" fontSize="11" fontWeight="bold">
            Ценовой график ({instrument.secId})
          </text>

          {/* Delta Header inside SVG */}
          <text x={plotLeft} y={deltaTop - 8} fill="#e2e8f0" fontSize="11" fontWeight="bold">
            Кумулятивная Дельта (Накопленная разница в ₽)
          </text>

          {/* Price Path Line */}
          <path
            d={pricePathD}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Cumulative Delta Area & Line */}
          <path
            d={deltaAreaD}
            fill={timeline[timeline.length - 1].cumDeltaRub >= 0 ? 'url(#deltaGreenGrad)' : 'url(#deltaRedGrad)'}
          />
          <path
            d={deltaPathD}
            fill="none"
            stroke={timeline[timeline.length - 1].cumDeltaRub >= 0 ? '#10b981' : '#f43f5e'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Scrub Line & Indicator Point */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1="10"
                x2={getX(hoverIndex)}
                y2={height - 22}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getYPrice(activePoint.price)}
                r="4"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getYDelta(activePoint.cumDeltaRub)}
                r="4.5"
                fill={activePoint.cumDeltaRub >= 0 ? '#10b981' : '#f43f5e'}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Time Ticks on bottom axis */}
          {timeTicks.map((tick, idx) => {
            const anchor = idx === 0 ? 'start' : idx === timeTicks.length - 1 ? 'end' : 'middle';
            return (
              <g key={`${tick.sec}-${idx}`}>
                <line x1={tick.x} y1={height - 22} x2={tick.x} y2={height - 17} stroke="#475569" strokeWidth="1" />
                <text
                  x={tick.x}
                  y={height - 5}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor={anchor}
                >
                  {tick.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-sky-400 rounded-full" />
            <span>Цена инструмента</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-emerald-500 rounded-full" />
            <span>Положительная дельта (Куплено &gt; Продано)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-rose-500 rounded-full" />
            <span>Отрицательная дельта (Продано &gt; Куплено)</span>
          </div>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          Точек графика: {timeline.length} ({timeline[0]?.time.slice(0, 5)}–{timeline[timeline.length - 1]?.time.slice(0, 5)})
        </div>
      </div>
    </div>
  );
};
