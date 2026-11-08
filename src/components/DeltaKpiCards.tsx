import React from 'react';
import { ArrowUpRight, ArrowDownRight, Scale, ShoppingCart, Tag, Layers, Calendar, Clock } from 'lucide-react';
import { DeltaReport } from '../types/moex';
import { formatRublesExact, formatRubles, formatLots, formatPercent, formatPrice } from '../utils/formatters';

interface DeltaKpiCardsProps {
  report: DeltaReport;
}

export const DeltaKpiCards: React.FC<DeltaKpiCardsProps> = ({ report }) => {
  const isPositiveDelta = report.netDeltaRub >= 0;
  const buyPercent = (report.buyRatio * 100).toFixed(1);
  const sellPercent = ((1 - report.buyRatio) * 100).toFixed(1);

  const sessionNameMap: Record<string, string> = {
    all: 'Все сессии торгового дня',
    day: 'Основная дневная сессия',
    evening: 'Вечерняя сессия',
    morning: 'Утренняя сессия',
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Session / Date Scope Indicator Strip & Official Source Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2 text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Торговый день: <strong className="text-white">{report.tradingDate}</strong></span>
          <span className="text-slate-600">·</span>
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-400">Срез: <strong className="text-blue-300">{sessionNameMap[report.selectedSession] || 'Все сессии'}</strong> ({report.timeRange.start} — {report.timeRange.end} МСК)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>100% реальные данные MOEX ISS</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-slate-400">
            <span>Сделок: <strong className="text-white">{report.tradesCount.toLocaleString('ru-RU')}</strong></span>
            <span>(из {report.totalTradesInDay.toLocaleString('ru-RU')})</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: THE NET DELTA IN RUBLES (CRITICAL FOCUS) */}
        <div className={`p-5 rounded-lg border transition-all ${
          isPositiveDelta
            ? 'bg-emerald-950/20 border-emerald-800/60 shadow-[0_0_25px_rgba(16,185,129,0.06)]'
            : 'bg-rose-950/20 border-rose-800/60 shadow-[0_0_25px_rgba(244,63,94,0.06)]'
        }`}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              Дельта (Покупки − Продажи)
            </span>
            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
              isPositiveDelta ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900/60 text-rose-300'
            }`}>
              {isPositiveDelta ? 'Покупатели +' : 'Продавцы −'}
            </span>
          </div>

          <div className="mt-2">
            <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight tabular-nums flex items-center gap-1 ${
              isPositiveDelta ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isPositiveDelta ? (
                <ArrowUpRight className="w-7 h-7 shrink-0 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-7 h-7 shrink-0 text-rose-400" />
              )}
              <span>{formatRublesExact(report.netDeltaRub, true)}</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Доля от оборота:</span>
            <span className="font-mono font-bold text-slate-200">
              {formatPercent(report.deltaPercent, true)}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>Дельта в объемах:</span>
            <span className="font-mono font-semibold text-slate-300">
              {formatLots(report.netVolumeDeltaLots, true)} лотов
            </span>
          </div>
        </div>

        {/* Card 2: Все покупки (All Purchases) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
              Все покупки (Buys)
            </span>
            <span className="font-mono text-xs font-bold text-emerald-400">
              {buyPercent}%
            </span>
          </div>

          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
            {formatRubles(report.buyValueRub)}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Сделок / Лотов:</span>
            <span className="font-mono text-slate-300">
              {report.buyTradesCount.toLocaleString('ru-RU')} сд. · {report.buyVolumeLots.toLocaleString('ru-RU')} лот.
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>Buy VWAP:</span>
            <span className="font-mono text-emerald-300">
              {formatPrice(report.buyVwap, report.instrument.minStep)} ₽
            </span>
          </div>
        </div>

        {/* Card 3: Все продажи (All Sales) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-rose-400" />
              Все продажи (Sells)
            </span>
            <span className="font-mono text-xs font-bold text-rose-400">
              {sellPercent}%
            </span>
          </div>

          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
            {formatRubles(report.sellValueRub)}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Сделок / Лотов:</span>
            <span className="font-mono text-slate-300">
              {report.sellTradesCount.toLocaleString('ru-RU')} сд. · {report.sellVolumeLots.toLocaleString('ru-RU')} лот.
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>Sell VWAP:</span>
            <span className="font-mono text-rose-300">
              {formatPrice(report.sellVwap, report.instrument.minStep)} ₽
            </span>
          </div>
        </div>

        {/* Card 4: Общий оборот и цена */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Совокупный оборот
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {report.tradesCount.toLocaleString('ru-RU')} сделок
            </span>
          </div>

          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
            {formatRubles(report.totalTurnoverRub)}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Текущая цена:</span>
            <span className="font-mono font-bold text-white">
              {formatPrice(report.lastPrice, report.instrument.minStep)} ₽
              <span className={`ml-1 text-[11px] ${report.priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ({formatPercent(report.priceChangePct, true)})
              </span>
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>Общий VWAP дня:</span>
            <span className="font-mono text-slate-300">
              {formatPrice(report.vwap, report.instrument.minStep)} ₽
            </span>
          </div>
        </div>
      </div>

      {/* Visual Aggressor Ratio Balance Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
        <div className="flex items-center justify-between text-xs mb-2 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-400">Покупки: {buyPercent}%</span>
            <span className="text-slate-500 font-mono text-[11px]">({formatRublesExact(report.buyValueRub)})</span>
          </div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
            Баланс агрессоров в ленте сделок дня
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono text-[11px]">({formatRublesExact(report.sellValueRub)})</span>
            <span className="font-semibold text-rose-400">Продажи: {sellPercent}%</span>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
          <div
            className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
            style={{ width: `${buyPercent}%` }}
          />
          <div
            className="h-full bg-rose-500 rounded-r-full transition-all duration-500"
            style={{ width: `${sellPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
