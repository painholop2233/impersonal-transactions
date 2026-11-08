import React, { useState, useMemo } from 'react';
import { Trade, Instrument } from '../types/moex';
import { formatRublesExact, formatRubles, formatPrice, formatLots } from '../utils/formatters';
import { ArrowUpRight, ArrowDownRight, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface TradesTableProps {
  trades: Trade[];
  instrument: Instrument;
  onExportCsv: () => void;
}

export const TradesTable: React.FC<TradesTableProps> = ({ trades, instrument, onExportCsv }) => {
  const [filterDirection, setFilterDirection] = useState<'all' | 'B' | 'S'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (filterDirection !== 'all' && t.buySell !== filterDirection) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesNo = String(t.tradeNo).toLowerCase().includes(q);
        const matchesPrice = String(t.price).includes(q);
        const matchesVal = String(t.valueRub).includes(q);
        if (!matchesNo && !matchesPrice && !matchesVal) return false;
      }
      return true;
    });
  }, [trades, filterDirection, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / pageSize));
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrades.slice(start, start + pageSize);
  }, [filteredTrades, currentPage, pageSize]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-6 text-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Лента обезличенных сделок (All Trades Tape)</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              ({filteredTrades.length} из {trades.length})
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Поток всех анонимных сделок участников торгов на MOEX с расчетом накопительной дельты.
          </p>
        </div>

        {/* Action strip: Search, filter & CSV export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-950 px-2.5 py-1 rounded border border-slate-700 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Поиск по № или цене..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-32 font-mono text-xs"
            />
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded border border-slate-800 text-xs">
            <button
              onClick={() => { setFilterDirection('all'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterDirection === 'all' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => { setFilterDirection('B'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterDirection === 'B' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Покупки
            </button>
            <button
              onClick={() => { setFilterDirection('S'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterDirection === 'S' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              Продажи
            </button>
          </div>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
            title="Экспорт всей ленты в файл CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Trades Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3 text-left">№ Сделки</th>
              <th className="py-2.5 px-3 text-left">Время</th>
              <th className="py-2.5 px-3 text-center">Сторона</th>
              <th className="py-2.5 px-3 text-right">Цена</th>
              <th className="py-2.5 px-3 text-right">Кол-во (лот)</th>
              <th className="py-2.5 px-3 text-right">Объем (₽)</th>
              <th className="py-2.5 px-3 text-right">Накопительная Дельта (₽)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedTrades.map((t, idx) => {
              const isBuy = t.buySell === 'B';
              return (
                <tr key={`${t.tradeNo}-${t.time}-${t.price}-${t.quantity}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 text-slate-400 text-left">
                    #{t.tradeNo}
                  </td>
                  <td className="py-2 px-3 text-slate-300 text-left font-medium">
                    {t.time}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                      isBuy ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                    }`}>
                      {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isBuy ? 'BUY' : 'SELL'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-white font-semibold">
                    {formatPrice(t.price, instrument.minStep)} ₽
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300">
                    {formatLots(t.quantity)}
                  </td>
                  <td className={`py-2 px-3 text-right font-medium ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatRublesExact(t.valueRub)}
                  </td>
                  <td className={`py-2 px-3 text-right font-bold ${t.cumulativeDeltaRub >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatRubles(t.cumulativeDeltaRub, true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Страница <span className="font-bold text-slate-200">{currentPage}</span> из{' '}
            <span className="font-bold text-slate-200">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
