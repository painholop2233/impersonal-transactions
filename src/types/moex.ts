export type MarketType = 'stocks' | 'futures';

export interface Instrument {
  secId: string;
  shortName: string;
  name: string;
  board: string;
  market: MarketType;
  lotSize: number;
  minStep: number;
  stepPrice?: number;
  prevPrice?: number;
  lastPrice?: number;
  currency: string;
}

export interface RawMoexTrade {
  tradeNo: string;
  time: string;
  date: string;
  sessionDate?: string;
  sessionType: 'morning' | 'day' | 'evening';
  secId: string;
  price: number;
  quantity: number;
  valueRub: number;
  buySell: 'B' | 'S';
  board?: string;
}

export interface Trade extends RawMoexTrade {
  cumulativeDeltaRub: number;
  cumulativeDeltaQty: number;
}

export interface PriceLevelDelta {
  price: number;
  buyValueRub: number;
  sellValueRub: number;
  netDeltaRub: number;
  buyLots: number;
  sellLots: number;
  totalValueRub: number;
}

export interface SizeBucket {
  count: number;
  buyVal: number;
  sellVal: number;
  deltaVal: number;
}

export interface SizeDistribution {
  retail: SizeBucket; // < 100 000 ₽
  medium: SizeBucket; // 100 000 ₽ - 1 000 000 ₽
  institutional: SizeBucket; // > 1 000 000 ₽
}

export interface CumulativeTimelinePoint {
  time: string;
  price: number;
  cumDeltaRub: number;
  cumDeltaLots: number;
  tradeValueRub: number;
  buySell: 'B' | 'S';
  sessionType: 'morning' | 'day' | 'evening';
}

export interface SessionStats {
  name: string;
  timeRange: string;
  count: number;
  buyVal: number;
  sellVal: number;
  deltaVal: number;
  turnover: number;
  buyLots: number;
  sellLots: number;
  deltaPercent: number;
}

export interface SessionsBreakdown {
  morning: SessionStats;
  day: SessionStats;
  evening: SessionStats;
  total: SessionStats;
}

export interface DeltaReport {
  instrument: Instrument;
  market: MarketType;
  tradingDate: string; // The trading day date (e.g. 2026-11-08)
  sessionDate: string; // Exchange clearing session date (e.g. 2026-11-09)
  availableDates: string[];
  selectedDate: string;
  selectedSession: 'all' | 'day' | 'evening' | 'morning';
  timeRange: { start: string; end: string };
  generatedAt: string;
  dataSource?: string;
  isSimulated?: boolean;
  isFullDayTape: boolean; // Indicates 100% of the trading day trades were processed
  openPrice?: number;
  closePrice?: number;
  totalTradesInDay: number;
  tradesCount: number;
  buyTradesCount: number;
  sellTradesCount: number;
  buyVolumeLots: number;
  sellVolumeLots: number;
  netVolumeDeltaLots: number;
  buyValueRub: number;
  sellValueRub: number;
  netDeltaRub: number; // THE CRITICAL METRIC: Difference between purchases and sales in rubles
  totalTurnoverRub: number;
  deltaPercent: number; // (netDeltaRub / totalTurnoverRub) * 100
  buyRatio: number; // buyValueRub / totalTurnoverRub
  vwap: number;
  buyVwap: number;
  sellVwap: number;
  minPrice: number;
  maxPrice: number;
  lastPrice: number;
  priceChange: number;
  priceChangePct: number;
  sessionsBreakdown: SessionsBreakdown;
  cumulativeDeltaTimeline: CumulativeTimelinePoint[];
  priceLevelProfile: PriceLevelDelta[];
  sizeDistribution: SizeDistribution;
  whaleTrades: Trade[];
  recentTrades: Trade[];
}

export interface ReportFilterConfig {
  sampleLimit: number;
  selectedDate: string;
  selectedSession: 'all' | 'day' | 'evening' | 'morning';
  minTradeValueRub: number;
  tradeDirection: 'all' | 'B' | 'S';
}
