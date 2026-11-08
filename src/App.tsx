import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { InstrumentSelector } from './components/InstrumentSelector';
import { SessionsBreakdownCard } from './components/SessionsBreakdownCard';
import { DeltaKpiCards } from './components/DeltaKpiCards';
import { CumulativeDeltaChart } from './components/CumulativeDeltaChart';
import { PriceDeltaProfile } from './components/PriceDeltaProfile';
import { WhaleTape } from './components/WhaleTape';
import { TradesTable } from './components/TradesTable';
import { AiAnalysisCard } from './components/AiAnalysisCard';
import { PrintReportView } from './components/PrintReportView';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { MarketType, DeltaReport, ReportFilterConfig } from './types/moex';
import { formatRublesExact, formatPercent, formatLots } from './utils/formatters';
import { AlertCircle, Copy, Check, FileSpreadsheet, RefreshCw, Calendar, Sparkles } from 'lucide-react';

export default function App() {
  const [market, setMarket] = useState<MarketType>('stocks');
  const [selectedTicker, setSelectedTicker] = useState<string>('SBER');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [filters, setFilters] = useState<ReportFilterConfig>({
    sampleLimit: 50000,
    selectedDate: '',
    selectedSession: 'all',
    minTradeValueRub: 0,
    tradeDirection: 'all',
  });

  const [report, setReport] = useState<DeltaReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isSheetsOpen, setIsSheetsOpen] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Fetch full trading day report from server
  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        ticker: selectedTicker,
        market,
        minVal: String(filters.minTradeValueRub),
        direction: filters.tradeDirection,
        session: filters.selectedSession,
      });
      if (filters.selectedDate) {
        params.append('date', filters.selectedDate);
      }

      const res = await fetch(`/api/moex/report?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Ошибка сервера: ${res.status}`);
      }
      const data: DeltaReport = await res.json();
      setReport(data);
      if (!filters.selectedDate && data.tradingDate) {
        setFilters(f => ({ ...f, selectedDate: data.tradingDate }));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Не удалось получить данные с Московской Биржи');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTicker, market, filters.selectedSession, filters.selectedDate, filters.minTradeValueRub, filters.tradeDirection]);

  // Initial load and on parameter changes
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Auto-refresh interval (every 30 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadReport();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadReport]);

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Export full trades to CSV
  const handleExportCsv = () => {
    if (!report) return;
    const headers = ['№ сделки', 'Дата', 'Время', 'Сессия', 'Тикер', 'Направление', 'Цена (₽)', 'Количество (лоты)', 'Объем в рублях (₽)', 'Накопительная дельта (₽)'];
    const rows = (report.recentTrades || []).map((t) => [
      t.tradeNo,
      t.date,
      t.time,
      t.sessionType,
      t.secId,
      t.buySell === 'B' ? 'BUY' : 'SELL',
      t.price,
      t.quantity,
      t.valueRub,
      t.cumulativeDeltaRub,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MOEX_${report.instrument.secId}_${report.tradingDate}_all_trades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Russian text summary with sessions and date for chat/messengers
  const handleCopySummary = () => {
    if (!report) return;
    const text = `📊 МОСКОВСКАЯ БИРЖА (MOEX) — ОТЧЕТ ЗА ТОРГОВЫЙ ДЕНЬ
📅 Дата торгов: ${report.tradingDate} (Интервал: ${report.timeRange.start} — ${report.timeRange.end} МСК)
📌 Инструмент: ${report.instrument.secId} (${report.instrument.shortName}, ${report.market === 'stocks' ? 'Акции TQBR' : 'Фьючерсы FORTS'})
🔢 Обработано анонимных сделок: ${report.tradesCount.toLocaleString('ru-RU')} (100% ленты дня)

💰 ИТОГОВАЯ ЧИСТАЯ ДЕЛЬТА ЗА ДЕНЬ: ${report.netDeltaRub >= 0 ? '+' : ''}${report.netDeltaRub.toLocaleString('ru-RU')} ₽ (${formatPercent(report.deltaPercent, true)} от оборота)
🟢 Все покупки дня: ${report.buyValueRub.toLocaleString('ru-RU')} ₽ (${report.buyTradesCount} сд., ${(report.buyRatio * 100).toFixed(1)}%)
🔴 Все продажи дня: ${report.sellValueRub.toLocaleString('ru-RU')} ₽ (${report.sellTradesCount} сд., ${((1 - report.buyRatio) * 100).toFixed(1)}%)
📦 Дельта по объемам: ${formatLots(report.netVolumeDeltaLots, true)} лотов
📈 Совокупный оборот: ${report.totalTurnoverRub.toLocaleString('ru-RU')} ₽

☀️ Основная дневная сессия (10:00–18:50):
  • Дельта: ${report.sessionsBreakdown.day.deltaVal >= 0 ? '+' : ''}${report.sessionsBreakdown.day.deltaVal.toLocaleString('ru-RU')} ₽
  • Оборот: ${report.sessionsBreakdown.day.turnover.toLocaleString('ru-RU')} ₽ (${report.sessionsBreakdown.day.count} сд.)

🌙 Вечерняя дополнительная сессия (19:00–23:50):
  • Дельта: ${report.sessionsBreakdown.evening.deltaVal >= 0 ? '+' : ''}${report.sessionsBreakdown.evening.deltaVal.toLocaleString('ru-RU')} ₽
  • Оборот: ${report.sessionsBreakdown.evening.turnover.toLocaleString('ru-RU')} ₽ (${report.sessionsBreakdown.evening.count} сд.)

🎯 Текущая цена: ${report.lastPrice} ₽ | VWAP дня: ${report.vwap} ₽`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={loadReport}
        isLoading={isLoading}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onPrint={handlePrint}
        onOpenAi={() => setIsAiOpen(true)}
        onOpenSheets={() => setIsSheetsOpen(true)}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 no-print">
        {/* Instrument Selector & Quick Filters */}
        <InstrumentSelector
          market={market}
          setMarket={setMarket}
          selectedTicker={selectedTicker}
          setSelectedTicker={setSelectedTicker}
          instrumentSpec={report?.instrument || null}
          filters={filters}
          setFilters={setFilters}
          availableDates={report?.availableDates || []}
          tradingDate={report?.tradingDate || ''}
          onGenerate={loadReport}
          isLoading={isLoading}
          isLiveFromMoex={(report as any)?.isLiveFromMoex}
        />

        {/* Error state alert */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-200 px-4 py-3 rounded-lg mb-6 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadReport}
              className="px-3 py-1 bg-rose-900/60 hover:bg-rose-800 rounded font-semibold text-white transition-colors"
            >
              Повторить
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !report && (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-slate-900 rounded-lg border border-slate-800" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-900 rounded-lg border border-slate-800" />
              ))}
            </div>
            <div className="h-64 bg-slate-900 rounded-lg border border-slate-800" />
          </div>
        )}

        {/* Populated Report View */}
        {report && (
          <>
            {/* 1. SESSIONS BREAKDOWN & TRADING DATE BANNER (ADDRESSING EXACT USER NEED) */}
            <SessionsBreakdownCard
              sessions={report.sessionsBreakdown}
              selectedSession={filters.selectedSession}
              onSelectSession={(sess) => setFilters(f => ({ ...f, selectedSession: sess }))}
              tradingDate={report.tradingDate}
              sessionDate={report.sessionDate}
              timeRange={report.timeRange}
              totalTradesInDay={report.totalTradesInDay}
            />

            {/* Quick Actions Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                <span className="font-mono font-bold text-white text-sm">
                  {report.instrument.secId}
                </span>
                <span>·</span>
                <span>{report.instrument.shortName || report.instrument.name}</span>
                <span>·</span>
                <span className="font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50 text-[11px]">
                  ✓ 100% сделок дня ({report.tradesCount.toLocaleString('ru-RU')} сд.)
                </span>
                <span>·</span>
                <span className="text-slate-500 text-[11px]">
                  Обновлено: {new Date(report.generatedAt).toLocaleTimeString('ru-RU')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSheetsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 rounded transition-colors"
                  title="Открыть скрипт и инструкцию для Google Таблиц"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Google Таблицы (23:55)</span>
                </button>

                <button
                  onClick={handleCopySummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors"
                  title="Скопировать текстовую сводку дня и сессий в буфер"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSummary ? 'Скопировано!' : 'Копировать сводку'}</span>
                </button>

                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                  <span>Экспорт CSV ({report.tradesCount})</span>
                </button>
              </div>
            </div>

            {/* 2. Core Delta KPI Cards (Reflecting Selected Session or Full Day) */}
            <DeltaKpiCards report={report} />

            {/* Tab 1: Сводный отчет (Overview) */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Cumulative Delta Chart */}
                <CumulativeDeltaChart
                  timeline={report.cumulativeDeltaTimeline}
                  instrument={report.instrument}
                />

                {/* Split 2-Column: Price Level Footprint & Whale Tape */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PriceDeltaProfile
                    profile={report.priceLevelProfile}
                    instrument={report.instrument}
                    lastPrice={report.lastPrice}
                  />

                  <div className="space-y-6">
                    <WhaleTape
                      whaleTrades={report.whaleTrades}
                      sizeDistribution={report.sizeDistribution}
                      instrument={report.instrument}
                    />
                  </div>
                </div>

                {/* Recent trades preview table */}
                <TradesTable
                  trades={report.recentTrades}
                  instrument={report.instrument}
                  onExportCsv={handleExportCsv}
                />
              </div>
            )}

            {/* Tab 2: Кумулятивная дельта (Cumulative Delta) */}
            {activeTab === 'delta-chart' && (
              <div className="space-y-6">
                <CumulativeDeltaChart
                  timeline={report.cumulativeDeltaTimeline}
                  instrument={report.instrument}
                />
                
                {/* Analytical explanation card */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-xs text-slate-300 space-y-2">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>Интерпретация Кумулятивной Дельты за торговый день {report.tradingDate}</span>
                  </h4>
                  <p className="leading-relaxed text-slate-400">
                    Кумулятивная дельта отражает непрерывную сумму покупок и продаж за весь торговый день (с {report.timeRange.start} по {report.timeRange.end} МСК).
                    Включение всех сессий — дневной и вечерней — устраняет искажения частичных выборок и позволяет сопоставлять данные с терминалами профессионального объема (ATAS, VolFix, TigerTrade).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-mono">
                    <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                      <span className="text-emerald-400 font-bold block mb-1">Дневная сессия (10:00–18:50):</span>
                      <span className="text-slate-400 text-[11px]">
                        Дельта: <strong className={report.sessionsBreakdown.day.deltaVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {report.sessionsBreakdown.day.deltaVal >= 0 ? '+' : ''}{report.sessionsBreakdown.day.deltaVal.toLocaleString('ru-RU')} ₽
                        </strong> · Оборот: {report.sessionsBreakdown.day.turnover.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                      <span className="text-rose-400 font-bold block mb-1">Вечерняя сессия (19:00–23:50):</span>
                      <span className="text-slate-400 text-[11px]">
                        Дельта: <strong className={report.sessionsBreakdown.evening.deltaVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {report.sessionsBreakdown.evening.deltaVal >= 0 ? '+' : ''}{report.sessionsBreakdown.evening.deltaVal.toLocaleString('ru-RU')} ₽
                        </strong> · Оборот: {report.sessionsBreakdown.evening.turnover.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Профиль цен (Footprint) */}
            {activeTab === 'profile' && (
              <div>
                <PriceDeltaProfile
                  profile={report.priceLevelProfile}
                  instrument={report.instrument}
                  lastPrice={report.lastPrice}
                />
              </div>
            )}

            {/* Tab 4: Лента сделок (Tick Tape) */}
            {activeTab === 'tape' && (
              <div>
                <TradesTable
                  trades={report.recentTrades}
                  instrument={report.instrument}
                  onExportCsv={handleExportCsv}
                />
              </div>
            )}

            {/* Tab 5: Крупные сделки (Whale Tape) */}
            {activeTab === 'whales' && (
              <div>
                <WhaleTape
                  whaleTrades={report.whaleTrades}
                  sizeDistribution={report.sizeDistribution}
                  instrument={report.instrument}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* AI Orderflow Analysis Modal */}
      {report && (
        <AiAnalysisCard
          report={report}
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
        />
      )}

      {/* Google Sheets Integration Script Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsOpen}
        onClose={() => setIsSheetsOpen(false)}
      />

      {/* Printable Report View (Visible only during window.print()) */}
      {report && <PrintReportView report={report} />}

      {/* Quiet Footer */}
      <footer className="mt-auto py-5 border-t border-slate-900 bg-slate-950 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span>Московская Биржа (MOEX ISS) · Полный срез обезличенных сделок торгового дня</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Дата торгов: {report?.tradingDate || '2026-11-08'}</span>
            <span>·</span>
            <span>Все сессии (Дневная + Вечерняя)</span>
            <span>·</span>
            <span>Расчет дельты в ₽</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
