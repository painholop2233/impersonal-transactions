import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X, Check, Bot, Zap } from 'lucide-react';
import { DeltaReport } from '../types/moex';

interface AiAnalysisCardProps {
  report: DeltaReport;
  isOpen: boolean;
  onClose: () => void;
}

export const AiAnalysisCard: React.FC<AiAnalysisCardProps> = ({ report, isOpen, onClose }) => {
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [engine, setEngine] = useState<string>('gemini-3.8-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    try {
      const payload = {
        instrument: report.instrument,
        tradingDate: report.tradingDate,
        market: report.market,
        totalTurnoverRub: report.totalTurnoverRub,
        buyValueRub: report.buyValueRub,
        sellValueRub: report.sellValueRub,
        netDeltaRub: report.netDeltaRub,
        deltaPercent: report.deltaPercent,
        buyRatio: report.buyRatio,
        tradesCount: report.tradesCount,
        netVolumeDeltaLots: report.netVolumeDeltaLots,
        lastPrice: report.lastPrice,
        vwap: report.vwap,
        priceChange: report.priceChange,
        priceChangePct: report.priceChangePct,
        timeRange: report.timeRange,
        selectedSession: report.selectedSession,
        sessionsBreakdown: report.sessionsBreakdown,
        sizeDistribution: report.sizeDistribution,
      };

      const res = await fetch('/api/ai/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisText(data.analysis);
        if (data.engine) setEngine(data.engine);
      } else {
        setAnalysisText('Не удалось сформировать заключение по потоку ордеров.');
      }
    } catch (e) {
      setAnalysisText('Ошибка связи с сервером аналитики.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate immediately on open so user gets instant results
  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
    }
  }, [isOpen, report.instrument.secId, report.tradingDate, report.selectedSession]);

  const handleCopy = () => {
    if (!analysisText) return;
    navigator.clipboard.writeText(analysisText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm no-print">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full p-6 text-slate-100 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-sm">
              <Bot className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Анализ Потока Ордеров & Дельты (AI Order Flow)
                </h3>
                <span className="text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {engine === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash' : 'Order Flow Engine'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {report.instrument.secId} ({report.instrument.shortName}) · Торговый день: {report.tradingDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="py-12 text-center text-slate-300">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
              <p className="text-xs font-mono text-slate-300">
                Количественный расчет абсорбции и агрессии за {report.tradingDate}...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans select-text">
                {analysisText}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={fetchAnalysis}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-slate-700 hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Пересчитать</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : null}
                  <span>{copied ? 'Скопировано в буфер' : 'Копировать вывод'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
