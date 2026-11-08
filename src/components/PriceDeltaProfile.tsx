import React, { useState, useMemo } from 'react';
import { PriceLevelDelta, Instrument } from '../types/moex';
import { formatRubles, formatPrice, formatLots } from '../utils/formatters';
import { BarChart3 } from 'lucide-react';

interface PriceDeltaProfileProps {
  profile: PriceLevelDelta[];
  instrument: Instrument;
  lastPrice: number;
}

export const PriceDeltaProfile: React.FC<PriceDeltaProfileProps> = ({ profile, instrument, lastPrice }) => {
  const [viewMode, setViewMode] = useState<'rubles' | 'lots'>('rubles');
  const [sortBy, setSortBy] = useState<'price' | 'delta' | 'volume'>('price');

  const { maxVolume, maxAbsDelta, pocPrice, sortedProfile } = useMemo(() => {
    let maxVol = 0;
    let maxDelta = 0;
    let poc = 0;
    let highestVol = 0;

    profile.forEach((item) => {
      const vol = viewMode === 'rubles' ? item.totalValueRub : (item.buyLots + item.sellLots);
      if (vol > maxVol) maxVol = vol;
      if (vol > highestVol) {
        highestVol = vol;
        poc = item.price;
      }
      const absDelta = Math.abs(viewMode === 'rubles' ? item.netDeltaRub : (item.buyLots - item.sellLots));
      if (absDelta > maxDelta) maxDelta = absDelta;
    });

    const list = [...profile];
    if (sortBy === 'price') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'delta') {
      list.sort((a, b) => Math.abs(b.netDeltaRub) - Math.abs(a.netDeltaRub));
    } else if (sortBy === 'volume') {
      list.sort((a, b) => b.totalValueRub - a.totalValueRub);
    }

    return {
      maxVolume: maxVol || 1,
      maxAbsDelta: maxDelta || 1,
      pocPrice: poc,
      sortedProfile: list.slice(0, 40) // display top 40 price levels
    };
  }, [profile, viewMode, sortBy]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-6 text-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span>Профиль Дельты по Ценовым Уровням (Footprint)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Распределение объема и разницы покупок/продаж по каждому ценовому тику. Уровень с меткой POC — максимальный оборот.
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('rubles')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'rubles' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              В Рублях (₽)
            </button>
            <button
              onClick={() => setViewMode('lots')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'lots' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              В Лотах
            </button>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 text-slate-300 rounded px-2.5 py-1 text-xs focus:outline-none"
          >
            <option value="price">По цене (сверху вниз)</option>
            <option value="delta">По модулю дельты</option>
            <option value="volume">По совокупному объему</option>
          </select>
        </div>
      </div>

      {/* Footprint Table / Visual Rows */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <th className="py-2 px-3 text-left w-24">Цена (₽)</th>
              <th className="py-2 px-3 text-right w-28">Покупки (Buys)</th>
              <th className="py-2 px-3 text-right w-28">Продажи (Sells)</th>
              <th className="py-2 px-3 text-right w-36">Дельта (Разница)</th>
              <th className="py-2 px-3 text-left min-w-[200px]">Гистограмма Дельты (₽)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedProfile.map((row, idx) => {
              const isPoc = row.price === pocPrice;
              const isCurrent = row.price === lastPrice;
              const isPositiveDelta = row.netDeltaRub >= 0;
              const absDelta = Math.abs(viewMode === 'rubles' ? row.netDeltaRub : (row.buyLots - row.sellLots));
              const deltaWidthPct = Math.min(100, Math.round((absDelta / maxAbsDelta) * 100));

              return (
                <tr
                  key={`profile-${row.price}-${idx}`}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isPoc ? 'bg-amber-950/20' : isCurrent ? 'bg-blue-950/20' : ''
                  }`}
                >
                  <td className="py-2 px-3 text-left font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className={isCurrent ? 'text-blue-300' : 'text-white'}>
                        {formatPrice(row.price, instrument.minStep)}
                      </span>
                      {isPoc && (
                        <span className="text-[10px] font-sans font-bold bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/40">
                          POC
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-sans font-bold bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded border border-blue-500/40">
                          LAST
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-2 px-3 text-right text-emerald-400">
                    {viewMode === 'rubles' ? formatRubles(row.buyValueRub) : formatLots(row.buyLots)}
                  </td>

                  <td className="py-2 px-3 text-right text-rose-400">
                    {viewMode === 'rubles' ? formatRubles(row.sellValueRub) : formatLots(row.sellLots)}
                  </td>

                  <td className={`py-2 px-3 text-right font-bold ${isPositiveDelta ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {viewMode === 'rubles' ? formatRubles(row.netDeltaRub, true) : formatLots(row.buyLots - row.sellLots, true)}
                  </td>

                  {/* Visual Footprint Bar */}
                  <td className="py-2 px-3 text-left">
                    <div className="flex items-center gap-2 h-4 w-full">
                      {/* Negative delta bar going left */}
                      <div className="flex-1 flex justify-end h-full">
                        {!isPositiveDelta && (
                          <div
                            className="bg-rose-500/80 rounded-l h-full transition-all"
                            style={{ width: `${deltaWidthPct}%` }}
                            title={`Отрицательная дельта: -${formatRubles(absDelta)}`}
                          />
                        )}
                      </div>
                      
                      {/* Zero center axis divider */}
                      <div className="w-0.5 h-full bg-slate-600 shrink-0" />

                      {/* Positive delta bar going right */}
                      <div className="flex-1 flex justify-start h-full">
                        {isPositiveDelta && (
                          <div
                            className="bg-emerald-500/80 rounded-r h-full transition-all"
                            style={{ width: `${deltaWidthPct}%` }}
                            title={`Положительная дельта: +${formatRubles(absDelta)}`}
                          />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
