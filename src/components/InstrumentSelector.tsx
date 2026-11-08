import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, TrendingUp, SlidersHorizontal, Calendar } from 'lucide-react';
import { MarketType, Instrument, ReportFilterConfig } from '../types/moex';

interface InstrumentSelectorProps {
  market: MarketType;
  setMarket: (m: MarketType) => void;
  selectedTicker: string;
  setSelectedTicker: (ticker: string) => void;
  instrumentSpec: Instrument | null;
  filters: ReportFilterConfig;
  setFilters: React.Dispatch<React.SetStateAction<ReportFilterConfig>>;
  availableDates: string[];
  tradingDate: string;
  onGenerate: () => void;
  isLoading: boolean;
  isLiveFromMoex?: boolean;
}

const POPULAR_STOCKS = [
  { id: 'SBER', name: 'Сбер' },
  { id: 'GAZP', name: 'Газпром' },
  { id: 'LKOH', name: 'Лукойл' },
  { id: 'YDEX', name: 'Яндекс' },
  { id: 'GMKN', name: 'Норникель' },
  { id: 'ROSN', name: 'Роснефть' },
  { id: 'VTBR', name: 'ВТБ' },
  { id: 'NVTK', name: 'Новатэк' },
  { id: 'PLZL', name: 'Полюс' },
  { id: 'TATN', name: 'Татнефть' },
  { id: 'T', name: 'Т-Банк' },
];

const POPULAR_FUTURES = [
  { id: 'CNYRUBF', name: 'CNYRUBF (Вечный юань)' },
  { id: 'SiZ6', name: 'Si (USD/RUB)' },
  { id: 'CRZ6', name: 'CR (CNY/RUB)' },
  { id: 'RIZ6', name: 'RTS (Индекс)' },
  { id: 'BRF7', name: 'BR (Brent)' },
  { id: 'NGX6', name: 'NG (Газ)' },
  { id: 'GDZ6', name: 'GD (Золото)' },
  { id: 'SRZ6', name: 'SR (Сбер фьюч)' },
  { id: 'GZZ6', name: 'GZ (Газпром фьюч)' },
];

