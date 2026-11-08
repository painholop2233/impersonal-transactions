import React from 'react';
import { DeltaReport } from '../types/moex';
import { formatRublesExact, formatLots, formatPrice, formatPercent } from '../utils/formatters';

interface PrintReportViewProps {
  report: DeltaReport;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({ report }) => {
  const isPositiveDelta = report.netDeltaRub >= 0;

  const sessionNameMap: Record<string, string> = {
    all: 'Все сессии торгового дня (Дневная + Вечерняя)',
    day: 'Основная дневная сессия',
    evening: 'Вечерняя сессия',
    morning: 'Утренняя сессия',
  };

  return (
    <div className="hidden print-only p-8 text-black bg-white max-w-4xl mx-auto font-sans">
      {/* Formal Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
            Московская Биржа (MOEX) · Аналитический Отчет
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Анализ всех обезличенных сделок торгового дня и расчет дельты покупок/продаж
          </p>
        </div>
        <div className="text-right text-xs text-slate-600">
          <div><strong>Дата торгового дня:</strong> {report.tradingDate}</div>
          <div>Интервал сделок: {report.timeRange.start} — {report.timeRange.end} МСК</div>
          <div>Сформирован: {new Date(report.generatedAt).toLocaleString('ru-RU')}</div>
        </div>
      </div>

      {/* Instrument Overview */}
      <div className="bg-slate-100 p-4 rounded mb-6 grid grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-500 block">Тикер:</span>
          <span className="font-bold text-sm text-slate-900">{report.instrument.secId}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Наименование:</span>
          <span className="font-semibold text-slate-800">{report.instrument.shortName}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Текущая цена:</span>
          <span className="font-bold text-slate-900">
            {formatPrice(report.lastPrice, report.instrument.minStep)} ₽ ({formatPercent(report.priceChangePct, true)})
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Сделок обработано:</span>
          <span className="font-semibold text-slate-800">{report.tradesCount} из {report.totalTradesInDay} за день</span>
        </div>
      </div>

      {/* CORE METRICS: The Delta in Rubles */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-300 pb-1">
          1. Итоговый баланс торгового дня ({sessionNameMap[report.selectedSession] || 'Все сессии'})
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className={`p-4 border rounded ${isPositiveDelta ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
            <span className="text-xs uppercase tracking-wider text-slate-600 block">
              Чистая Дельта дня (Покупки − Продажи)
            </span>
            <div className={`text-xl font-bold font-mono mt-1 ${isPositiveDelta ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatRublesExact(report.netDeltaRub, true)}
            </div>
            <span className="text-[11px] text-slate-600 mt-1 block">
              {formatPercent(report.deltaPercent, true)} от совокупного оборота
            </span>
          </div>

          <div className="p-4 border border-slate-200 rounded bg-slate-50">
            <span className="text-xs uppercase tracking-wider text-slate-600 block">
              Все покупки (Buys)
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {formatRublesExact(report.buyValueRub)}
            </div>
            <span className="text-[11px] text-slate-600 mt-1 block">
              {report.buyTradesCount} сд. ({report.buyVolumeLots} лот., {(report.buyRatio * 100).toFixed(1)}%)
            </span>
          </div>

          <div className="p-4 border border-slate-200 rounded bg-slate-50">
            <span className="text-xs uppercase tracking-wider text-slate-600 block">
              Все продажи (Sells)
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {formatRublesExact(report.sellValueRub)}
            </div>
            <span className="text-[11px] text-slate-600 mt-1 block">
              {report.sellTradesCount} сд. ({report.sellVolumeLots} лот., {((1 - report.buyRatio) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>

        <table className="w-full text-xs border border-slate-200 text-left">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-2 px-3 text-slate-600 bg-slate-50 font-medium w-1/3">Совокупный дневной оборот:</td>
              <td className="py-2 px-3 font-mono font-bold text-slate-900">{formatRublesExact(report.totalTurnoverRub)}</td>
              <td className="py-2 px-3 text-slate-600 bg-slate-50 font-medium w-1/4">Дельта в лотах:</td>
              <td className="py-2 px-3 font-mono font-bold text-slate-900">{formatLots(report.netVolumeDeltaLots, true)} лотов</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-2 px-3 text-slate-600 bg-slate-50 font-medium">Средневзвешенная цена (VWAP):</td>
              <td className="py-2 px-3 font-mono text-slate-900">{formatPrice(report.vwap, report.instrument.minStep)} ₽</td>
              <td className="py-2 px-3 text-slate-600 bg-slate-50 font-medium">Диапазон цен дня (Min - Max):</td>
              <td className="py-2 px-3 font-mono text-slate-900">
                {formatPrice(report.minPrice, report.instrument.minStep)} — {formatPrice(report.maxPrice, report.instrument.minStep)} ₽
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SESSIONS COMPARISON TABLE */}
      {report.sessionsBreakdown && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-300 pb-1">
            2. Дельта в разрезе торговых сессий (Дневная vs Вечерняя)
          </h2>
          <table className="w-full text-xs border border-slate-200 text-right">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2 px-3 text-left">Сессия</th>
                <th className="py-2 px-3 text-left">Интервал</th>
                <th className="py-2 px-3">Сделок</th>
                <th className="py-2 px-3">Оборот (₽)</th>
                <th className="py-2 px-3">Покупки (₽)</th>
                <th className="py-2 px-3">Продажи (₽)</th>
                <th className="py-2 px-3 font-bold">Дельта (₽)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              <tr>
                <td className="py-2 px-3 text-left font-sans text-slate-800 font-medium">Основная дневная сессия</td>
                <td className="py-2 px-3 text-left font-sans text-slate-500">10:00 — 18:50</td>
                <td className="py-2 px-3">{report.sessionsBreakdown.day.count}</td>
                <td className="py-2 px-3">{formatRublesExact(report.sessionsBreakdown.day.turnover)}</td>
                <td className="py-2 px-3 text-emerald-700">{formatRublesExact(report.sessionsBreakdown.day.buyVal)}</td>
                <td className="py-2 px-3 text-rose-700">{formatRublesExact(report.sessionsBreakdown.day.sellVal)}</td>
                <td className="py-2 px-3 font-bold">{formatRublesExact(report.sessionsBreakdown.day.deltaVal, true)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-left font-sans text-slate-800 font-medium">Вечерняя дополнительная</td>
                <td className="py-2 px-3 text-left font-sans text-slate-500">19:00 — 23:50</td>
                <td className="py-2 px-3">{report.sessionsBreakdown.evening.count}</td>
                <td className="py-2 px-3">{formatRublesExact(report.sessionsBreakdown.evening.turnover)}</td>
                <td className="py-2 px-3 text-emerald-700">{formatRublesExact(report.sessionsBreakdown.evening.buyVal)}</td>
                <td className="py-2 px-3 text-rose-700">{formatRublesExact(report.sessionsBreakdown.evening.sellVal)}</td>
                <td className="py-2 px-3 font-bold">{formatRublesExact(report.sessionsBreakdown.evening.deltaVal, true)}</td>
              </tr>
              <tr className="bg-slate-100/70 font-semibold">
                <td className="py-2 px-3 text-left font-sans text-slate-900">ИТОГО за весь торговый день</td>
                <td className="py-2 px-3 text-left font-sans text-slate-500">Полный день</td>
                <td className="py-2 px-3">{report.sessionsBreakdown.total.count}</td>
                <td className="py-2 px-3">{formatRublesExact(report.sessionsBreakdown.total.turnover)}</td>
                <td className="py-2 px-3 text-emerald-700">{formatRublesExact(report.sessionsBreakdown.total.buyVal)}</td>
                <td className="py-2 px-3 text-rose-700">{formatRublesExact(report.sessionsBreakdown.total.sellVal)}</td>
                <td className="py-2 px-3 font-bold text-slate-900">{formatRublesExact(report.sessionsBreakdown.total.deltaVal, true)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Top Block Trades Sample */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-300 pb-1">
          3. Крупнейшие институциональные сделки дня
        </h2>
        <table className="w-full text-xs border border-slate-200 text-right">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <th className="py-2 px-3 text-left">№ Сделки</th>
              <th className="py-2 px-3 text-left">Время</th>
              <th className="py-2 px-3 text-center">Сторона</th>
              <th className="py-2 px-3">Цена</th>
              <th className="py-2 px-3">Объем (лот)</th>
              <th className="py-2 px-3">Сумма (₽)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {report.whaleTrades.slice(0, 5).map((t, i) => (
              <tr key={`print-whale-${t.tradeNo}-${t.time}-${i}`}>
                <td className="py-2 px-3 text-left text-slate-600">#{t.tradeNo}</td>
                <td className="py-2 px-3 text-left">{t.time}</td>
                <td className="py-2 px-3 text-center font-bold font-sans">
                  {t.buySell === 'B' ? 'ПОКУПКА' : 'ПРОДАЖА'}
                </td>
                <td className="py-2 px-3">{formatPrice(t.price, report.instrument.minStep)} ₽</td>
                <td className="py-2 px-3">{formatLots(t.quantity)}</td>
                <td className="py-2 px-3 font-bold">{formatRublesExact(t.valueRub)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Notes */}
      <div className="pt-4 border-t border-slate-300 text-[10px] text-slate-500 flex justify-between items-center">
        <span>Источник: ПАО Московская Биржа (MOEX ISS). 100% анонимных сделок торгового дня.</span>
        <span>Страница 1 из 1</span>
      </div>
    </div>
  );
};
