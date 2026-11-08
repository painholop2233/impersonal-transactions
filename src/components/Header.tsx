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
  onOpenSheets: () => void;
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
  onOpenSheets,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
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
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSheets}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 hover:border-emerald-500 rounded transition-all whitespace-nowrap shadow-sm cursor-pointer"
            title="Скрипт для автоматического опроса в Google Таблицы в 23:55 МСК"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Google Таблицы</span>
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-md border transition-all whitespace-nowrap cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/80 shadow-[0_0_12px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/40 hover:bg-emerald-900/60 hover:border-emerald-500'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Автообновление данных каждые 30 сек (нажмите для переключения)"
          >
            {autoRefresh ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <Activity className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span>Авто 30с: <strong className={autoRefresh ? 'text-emerald-200' : 'text-slate-400'}>{autoRefresh ? 'ВКЛ' : 'ВЫКЛ'}</strong></span>
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
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-amber-200 bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/50 hover:border-amber-400 rounded-md transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:shadow-[0_0_18px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30 active:scale-[0.98] whitespace-nowrap cursor-pointer"
            title="Запустить мгновенный количественный и AI анализ дельты дня"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            <span className="font-medium hidden sm:inline">AI Анализ</span>
          </button>

          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors whitespace-nowrap shadow-sm"
            title="Печать или экспорт в PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
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
