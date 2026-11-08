import React from 'react';
import { SessionsBreakdown } from '../types/moex';
import { formatRublesExact, formatRubles, formatPercent, formatLots } from '../utils/formatters';
import { Sun, Moon, Sunrise, Clock, Calendar, CheckCircle2 } from 'lucide-react';

interface SessionsBreakdownCardProps {
  sessions: SessionsBreakdown;
  selectedSession: 'all' | 'day' | 'evening' | 'morning';
  onSelectSession: (s: 'all' | 'day' | 'evening' | 'morning') => void;
  tradingDate: string;
  sessionDate: string;
  timeRange: { start: string; end: string };
  totalTradesInDay: number;
}

export const SessionsBreakdownCard: React.FC<SessionsBreakdownCardProps> = ({
  sessions,
  selectedSession,
  onSelectSession,
  tradingDate,
  sessionDate,
  timeRange,
  totalTradesInDay,
}) => {
  // Format Russian readable date
  const dateObj = new Date(tradingDate);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : tradingDate;

  const sessionItems: Array<{
    id: 'all' | 'morning' | 'day' | 'evening';
    title: string;
    sub: string;
    icon: any;
    data: any;
  }> = [
    {
      id: 'all',
      title: 'Все сессии (Полный день)',
      sub: `${timeRange.start} — ${timeRange.end}`,
      icon: Clock,
      data: sessions.total,
    },
    {
      id: 'day',
      title: 'Основная дневная сессия',
      sub: '10:00 — 18:50',
      icon: Sun,
      data: sessions.day,
    },
    {
      id: 'evening',
      title: 'Вечерняя сессия',
      sub: '19:00 — 23:50',
      icon: Moon,
      data: sessions.evening,
    },
    {
      id: 'morning',
      title: 'Утренняя сессия',
      sub: '07:00 — 09:59',
      icon: Sunrise,
      data: sessions.morning,
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-6 text-slate-100 shadow-sm">
      {/* Date and Exchange Session Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-blue-400 font-semibold uppercase tracking-wider text-[11px]">
              <Calendar className="w-3.5 h-3.5" />
              Торговый день на бирже
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-slate-300 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Обработаны 100% сделок дня ({totalTradesInDay.toLocaleString('ru-RU')} сд.)
            </span>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
              {formattedDate}
            </h2>
            <span className="font-mono text-xs bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-400">
              Календарная дата: <span className="text-white font-semibold">{tradingDate}</span>
              {sessionDate && sessionDate !== tradingDate && (
                <span className="ml-2 text-slate-400">
                  (Клиринговая сессия: <span className="text-amber-300 font-semibold">{sessionDate}</span>)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Time Span pill */}
        <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2 rounded-md border border-slate-800 text-xs font-mono">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Интервал торгов дня</span>
            <span className="text-slate-200 font-semibold">{timeRange.start} — {timeRange.end} МСК</span>
          </div>
        </div>
      </div>

      {/* Interactive Session Switcher Strip */}
      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2.5">
          Аналитика сессий дня — выберите срез:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sessionItems.map((item) => {
            const isSelected = selectedSession === item.id;
            const Icon = item.icon;
            const isPos = item.data.deltaVal >= 0;
            const hasTrades = item.data.count > 0;

            return (
              <button
                key={item.id}
                onClick={() => onSelectSession(item.id)}
                className={`text-left p-3.5 rounded-lg border transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-slate-800/90 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold text-white truncate">{item.title}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                      ВЫБРАНО
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-mono mb-2">
                  {item.sub} · {item.data.count.toLocaleString('ru-RU')} сд.
                </div>

                {hasTrades ? (
                  <div className="space-y-1 pt-2 border-t border-slate-800/60 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Дельта:</span>
                      <span className={`font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatRubles(item.data.deltaVal, true)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Оборот:</span>
                      <span className="text-slate-300">{formatRubles(item.data.turnover)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span className="text-emerald-400/90">Покуп: {formatRubles(item.data.buyVal)}</span>
                      <span className="text-rose-400/90">Прод: {formatRubles(item.data.sellVal)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic pt-2 border-t border-slate-800/60">
                    Сделок не проводилось
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
