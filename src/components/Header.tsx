import React from 'react';
import { Activity, RefreshCw, Printer, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  onPrint: () => void;
  onOpenAi: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onRefresh,
  isLoading,
  autoRefresh,
  setAutoRefresh,
  onPrint,
  onOpenAi,
}) => {
  const navTabs = [
    { id: 'overview', label: 'Сводный отчет' },
    { id: 'delta-chart', label: 'Кумулятивная дельта' },
    { id: 'profile', label: 'Профиль цен (Footprint)' },
    { id: 'tape', label: 'Лента сделок' },
    { id: 'whales', label: 'Крупные сделки' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold text-white tracking-wider text-xs shadow-sm">
            MOEX
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              МОСКОВСКАЯ БИРЖА
            </span>
            <span className="text-[11px] font-mono text-slate-400 tracking-wide uppercase">
              Аналитика Обезличенных Сделок & Дельта
            </span>
          </div>
        </div>

        {/* Zone 2: 4-5 single-line nav tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-blue-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded border transition-colors whitespace-nowrap ${
              autoRefresh
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Автообновление данных каждые 15 сек"
          >
            <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>Авто 15с: {autoRefresh ? 'ВКЛ' : 'ВЫКЛ'}</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors disabled:opacity-50 whitespace-nowrap"
            title="Запросить свежие сделки с MOEX ISS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>

          <button
            onClick={onOpenAi}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-amber-200 bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/50 hover:border-amber-400 rounded-md transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:shadow-[0_0_18px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30 active:scale-[0.98] whitespace-nowrap cursor-pointer"
            title="Запустить мгновенный количественный и AI анализ дельты дня"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            <span className="font-medium">AI Анализ потока</span>
          </button>

          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors whitespace-nowrap shadow-sm"
            title="Печать или экспорт в PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Отчет PDF</span>
          </button>
        </div>
      </div>

      {/* Mobile nav strip */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-slate-800 gap-1.5 bg-slate-900/80">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
