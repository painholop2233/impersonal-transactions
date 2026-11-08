import React from 'react';
import { Trade, SizeDistribution, Instrument } from '../types/moex';
import { formatRublesExact, formatRubles, formatPrice, formatLots } from '../utils/formatters';
import { ShieldAlert, ArrowUpRight, ArrowDownRight, Users, Briefcase, Landmark } from 'lucide-react';

interface WhaleTapeProps {
  whaleTrades: Trade[];
  sizeDistribution: SizeDistribution;
  instrument: Instrument;
}

export const WhaleTape: React.FC<WhaleTapeProps> = ({ whaleTrades, sizeDistribution, instrument }) => {
  return (
    <div className="space-y-6 mb-6 text-slate-100">
      {/* 3 Size Categories KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Retail */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-400 flex items-center gap-1.5 uppercase text-[11px]">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Розница (&lt; 100 тыс. ₽)
            </span>
            <span className="font-mono text-slate-400 text-[11px]">{sizeDistribution.retail.count} сд.</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mb-2">
            Дельта: {formatRubles(sizeDistribution.retail.deltaVal, true)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800 font-mono">
            <span className="text-emerald-400">Покуп: {formatRubles(sizeDistribution.retail.buyVal)}</span>
            <span className="text-rose-400">Прод: {formatRubles(sizeDistribution.retail.sellVal)}</span>
          </div>
        </div>

        {/* Medium */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-400 flex items-center gap-1.5 uppercase text-[11px]">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              Средние (100k — 1M ₽)
            </span>
            <span className="font-mono text-slate-400 text-[11px]">{sizeDistribution.medium.count} сд.</span>
          </div>
          <div className="text-xl font-bold font-mono text-white mb-2">
            Дельта: {formatRubles(sizeDistribution.medium.deltaVal, true)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800 font-mono">
            <span className="text-emerald-400">Покуп: {formatRubles(sizeDistribution.medium.buyVal)}</span>
            <span className="text-rose-400">Прод: {formatRubles(sizeDistribution.medium.sellVal)}</span>
          </div>
        </div>

        {/* Institutional / Whales */}
        <div className="bg-slate-900 border border-amber-900/60 rounded-lg p-4 bg-gradient-to-b from-amber-950/10 to-transparent">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5 uppercase text-[11px]">
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              Институционалы (&gt; 1M ₽)
            </span>
            <span className="font-mono text-amber-400 text-[11px] font-bold">{sizeDistribution.institutional.count} сд.</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mb-2">
            Дельта: {formatRubles(sizeDistribution.institutional.deltaVal, true)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800 font-mono">
            <span className="text-emerald-400">Покуп: {formatRubles(sizeDistribution.institutional.buyVal)}</span>
            <span className="text-rose-400">Прод: {formatRubles(sizeDistribution.institutional.sellVal)}</span>
          </div>
        </div>
      </div>

      {/* Whale Block Trades Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Крупнейшие анонимные сделки в ленте (Whale Tape)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Сделки максимального объема, оказавшие наибольшее влияние на дельту инструмента.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 text-left">№ Сделки</th>
                <th className="py-2.5 px-3 text-left">Время</th>
                <th className="py-2.5 px-3 text-center">Сторона</th>
                <th className="py-2.5 px-3 text-right">Цена</th>
                <th className="py-2.5 px-3 text-right">Объем (лоты)</th>
                <th className="py-2.5 px-3 text-right">Сумма в рублях (₽)</th>
                <th className="py-2.5 px-3 text-right">Кум. Дельта (₽)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {whaleTrades.map((t, idx) => {
                const isBuy = t.buySell === 'B';
                return (
                  <tr key={`whale-${t.tradeNo}-${t.time}-${t.price}-${t.quantity}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 text-left">
                      #{t.tradeNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 text-left font-semibold">
                      {t.time}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                        isBuy ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                      }`}>
                        {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {isBuy ? 'ПОКУПКА' : 'ПРОДАЖА'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-white font-bold">
                      {formatPrice(t.price, instrument.minStep)} ₽
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-200">
                      {formatLots(t.quantity)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold text-sm ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatRublesExact(t.valueRub)}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${t.cumulativeDeltaRub >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatRubles(t.cumulativeDeltaRub, true)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