export const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  market,
  setMarket,
  selectedTicker,
  setSelectedTicker,
  instrumentSpec,
  filters,
  setFilters,
  availableDates,
  tradingDate,
  onGenerate,
  isLoading,
  isLiveFromMoex,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search for MOEX instruments
  useEffect(() => {
    let active = true;
    if (searchQuery.trim().length >= 1) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/moex/securities?market=${market}&q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            if (active) {
              setSearchResults(data.securities || []);
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (active) setIsSearching(false);
        }
      }, 250);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, market]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTicker = (ticker: string) => {
    setSelectedTicker(ticker);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const currentPopular = market === 'stocks' ? POPULAR_STOCKS : POPULAR_FUTURES;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5 mb-6 text-slate-100 shadow-sm no-print">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Market switch & ticker selection */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Market segmented toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-md border border-slate-800 shrink-0">
            <button
              onClick={() => {
                if (market !== 'stocks') {
                  setMarket('stocks');
                  setSelectedTicker('SBER');
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                market === 'stocks'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Акции (TQBR)
            </button>
            <button
              onClick={() => {
                if (market !== 'futures') {
                  setMarket('futures');
                  setSelectedTicker('CNYRUBF');
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                market === 'futures'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Фьючерсы (FORTS)
            </button>
          </div>

          {/* Autocomplete / Search input */}
          <div className="relative flex-1 min-w-[200px]" ref={dropdownRef}>
            <div
              onClick={() => setIsDropdownOpen(true)}
              className="flex items-center justify-between bg-slate-950 border border-slate-700 hover:border-slate-600 focus-within:border-blue-500 rounded-md px-3 py-1.5 cursor-pointer text-xs"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono font-bold text-white text-sm">
                  {selectedTicker}
                </span>
                {instrumentSpec && (
                  <span className="text-slate-400 truncate max-w-[220px]">
                    · {instrumentSpec.shortName || instrumentSpec.name}
                  </span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            </div>

            {/* Dropdown popup */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-md shadow-2xl z-50 overflow-hidden">
                <div className="p-2 border-b border-slate-800 bg-slate-950">
                  <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-700">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`Поиск ${market === 'stocks' ? 'акции' : 'фьючерса'} по тикеру или названию...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                  {isSearching ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Поиск в реестре MOEX...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item) => (
                      <div
                        key={item.secId}
                        onClick={() => handleSelectTicker(item.secId)}
                        className={`flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-800 cursor-pointer transition-colors ${
                          selectedTicker === item.secId ? 'bg-blue-950/40 text-blue-300' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="font-mono font-bold text-white">{item.secId}</span>
                          <span className="text-slate-400 truncate">
                            {item.shortName || item.name}
                          </span>
                        </div>
                        {selectedTicker === item.secId && (
                          <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        )}
                      </div>
                    ))
                  ) : searchQuery ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Тикер не найден в реестре MOEX
                    </div>
                  ) : (
                    currentPopular.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectTicker(item.id)}
                        className={`flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-800 cursor-pointer transition-colors ${
                          selectedTicker === item.id ? 'bg-blue-950/40 text-blue-300' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{item.id}</span>
                          <span className="text-slate-400">{item.name}</span>
                        </div>
                        {selectedTicker === item.id && (
                          <Check className="w-4 h-4 text-blue-400 shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action button & options toggle */}
        <div className="flex items-center gap-2.5 shrink-0 justify-end">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
              showAdvancedFilters
                ? 'bg-slate-800 text-blue-300 border-slate-600'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Сессии & Фильтры</span>
          </button>

          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-md transition-all disabled:opacity-50 whitespace-nowrap active:scale-[0.98]"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Загрузка дня...' : 'Сформировать отчет дня'}</span>
          </button>
        </div>
      </div>

      {/* Quick popular chips & Active Date Badge */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs text-slate-400">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold shrink-0">
            Популярные:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {currentPopular.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedTicker(item.id)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  selectedTicker === item.id
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {item.id}
              </button>
            ))}
          </div>
        </div>

        {/* Date and Live MOEX status badge */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 font-mono text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Дата: <strong className="text-white">{tradingDate || '2026-11-08'}</strong></span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-400">MOEX ISS: 100% сделок дня</span>
            <div className={`w-2 h-2 rounded-full ${isLiveFromMoex ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </div>
        </div>
      </div>

      {/* Advanced Filter Drawer */}
      {showAdvancedFilters && (
        <div className="mt-4 pt-3.5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Date Selector */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-1.5">
              Дата торгового дня
            </label>
            <select
              value={filters.selectedDate || tradingDate}
              onChange={(e) => setFilters({ ...filters, selectedDate: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            >
              {availableDates && availableDates.length > 0 ? (
                availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d} {d === tradingDate ? '(Актуальный день)' : ''}
                  </option>
                ))
              ) : (
                <option value={tradingDate}>{tradingDate} (Торговый день)</option>
              )}
            </select>
          </div>

          {/* Session Selector */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-1.5">
              Торговая сессия
            </label>
            <select
              value={filters.selectedSession}
              onChange={(e) => setFilters({ ...filters, selectedSession: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="all">Все сессии дня (Дневная + Вечерняя)</option>
              <option value="day">Основная дневная сессия (10:00–18:50)</option>
              <option value="evening">Вечерняя сессия (19:00–23:50)</option>
              <option value="morning">Утренняя сессия (07:00–09:59)</option>
            </select>
          </div>

          {/* Min trade value threshold */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-1.5">
              Порог суммы сделки (₽)
            </label>
            <select
              value={filters.minTradeValueRub}
              onChange={(e) => setFilters({ ...filters, minTradeValueRub: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value={0}>Все сделки (без порога)</option>
              <option value={100000}>Крупнее 100 000 ₽</option>
              <option value={500000}>Крупнее 500 000 ₽</option>
              <option value={1000000}>Институциональные &gt; 1 000 000 ₽</option>
              <option value={5000000}>Крупные блоки &gt; 5 000 000 ₽</option>
            </select>
          </div>

          {/* Direction filter */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-1.5">
              Сторона сделки (Агрессор)
            </label>
            <select
              value={filters.tradeDirection}
              onChange={(e) => setFilters({ ...filters, tradeDirection: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="all">Все направления (Покупки + Продажи)</option>
              <option value="B">Только Покупки (Buy Aggressors)</option>
              <option value="S">Только Продажи (Sell Aggressors)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
