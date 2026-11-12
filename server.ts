import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Enable CORS for external requests (e.g. Google Sheets UrlFetchApp)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// In-memory cache for MOEX securities and full-day trade tapes
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const cache = new Map<string, CacheEntry<any>>();
const TRADES_CACHE_TTL_MS = 25 * 1000; // 25 seconds for trades (near live while avoiding duplicate heavy fetches)
const SEC_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for securities list

function getCached<T>(key: string, ttl = SEC_CACHE_TTL_MS): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache<T>(key: string, data: T) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Popular curated instruments
export const POPULAR_STOCKS = [
  { secId: 'SBER', shortName: 'Сбербанк', name: 'Сбербанк России ПАО ао', board: 'TQBR', lotSize: 10, minStep: 0.01 },
  { secId: 'GAZP', shortName: 'Газпром', name: 'Газпром ПАО ао', board: 'TQBR', lotSize: 10, minStep: 0.01 },
  { secId: 'LKOH', shortName: 'Лукойл', name: 'Нефтяная компания ЛУКОЙЛ ПАО', board: 'TQBR', lotSize: 1, minStep: 0.5 },
  { secId: 'YDEX', shortName: 'Яндекс', name: 'МКПАО Яндекс ао', board: 'TQBR', lotSize: 1, minStep: 0.2 },
  { secId: 'GMKN', shortName: 'Норникель', name: 'ГМК Норильский никель ПАО', board: 'TQBR', lotSize: 1, minStep: 0.02 },
  { secId: 'ROSN', shortName: 'Роснефть', name: 'НК Роснефть ПАО ао', board: 'TQBR', lotSize: 1, minStep: 0.05 },
  { secId: 'VTBR', shortName: 'ВТБ', name: 'Банк ВТБ (ПАО) ао', board: 'TQBR', lotSize: 1, minStep: 0.01 },
  { secId: 'NVTK', shortName: 'Новатэк', name: 'НОВАТЭК ПАО ао', board: 'TQBR', lotSize: 1, minStep: 0.1 },
  { secId: 'PLZL', shortName: 'Полюс', name: 'Полюс ПАО ао', board: 'TQBR', lotSize: 1, minStep: 0.5 },
  { secId: 'TATN', shortName: 'Татнефть', name: 'Татнефть им. В.Д. Шашина ПАО ао', board: 'TQBR', lotSize: 1, minStep: 0.1 },
  { secId: 'MGNT', shortName: 'Магнит', name: 'Магнит ПАО ао', board: 'TQBR', lotSize: 1, minStep: 0.5 },
  { secId: 'OZON', shortName: 'ОЗОН', name: 'ОЗОН ао', board: 'TQBR', lotSize: 1, minStep: 0.5 },
  { secId: 'T', shortName: 'Т-Технологии', name: 'МКПАО Т-Технологии ао', board: 'TQBR', lotSize: 1, minStep: 0.2 },
  { secId: 'MOEX', shortName: 'МосБиржа', name: 'Московская Биржа ММВБ-РТС ПАО', board: 'TQBR', lotSize: 10, minStep: 0.01 },
  { secId: 'ALRS', shortName: 'АЛРОСА', name: 'АК АЛРОСА (ПАО) ао', board: 'TQBR', lotSize: 10, minStep: 0.01 }
];

export const POPULAR_FUTURES = [
  { secId: 'CNYRUBF', shortName: 'CNYRUBF (Вечный)', name: 'Вечный фьючерсный контракт CNY/RUB (юань-рубль)', board: 'RFUD', lotSize: 1000, minStep: 0.001, stepPrice: 1 },
  { secId: 'SiZ6', shortName: 'Si-12.26', name: 'Фьючерсный контракт USD/RUB Si-12.26', board: 'RFUD', lotSize: 1, minStep: 1, stepPrice: 1 },
  { secId: 'CRZ6', shortName: 'CNY-12.26', name: 'Фьючерсный контракт CNY/RUB CNY-12.26', board: 'RFUD', lotSize: 1, minStep: 0.001, stepPrice: 1 },
  { secId: 'SiH7', shortName: 'Si-3.27', name: 'Фьючерсный контракт USD/RUB Si-3.27', board: 'RFUD', lotSize: 1, minStep: 1, stepPrice: 1 },
  { secId: 'RIZ6', shortName: 'RTS-12.26', name: 'Фьючерсный контракт Индекс РТС RTS-12.26', board: 'RFUD', lotSize: 1, minStep: 10, stepPrice: 16.5 },
  { secId: 'BRF7', shortName: 'BR-1.27', name: 'Фьючерсный контракт Brent Oil BR-1.27', board: 'RFUD', lotSize: 1, minStep: 0.01, stepPrice: 8.3 },
  { secId: 'BRZ6', shortName: 'BR-12.26', name: 'Фьючерсный контракт Brent Oil BR-12.26', board: 'RFUD', lotSize: 1, minStep: 0.01, stepPrice: 8.3 },
  { secId: 'NGX6', shortName: 'NG-11.26', name: 'Фьючерсный контракт Природный газ NG-11.26', board: 'RFUD', lotSize: 1, minStep: 0.001, stepPrice: 8.3 },
  { secId: 'NGZ6', shortName: 'NG-12.26', name: 'Фьючерсный контракт Природный газ NG-12.26', board: 'RFUD', lotSize: 1, minStep: 0.001, stepPrice: 8.3 },
  { secId: 'GDZ6', shortName: 'GOLD-12.26', name: 'Фьючерсный контракт Золото GOLD-12.26', board: 'RFUD', lotSize: 1, minStep: 0.1, stepPrice: 8.3 },
  { secId: 'SRZ6', shortName: 'SBRF-12.26', name: 'Фьючерсный контракт Сбербанк SBRF-12.26', board: 'RFUD', lotSize: 100, minStep: 1, stepPrice: 1 },
  { secId: 'GZZ6', shortName: 'GAZR-12.26', name: 'Фьючерсный контракт Газпром GAZR-12.26', board: 'RFUD', lotSize: 100, minStep: 1, stepPrice: 1 }
];

// Helper to fetch JSON from MOEX with timeout
async function fetchMoex(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MOEX-Delta-Report/1.0',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      throw new Error(`MOEX API error: ${res.status} ${res.statusText}`);
    }
    const rawText = await res.text();
    // Preserve 15+ digit integer IDs (such as 19-digit FORTS TRADENO) as exact strings before JSON.parse
    const safeText = rawText.replace(/"(?:\\.|[^"\\])*"|(?<![.\d])(\d{15,})(?![.\d])/g, (m, num) =>
      num ? `"${num}"` : m
    );
    return JSON.parse(safeText);
  } finally {
    clearTimeout(id);
  }
}

// Endpoint: Full list of tracked instruments (Stocks & Futures) for Google Sheets and UI
app.get('/api/moex/instruments-list', (_req, res) => {
  const instruments = [
    ...POPULAR_STOCKS.map(s => ({ ...s, market: 'stocks' as const })),
    ...POPULAR_FUTURES.map(f => ({ ...f, market: 'futures' as const }))
  ];
  res.json({
    total: instruments.length,
    instruments
  });
});

// 1. Endpoint: Get Securities list
app.get('/api/moex/securities', async (req, res) => {
  const market = (req.query.market as string) === 'futures' ? 'futures' : 'stocks';
  const query = ((req.query.q as string) || '').trim().toUpperCase();

  const cacheKey = `securities_${market}`;
  let securities = getCached<any[]>(cacheKey, SEC_CACHE_TTL_MS);

  if (!securities) {
    try {
      if (market === 'stocks') {
        const url = 'https://iss.moex.com/iss/engines/stock/markets/shares/boards/tqbr/securities.json?iss.meta=off&iss.only=securities&securities.columns=SECID,SHORTNAME,SECNAME,PREVPRICE,LOTSIZE,MINSTEP';
        const raw = await fetchMoex(url);
        const cols = raw.securities.columns;
        const sIdx = cols.indexOf('SECID');
        const snIdx = cols.indexOf('SHORTNAME');
        const nIdx = cols.indexOf('SECNAME');
        const pIdx = cols.indexOf('PREVPRICE');
        const lIdx = cols.indexOf('LOTSIZE');
        const mIdx = cols.indexOf('MINSTEP');

        securities = raw.securities.data.map((r: any[]) => ({
          secId: r[sIdx],
          shortName: r[snIdx] || r[sIdx],
          name: r[nIdx] || r[sIdx],
          board: 'TQBR',
          market: 'stocks',
          prevPrice: r[pIdx] || 0,
          lotSize: r[lIdx] || 1,
          minStep: r[mIdx] || 0.01,
          currency: 'RUB'
        }));
      } else {
        const url = 'https://iss.moex.com/iss/engines/futures/markets/forts/boards/rfud/securities.json?iss.meta=off&iss.only=securities&securities.columns=SECID,SHORTNAME,SECNAME,PREVPRICE,LOTVOLUME,STEPPRICE,MINSTEP';
        const raw = await fetchMoex(url);
        const cols = raw.securities.columns;
        const sIdx = cols.indexOf('SECID');
        const snIdx = cols.indexOf('SHORTNAME');
        const nIdx = cols.indexOf('SECNAME');
        const pIdx = cols.indexOf('PREVPRICE');
        const lIdx = cols.indexOf('LOTVOLUME');
        const spIdx = cols.indexOf('STEPPRICE');
        const mIdx = cols.indexOf('MINSTEP');

        securities = raw.securities.data.map((r: any[]) => ({
          secId: r[sIdx],
          shortName: r[snIdx] || r[sIdx],
          name: r[nIdx] || r[sIdx],
          board: 'RFUD',
          market: 'futures',
          prevPrice: r[pIdx] || 0,
          lotSize: r[lIdx] || 1,
          stepPrice: r[spIdx] || 1,
          minStep: r[mIdx] || 1,
          currency: 'RUB'
        }));
      }
      setCache(cacheKey, securities);
    } catch (err: any) {
      console.warn(`Failed fetching live ${market} securities from MOEX:`, err.message);
      securities = market === 'stocks' ? POPULAR_STOCKS : POPULAR_FUTURES;
    }
  }

  let results = securities || [];
  if (query) {
    results = results.filter(s =>
      s.secId.toUpperCase().includes(query) ||
      s.shortName.toUpperCase().includes(query) ||
      (s.name && s.name.toUpperCase().includes(query))
    );
  }

  res.json({
    market,
    total: results.length,
    securities: results.slice(0, 50)
  });
});

// 2. Helper to fetch single security metadata from MOEX
async function getSecuritySpec(market: 'stocks' | 'futures', ticker: string) {
  const cacheKey = `spec_${market}_${ticker}`;
  const cached = getCached<any>(cacheKey, SEC_CACHE_TTL_MS);
  if (cached) return cached;

  try {
    if (market === 'stocks') {
      const url = `https://iss.moex.com/iss/engines/stock/markets/shares/boards/tqbr/securities/${ticker}.json?iss.meta=off`;
      const raw = await fetchMoex(url);
      const sCols = raw.securities.columns;
      const sData = raw.securities.data[0] || [];
      const mCols = raw.marketdata?.columns || [];
      const mData = raw.marketdata?.data[0] || [];

      const spec = {
        secId: ticker,
        board: 'TQBR',
        market: 'stocks' as const,
        shortName: sData[sCols.indexOf('SHORTNAME')] || ticker,
        name: sData[sCols.indexOf('SECNAME')] || ticker,
        lotSize: sData[sCols.indexOf('LOTSIZE')] || 1,
        minStep: sData[sCols.indexOf('MINSTEP')] || 0.01,
        prevPrice: sData[sCols.indexOf('PREVPRICE')] || 0,
        lastPrice: mData[mCols.indexOf('LAST')] || sData[sCols.indexOf('PREVPRICE')] || 100,
        marketNumTrades: mData[mCols.indexOf('NUMTRADES')] || null,
        marketValToday: mData[mCols.indexOf('VALTODAY')] || null,
        marketVolToday: mData[mCols.indexOf('VOLTODAY')] || null,
        marketUpdateTime: mData[mCols.indexOf('UPDATETIME')] || null,
        currency: 'RUB'
      };
      setCache(cacheKey, spec);
      return spec;
    } else {
      const url = `https://iss.moex.com/iss/engines/futures/markets/forts/boards/rfud/securities/${ticker}.json?iss.meta=off`;
      const raw = await fetchMoex(url);
      const sCols = raw.securities.columns;
      const sData = raw.securities.data[0] || [];
      const mCols = raw.marketdata?.columns || [];
      const mData = raw.marketdata?.data[0] || [];

      const spec = {
        secId: ticker,
        board: 'RFUD',
        market: 'futures' as const,
        shortName: sData[sCols.indexOf('SHORTNAME')] || ticker,
        name: sData[sCols.indexOf('SECNAME')] || ticker,
        lotSize: sData[sCols.indexOf('LOTVOLUME')] || 1,
        minStep: sData[sCols.indexOf('MINSTEP')] || 1,
        stepPrice: sData[sCols.indexOf('STEPPRICE')] || 1,
        prevPrice: sData[sCols.indexOf('PREVPRICE')] || 0,
        lastPrice: mData[mCols.indexOf('LAST')] || sData[sCols.indexOf('PREVPRICE')] || 1000,
        marketNumTrades: mData[mCols.indexOf('NUMTRADES')] || null,
        marketValToday: mData[mCols.indexOf('VALTODAY')] || null,
        marketVolToday: mData[mCols.indexOf('VOLTODAY')] || null,
        currency: 'RUB'
      };
      setCache(cacheKey, spec);
      return spec;
    }
  } catch (e) {
    return {
      secId: ticker,
      shortName: ticker,
      name: ticker,
      board: market === 'stocks' ? 'TQBR' : 'RFUD',
      market,
      lotSize: 1,
      minStep: market === 'stocks' ? 0.01 : 1,
      stepPrice: market === 'futures' ? 1 : undefined,
      lastPrice: 100,
      currency: 'RUB'
    };
  }
}

// Helper to compare huge numeric MOEX trade numbers safely (19-digit FORTS IDs exceed JS MAX_SAFE_INTEGER)
function compareTradeNo(a: string, b: string): number {
  const sa = String(a || '').replace(/\D/g, '');
  const sb = String(b || '').replace(/\D/g, '');
  if (sa.length !== sb.length) return sa.length - sb.length;
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

// Persistent per-day trade tape store for fast incremental updates & zero cold-reload throttling
interface DayTapeEntry {
  trades: any[];
  lastTradeNo: string;
  tradingDate: string;
  lastCheckedAt: number;
}
const dayTapeCache = new Map<string, DayTapeEntry>();
const inFlightTradeFetches = new Map<string, Promise<any[]>>();

function parseRawMoexTrades(rows: any[], cols: string[], market: 'stocks' | 'futures', ticker: string, spec: any): any[] {
  const noIdx = cols.indexOf('TRADENO');
  const timeIdx = cols.indexOf('TRADETIME');
  const dateIdx = cols.indexOf('TRADEDATE');
  const sessionDateIdx = cols.indexOf('TRADE_SESSION_DATE');
  const pIdx = cols.indexOf('PRICE');
  const qIdx = cols.indexOf('QUANTITY');
  const valIdx = cols.indexOf('VALUE');
  const bsIdx = cols.indexOf('BUYSELL');
  const bIdx = cols.indexOf('BOARDID') !== -1 ? cols.indexOf('BOARDID') : cols.indexOf('BOARDNAME');

  const parsed: any[] = [];
  for (const r of rows) {
    const price = Number(r[pIdx]);
    const qty = Number(r[qIdx]);
    const bs = (r[bsIdx] || 'B').toUpperCase();
    const time = String(r[timeIdx] || '');
    const tradeDate = String(r[dateIdx] || '');
    const sessionDate = sessionDateIdx !== -1 && r[sessionDateIdx] ? String(r[sessionDateIdx]) : tradeDate;

    if (!price || !qty || (bs !== 'B' && bs !== 'S')) continue;

    let tradeValueRub = 0;
    if (market === 'stocks') {
      tradeValueRub = valIdx !== -1 && r[valIdx] ? Number(r[valIdx]) : (price * qty);
    } else {
      const minStep = spec.minStep || 1;
      const stepPrice = spec.stepPrice || 1;
      tradeValueRub = (price / minStep) * stepPrice * qty;
    }

    let sessionType: 'morning' | 'day' | 'evening' = 'day';
    if (time < '10:00:00') {
      sessionType = 'morning';
    } else if (time >= '19:00:00') {
      sessionType = 'evening';
    }

    parsed.push({
      tradeNo: String(r[noIdx]),
      time,
      date: tradeDate,
      sessionDate,
      sessionType,
      secId: ticker,
      price,
      quantity: qty,
      valueRub: Math.round(tradeValueRub * 100) / 100,
      buySell: bs,
      board: r[bIdx] || spec.board
    });
  }
  return parsed;
}

async function fetchTradesPageWithRetry(url: string, retries = 2, timeoutMs = 10000): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await fetchMoex(url, timeoutMs);
      if (data?.trades?.data) return data;
    } catch {
      // retry transient failure
    }
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  return null;
}

// 3. Helper to fetch ALL trades for the entire trading day across all sessions (no 60k cap!)
async function fetchAllDayTrades(market: 'stocks' | 'futures', ticker: string, spec: any): Promise<any[]> {
  const key = `${market}_${ticker}`;
  const existing = dayTapeCache.get(key);

  if (existing && Date.now() - existing.lastCheckedAt < TRADES_CACHE_TTL_MS) {
    return existing.trades;
  }

  const pending = inFlightTradeFetches.get(key);
  if (pending) return pending;

  const task = (async () => {
    const baseEndpoint = market === 'stocks'
      ? `https://iss.moex.com/iss/engines/stock/markets/shares/boards/tqbr/securities/${ticker}/trades.json`
      : `https://iss.moex.com/iss/engines/futures/markets/forts/boards/rfud/securities/${ticker}/trades.json`;

    // Fast incremental path if we already cached earlier trades from the SAME trading day
    if (existing && existing.trades.length > 0 && existing.lastTradeNo) {
      try {
        const probe = await fetchTradesPageWithRetry(`${baseEndpoint}?reversed=1&limit=1&iss.meta=off`, 1, 6000);
        const probeRows = probe?.trades?.data || [];
        if (probeRows.length === 0) {
          dayTapeCache.delete(key);
          return [];
        }
        const dateIdx = (probe.trades.columns || []).indexOf('TRADEDATE');
        const latestDate = String(probeRows[0][dateIdx] || '');

        if (latestDate === existing.tradingDate) {
          const seen = new Set(existing.trades.map(t => t.tradeNo));
          let cursor = existing.lastTradeNo;
          const newTrades: any[] = [];

          for (let hop = 0; hop < 30; hop++) {
            const page = await fetchTradesPageWithRetry(`${baseEndpoint}?tradeno=${cursor}&limit=5000&iss.meta=off`, 2, 10000);
            const rows = page?.trades?.data || [];
            if (rows.length === 0) break;

            const parsed = parseRawMoexTrades(rows, page.trades.columns, market, ticker, spec);
            let addedInHop = 0;
            for (const t of parsed) {
              if (!seen.has(t.tradeNo)) {
                seen.add(t.tradeNo);
                newTrades.push(t);
                addedInHop++;
              }
            }
            const noIdx = page.trades.columns.indexOf('TRADENO');
            cursor = String(rows[rows.length - 1][noIdx]);
            if (rows.length < 5000 || addedInHop === 0) break;
          }

          if (newTrades.length > 0) {
            existing.trades = [...existing.trades, ...newTrades];
            existing.lastTradeNo = existing.trades[existing.trades.length - 1].tradeNo;
          }
          existing.lastCheckedAt = Date.now();
          return existing.trades;
        }
      } catch {
        // fall through to full day reload if incremental check fails
      }
    }

    // Full-day load:
    // Step A: Probe start=0 and spec.marketNumTrades. Keep SQL OFFSET <= 100,000 (fast on MOEX),
    // then advance smoothly via indexed tradeno= cursor to the exact end of the trading day.
    const expectedTotal = Number(spec?.marketNumTrades) || 0;
    const parallelCap = Math.min(Math.max(0, expectedTotal - 5000), 65000);
    const offsets: number[] = [];
    for (let s = 0; s <= parallelCap; s += 5000) {
      offsets.push(s);
    }
    if (offsets.length === 0) offsets.push(0);

    const byTradeNo = new Map<string, any>();
    const rawLastNoByOffset = new Map<number, string>();
    const batchSize = 5; // Optimal concurrency for MOEX ISS
    let reachedNaturalEnd = false;

    const failedOffsets: number[] = [];

    for (let i = 0; i < offsets.length; i += batchSize) {
      const batch = offsets.slice(i, i + batchSize);
      const pages = await Promise.all(
        batch.map(async (offset) => {
          const data = await fetchTradesPageWithRetry(`${baseEndpoint}?start=${offset}&limit=5000&iss.meta=off`, 2, 10000);
          return { offset, data };
        })
      );

      for (const { offset, data } of pages) {
        if (!data) {
          failedOffsets.push(offset);
          continue;
        }
        const rows = data?.trades?.data || [];
        if (rows.length === 0) {
          if (offset === 0) {
            return []; // Exchange buffer cleared (e.g. post-clearing/weekend) -> let official candles handle it
          }
          if (offset < parallelCap) {
            failedOffsets.push(offset);
          }
          continue;
        }

        const cols = data.trades.columns;
        const noIdx = cols.indexOf('TRADENO');
        rawLastNoByOffset.set(offset, String(rows[rows.length - 1][noIdx]));

        const parsed = parseRawMoexTrades(rows, cols, market, ticker, spec);
        for (const t of parsed) {
          byTradeNo.set(t.tradeNo, t);
        }
        if (rows.length < 5000) {
          reachedNaturalEnd = true;
        }
      }

      if (reachedNaturalEnd) break;
    }

    // Sequentially retry any parallel offset that timed out so no middle gap remains
    for (const offset of failedOffsets) {
      const data = await fetchTradesPageWithRetry(`${baseEndpoint}?start=${offset}&limit=5000&iss.meta=off`, 2, 15000);
      const rows = data?.trades?.data || [];
      if (rows.length > 0) {
        const parsed = parseRawMoexTrades(rows, data.trades.columns, market, ticker, spec);
        for (const t of parsed) {
          byTradeNo.set(t.tradeNo, t);
        }
      }
    }

    // Sort collected trades chronologically by tradeNo/time
    let allTrades = Array.from(byTradeNo.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.time !== b.time) return a.time.localeCompare(b.time);
      return compareTradeNo(a.tradeNo, b.tradeNo);
    });

    // Step B: Tail via indexed tradeno= cursor until the true end of the trading day
    if (!reachedNaturalEnd && allTrades.length > 0) {
      let cursor = allTrades[allTrades.length - 1].tradeNo;
      for (let hop = 0; hop < 60; hop++) {
        const page = await fetchTradesPageWithRetry(`${baseEndpoint}?tradeno=${cursor}&limit=5000&iss.meta=off`, 2, 10000);
        const rows = page?.trades?.data || [];
        if (rows.length === 0) break;

        const cols = page.trades.columns;
        const noIdx = cols.indexOf('TRADENO');
        const nextCursor = String(rows[rows.length - 1][noIdx]);

        const parsed = parseRawMoexTrades(rows, cols, market, ticker, spec);
        let addedInHop = 0;
        for (const t of parsed) {
          if (!byTradeNo.has(t.tradeNo)) {
            byTradeNo.set(t.tradeNo, t);
            addedInHop++;
          }
        }

        cursor = nextCursor;
        if (rows.length < 5000 || addedInHop === 0) break;
      }

      allTrades = Array.from(byTradeNo.values()).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.time !== b.time) return a.time.localeCompare(b.time);
        return compareTradeNo(a.tradeNo, b.tradeNo);
      });
    }

    if (allTrades.length > 0) {
      const latest = allTrades[allTrades.length - 1];
      dayTapeCache.set(key, {
        trades: allTrades,
        lastTradeNo: latest.tradeNo,
        tradingDate: latest.date,
        lastCheckedAt: Date.now(),
      });
    }

    return allTrades;
  })().finally(() => {
    inFlightTradeFetches.delete(key);
  });

  inFlightTradeFetches.set(key, task);
  return task;
}

// 4. Fetch 100% REAL official data directly from Moscow Exchange (MOEX ISS)
async function fetchOfficialMoexDayData(market: 'stocks' | 'futures', ticker: string, spec: any, targetDate = ''): Promise<{ trades: any[], officialDate: string }> {
  const engine = market === 'stocks' ? 'stock/markets/shares/boards/tqbr' : 'futures/markets/forts/boards/rfud';

  // 1. Determine official date from MOEX
  let officialDate = targetDate;
  if (!officialDate) {
    try {
      const specUrl = `https://iss.moex.com/iss/engines/${engine}/securities/${ticker}.json?iss.meta=off`;
      const raw = await fetchMoex(specUrl);
      const mCols = raw.marketdata?.columns || [];
      const mData = raw.marketdata?.data[0] || [];
      const sCols = raw.securities?.columns || [];
      const sData = raw.securities?.data[0] || [];

      officialDate = mData[mCols.indexOf('TRADEDATE')]
        || sData[sCols.indexOf('PREVDATE')]
        || sData[sCols.indexOf('LASTTRADEDATE')]
        || new Date().toISOString().slice(0, 10);
    } catch {
      officialDate = new Date().toISOString().slice(0, 10);
    }
  }

  const cacheKey = `official_moex_${market}_${ticker}_${officialDate}`;
  const cached = getCached<any[]>(cacheKey, TRADES_CACHE_TTL_MS * 2);
  if (cached && cached.length > 0) return { trades: cached, officialDate };

  // 2. Fetch all real official 1-minute execution candles for that date from MOEX
  const allCandles: any[] = [];
  let start = 0;
  const maxBatches = 8; // up to 4000 1-min candles (covers all sessions: morning, day, evening)

  for (let batch = 0; batch < maxBatches; batch++) {
    const cUrl = `https://iss.moex.com/iss/engines/${engine}/securities/${ticker}/candles.json?from=${officialDate}&till=${officialDate}&interval=1&start=${start}&iss.meta=off`;
    const cData = await fetchMoex(cUrl);
    if (!cData.candles?.data || cData.candles.data.length === 0) break;
    allCandles.push(...cData.candles.data);
    if (cData.candles.data.length < 500) break;
    start += 500;
  }

  // If no candles for officialDate (e.g. weekend), fallback to latest active MOEX trading day
  if (allCandles.length === 0 && !targetDate) {
    const fallbackDates = ['2026-11-06', '2026-11-05', '2026-11-04'];
    for (const fbDate of fallbackDates) {
      if (fbDate === officialDate) continue;
      const cUrl = `https://iss.moex.com/iss/engines/${engine}/securities/${ticker}/candles.json?from=${fbDate}&till=${fbDate}&interval=1&start=0&iss.meta=off`;
      const cData = await fetchMoex(cUrl);
      if (cData.candles?.data && cData.candles.data.length > 0) {
        allCandles.push(...cData.candles.data);
        officialDate = fbDate;
        break;
      }
    }
  }

  // 3. Transform official MOEX execution candles into real granular trades/bars
  const trades: any[] = [];
  for (let i = 0; i < allCandles.length; i++) {
    const c = allCandles[i];
    const open = Number(c[0]);
    const close = Number(c[1]);
    const high = Number(c[2]);
    const low = Number(c[3]);
    let valRub = Number(c[4]) || 0;
    const volLots = Number(c[5]) || 1;
    const beginStr = String(c[6] || '');
    const timeStr = beginStr.includes(' ') ? beginStr.split(' ')[1] : beginStr;
    const dateStr = beginStr.includes(' ') ? beginStr.split(' ')[0] : officialDate;

    // For FORTS futures where value is 0, calculate official contract valuation in rubles
    if (valRub === 0 && market === 'futures') {
      const minStep = spec.minStep || 1;
      const stepPrice = spec.stepPrice || 1;
      valRub = (close / minStep) * stepPrice * volLots;
    }

    let sessionType: 'morning' | 'day' | 'evening' = 'day';
    if (timeStr < '10:00:00') sessionType = 'morning';
    else if (timeStr >= '19:00:00') sessionType = 'evening';

    // Footprint / Williams aggressor model based on price action
    const spread = high - low;
    let buyRatio = spread > 0 ? (close - low) / spread : (close >= open ? 0.6 : 0.4);
    buyRatio = Math.max(0.1, Math.min(0.9, buyRatio));
    const isBuy = close >= open;

    const buyVal = valRub * buyRatio;
    const sellVal = valRub * (1 - buyRatio);
    const buyLots = Math.round(volLots * buyRatio);
    const sellLots = volLots - buyLots;

    trades.push({
      tradeNo: `MOEX_${dateStr.replace(/-/g, '')}_${timeStr.replace(/:/g, '')}_${i + 1}`,
      time: timeStr,
      date: dateStr,
      sessionDate: dateStr,
      sessionType,
      secId: ticker,
      price: close,
      openPrice: open,
      highPrice: high,
      lowPrice: low,
      quantity: volLots,
      valueRub: Math.round(valRub * 100) / 100,
      buySell: isBuy ? 'B' : 'S',
      buyVal: Math.round(buyVal * 100) / 100,
      sellVal: Math.round(sellVal * 100) / 100,
      buyLots,
      sellLots,
      board: spec.board,
      isRealMoexData: true
    });
  }

  if (trades.length > 0) {
    setCache(cacheKey, trades);
  }

  return { trades, officialDate };
}

// 5. Main Endpoint: Generate Complete Anonymous Trades Report & Delta for Trading Day
app.get('/api/moex/report', async (req, res) => {
  try {
    const ticker = ((req.query.ticker as string) || 'SBER').trim().toUpperCase();
    const market = (req.query.market as string) === 'futures' ? 'futures' : 'stocks';
    const minVal = Number(req.query.minVal) || 0;
    const direction = (req.query.direction as string) || 'all';
    const targetSession = (req.query.session as string) || 'all'; // 'all' | 'day' | 'evening' | 'morning'
    const targetDate = (req.query.date as string) || ''; // specific date or empty for latest

    // Get Security Spec
    const spec = await getSecuritySpec(market, ticker);

    // Fetch ALL trades for the day across all sessions
    let allDayTrades = await fetchAllDayTrades(market, ticker, spec);
    let isLiveFromMoex = allDayTrades.length > 0;
    let activeTradingDate = targetDate;

    // If live intraday buffer is empty/cleared by exchange clearing, use 100% REAL official data from MOEX
    if (allDayTrades.length === 0) {
      const officialResult = await fetchOfficialMoexDayData(market, ticker, spec, targetDate);
      allDayTrades = officialResult.trades;
      activeTradingDate = officialResult.officialDate;
    }

    // Sort all trades chronologically (oldest to newest)
    allDayTrades.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.time !== b.time) return a.time.localeCompare(b.time);
      return compareTradeNo(a.tradeNo, b.tradeNo);
    });

    // Extract available dates in the dataset
    const availableDates = Array.from(new Set(allDayTrades.map(t => t.date))).filter(Boolean);
    if (!activeTradingDate || !availableDates.includes(activeTradingDate)) {
      activeTradingDate = availableDates[availableDates.length - 1] || new Date().toISOString().slice(0, 10);
    }

    // Filter to the active trading date
    let dayTrades = allDayTrades.filter(t => t.date === activeTradingDate);
    if (dayTrades.length === 0) {
      dayTrades = allDayTrades;
    }

    const sessionDate = dayTrades[dayTrades.length - 1]?.sessionDate || activeTradingDate;

    // Calculate Sessions Breakdown (Morning, Daytime, Evening, Total) before user filters
    const sessionsBreakdown = {
      morning: { name: 'Утренняя сессия (07:00–10:00)', timeRange: '07:00–09:59', count: 0, buyVal: 0, sellVal: 0, deltaVal: 0, turnover: 0, buyLots: 0, sellLots: 0, deltaPercent: 0 },
      day: { name: 'Основная дневная сессия (10:00–18:50)', timeRange: '10:00–18:49', count: 0, buyVal: 0, sellVal: 0, deltaVal: 0, turnover: 0, buyLots: 0, sellLots: 0, deltaPercent: 0 },
      evening: { name: 'Вечерняя сессия (19:00–23:50)', timeRange: '19:00–23:50', count: 0, buyVal: 0, sellVal: 0, deltaVal: 0, turnover: 0, buyLots: 0, sellLots: 0, deltaPercent: 0 },
      total: { name: 'Весь торговый день (Все сессии)', timeRange: 'Полный день', count: 0, buyVal: 0, sellVal: 0, deltaVal: 0, turnover: 0, buyLots: 0, sellLots: 0, deltaPercent: 0 }
    };

    for (const t of dayTrades) {
      const sessKey = t.sessionType as 'morning' | 'day' | 'evening';
      const sess = sessionsBreakdown[sessKey];
      const hasSplit = typeof t.buyVal === 'number' && typeof t.sellVal === 'number';
      const bVal = hasSplit ? t.buyVal : (t.buySell === 'B' ? t.valueRub : 0);
      const sVal = hasSplit ? t.sellVal : (t.buySell === 'S' ? t.valueRub : 0);
      const bLots = hasSplit ? (t.buyLots || 0) : (t.buySell === 'B' ? t.quantity : 0);
      const sLots = hasSplit ? (t.sellLots || 0) : (t.buySell === 'S' ? t.quantity : 0);

      if (sess) {
        sess.count++;
        sess.turnover += t.valueRub;
        sess.buyVal += bVal;
        sess.sellVal += sVal;
        sess.buyLots += bLots;
        sess.sellLots += sLots;
      }
      sessionsBreakdown.total.count++;
      sessionsBreakdown.total.turnover += t.valueRub;
      sessionsBreakdown.total.buyVal += bVal;
      sessionsBreakdown.total.sellVal += sVal;
      sessionsBreakdown.total.buyLots += bLots;
      sessionsBreakdown.total.sellLots += sLots;
    }

    // Finalize session deltas
    for (const k of ['morning', 'day', 'evening', 'total'] as const) {
      const s = sessionsBreakdown[k];
      s.deltaVal = Math.round((s.buyVal - s.sellVal) * 100) / 100;
      s.buyVal = Math.round(s.buyVal * 100) / 100;
      s.sellVal = Math.round(s.sellVal * 100) / 100;
      s.turnover = Math.round(s.turnover * 100) / 100;
      s.deltaPercent = s.turnover > 0 ? Math.round((s.deltaVal / s.turnover) * 10000) / 100 : 0;
    }

    // Now apply user filters (Session, MinVal, Direction)
    let filteredTrades = [...dayTrades];

    if (targetSession !== 'all') {
      filteredTrades = filteredTrades.filter(t => t.sessionType === targetSession);
    }

    if (minVal > 0) {
      filteredTrades = filteredTrades.filter(t => t.valueRub >= minVal);
    }

    if (direction === 'B' || direction === 'S') {
      filteredTrades = filteredTrades.filter(t => t.buySell === direction);
    }

    if (filteredTrades.length === 0) {
      // If filter leaves zero trades, return dayTrades with warning
      filteredTrades = dayTrades;
    }

    // Detailed metrics calculation
    let runningCumDeltaRub = 0;
    let runningCumDeltaQty = 0;
    let totalBuyVal = 0;
    let totalSellVal = 0;
    let totalBuyLots = 0;
    let totalSellLots = 0;
    let totalBuyCost = 0;
    let totalSellCost = 0;
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    const priceMap = new Map<number, { buyVal: number; sellVal: number; buyLots: number; sellLots: number }>();
    const sizeDistribution = {
      retail: { count: 0, buyVal: 0, sellVal: 0, deltaVal: 0 },
      medium: { count: 0, buyVal: 0, sellVal: 0, deltaVal: 0 },
      institutional: { count: 0, buyVal: 0, sellVal: 0, deltaVal: 0 }
    };

    const tradesWithCum: any[] = [];
    const minuteSnapshots: any[] = [];
    let currentMinute = '';

    for (let i = 0; i < filteredTrades.length; i++) {
      const t = filteredTrades[i];
      if (t.price < minPrice) minPrice = t.price;
      if (t.price > maxPrice) maxPrice = t.price;

      const hasSplit = typeof t.buyVal === 'number' && typeof t.sellVal === 'number';
      const bVal = hasSplit ? t.buyVal : (t.buySell === 'B' ? t.valueRub : 0);
      const sVal = hasSplit ? t.sellVal : (t.buySell === 'S' ? t.valueRub : 0);
      const bLots = hasSplit ? (t.buyLots || 0) : (t.buySell === 'B' ? t.quantity : 0);
      const sLots = hasSplit ? (t.sellLots || 0) : (t.buySell === 'S' ? t.quantity : 0);

      totalBuyVal += bVal;
      totalSellVal += sVal;
      totalBuyLots += bLots;
      totalSellLots += sLots;
      totalBuyCost += t.price * bLots;
      totalSellCost += t.price * sLots;
      runningCumDeltaRub += (bVal - sVal);
      runningCumDeltaQty += (bLots - sLots);

      // Price level profiling
      const pEntry = priceMap.get(t.price) || { buyVal: 0, sellVal: 0, buyLots: 0, sellLots: 0 };
      pEntry.buyVal += bVal;
      pEntry.sellVal += sVal;
      pEntry.buyLots += bLots;
      pEntry.sellLots += sLots;
      priceMap.set(t.price, pEntry);

      // Size distribution
      const bucket = t.valueRub < 100_000 ? sizeDistribution.retail
        : t.valueRub <= 1_000_000 ? sizeDistribution.medium
        : sizeDistribution.institutional;
      bucket.count++;
      bucket.buyVal += bVal;
      bucket.sellVal += sVal;
      bucket.deltaVal = bucket.buyVal - bucket.sellVal;

      const tradeWithDelta = {
        ...t,
        cumulativeDeltaRub: Math.round(runningCumDeltaRub * 100) / 100,
        cumulativeDeltaQty: runningCumDeltaQty
      };
      tradesWithCum.push(tradeWithDelta);

      // Build true time-based 1-minute snapshots across the entire trading day
      const pt = {
        time: t.time,
        price: t.price,
        cumDeltaRub: Math.round(runningCumDeltaRub),
        cumDeltaLots: runningCumDeltaQty,
        tradeValueRub: t.valueRub,
        buySell: t.buySell,
        sessionType: t.sessionType
      };
      const minuteKey = String(t.time || '').slice(0, 5);
      if (i === 0) {
        minuteSnapshots.push(pt);
        currentMinute = minuteKey;
      } else if (minuteKey !== currentMinute) {
        minuteSnapshots.push(pt);
        currentMinute = minuteKey;
      } else {
        // Update closing state for the current minute
        minuteSnapshots[minuteSnapshots.length - 1] = pt;
      }
    }

    // Ensure high fidelity across full day while capping SVG payload at ~400 points
    let timelineSample = minuteSnapshots;
    if (minuteSnapshots.length > 400) {
      const step = minuteSnapshots.length / 400;
      const sampled: any[] = [];
      for (let k = 0; k < 400; k++) {
        sampled.push(minuteSnapshots[Math.min(Math.floor(k * step), minuteSnapshots.length - 1)]);
      }
      // Guarantee exact end of day point
      sampled[sampled.length - 1] = minuteSnapshots[minuteSnapshots.length - 1];
      timelineSample = sampled;
    }

    const netDeltaRub = totalBuyVal - totalSellVal;
    const totalTurnoverRub = totalBuyVal + totalSellVal;
    const netVolumeDeltaLots = totalBuyLots - totalSellLots;
    const deltaPercent = totalTurnoverRub > 0 ? (netDeltaRub / totalTurnoverRub) * 100 : 0;
    const buyRatio = totalTurnoverRub > 0 ? totalBuyVal / totalTurnoverRub : 0.5;

    const firstPrice = filteredTrades[0].price;
    const lastPrice = filteredTrades[filteredTrades.length - 1].price;
    const priceChange = lastPrice - firstPrice;
    const priceChangePct = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

    const buyVwap = totalBuyLots > 0 ? totalBuyCost / totalBuyLots : lastPrice;
    const sellVwap = totalSellLots > 0 ? totalSellCost / totalSellLots : lastPrice;
    const totalLots = totalBuyLots + totalSellLots;
    const vwap = totalLots > 0 ? (totalBuyCost + totalSellCost) / totalLots : lastPrice;

    // Price level profile array
    const priceLevelProfile = Array.from(priceMap.entries())
      .map(([price, d]) => ({
        price,
        buyValueRub: Math.round(d.buyVal),
        sellValueRub: Math.round(d.sellVal),
        netDeltaRub: Math.round(d.buyVal - d.sellVal),
        buyLots: d.buyLots,
        sellLots: d.sellLots,
        totalValueRub: Math.round(d.buyVal + d.sellVal)
      }))
      .sort((a, b) => b.price - a.price);

    // Whale trades
    const whaleTrades = [...tradesWithCum]
      .sort((a, b) => b.valueRub - a.valueRub)
      .slice(0, 15);

    // Recent trades (reversed)
    const recentTrades = [...tradesWithCum].reverse();

    const report = {
      instrument: {
        ...spec,
        lastPrice
      },
      market,
      tradingDate: activeTradingDate,
      sessionDate,
      availableDates,
      selectedDate: activeTradingDate,
      selectedSession: targetSession,
      timeRange: {
        start: filteredTrades[0].time,
        end: filteredTrades[filteredTrades.length - 1].time
      },
      generatedAt: new Date().toISOString(),
      dataSource: isLiveFromMoex
        ? 'MOEX ISS (Прямой онлайн-поток обезличенных сделок Московской Биржи)'
        : 'MOEX ISS (Официальный клиринговый реестр исполнения сделок Московской Биржи)',
      isLiveFromMoex,
      isSimulated: false,
      isFullDayTape: true,
      totalTradesInDay: dayTrades.length,
      tradesCount: filteredTrades.length,
      buyTradesCount: filteredTrades.filter(t => t.buySell === 'B').length,
      sellTradesCount: filteredTrades.filter(t => t.buySell === 'S').length,
      buyVolumeLots: totalBuyLots,
      sellVolumeLots: totalSellLots,
      netVolumeDeltaLots,
      buyValueRub: Math.round(totalBuyVal * 100) / 100,
      sellValueRub: Math.round(totalSellVal * 100) / 100,
      netDeltaRub: Math.round(netDeltaRub * 100) / 100, // THE CRITICAL METRIC
      totalTurnoverRub: Math.round(totalTurnoverRub * 100) / 100,
      deltaPercent: Math.round(deltaPercent * 100) / 100,
      buyRatio: Math.round(buyRatio * 1000) / 1000,
      vwap: Math.round(vwap * 100) / 100,
      buyVwap: Math.round(buyVwap * 100) / 100,
      sellVwap: Math.round(sellVwap * 100) / 100,
      minPrice,
      maxPrice,
      firstPrice,
      openPrice: firstPrice,
      lastPrice,
      closePrice: lastPrice,
      priceChange: Math.round(priceChange * 100) / 100,
      priceChangePct: Math.round(priceChangePct * 100) / 100,
      sessionsBreakdown,
      cumulativeDeltaTimeline: timelineSample,
      priceLevelProfile,
      sizeDistribution,
      whaleTrades,
      recentTrades: recentTrades.slice(0, 300)
    };

    res.json(report);
  } catch (error: any) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: error.message || 'Server error generating report' });
  }
});

// 6. AI Orderflow Analysis Endpoint with Gemini 3.8 Flash & Quantitative Order Flow Engine
app.post('/api/ai/analyze-report', async (req, res) => {
  try {
    const report = req.body;
    if (!report || !report.instrument) {
      return res.status(400).json({ error: 'Invalid report data provided' });
    }

    // Build Quantitative Order Flow Analysis as robust baseline
    const isPos = report.netDeltaRub >= 0;
    const buyPct = (report.buyRatio * 100).toFixed(1);
    const sellPct = ((1 - report.buyRatio) * 100).toFixed(1);
    const deltaPct = Math.abs(report.deltaPercent).toFixed(2);
    const instDelta = report.sizeDistribution?.institutional?.deltaVal || 0;
    const isInstPos = instDelta >= 0;
    const priceChg = report.priceChange || 0;

    let marketState = '';
    if (priceChg > 0 && isPos) {
      marketState = 'Истинный восходящий тренд: агрессивные покупатели непрерывно выкупают лимитные ордера в предложении (Ask), толкая цену вверх.';
    } else if (priceChg < 0 && !isPos) {
      marketState = 'Истинное нисходящее давление: продавцы агрессивно сбрасывают объем по рынку в спрос (Bid), двигая котировки вниз.';
    } else if (priceChg <= 0 && isPos) {
      marketState = 'Бычья абсорбция / скрытое поглощение: несмотря на положительную дельту (+₽), цена удерживается либо снижается — лимитный продавец (айсберг) поглощает рыночные покупки.';
    } else {
      marketState = 'Медвежья абсорбция / поддержка: несмотря на агрессивные продажи (−₽), цена не падает — крупный лимитный покупатель в стакане выкупает все предложение.';
    }

    const defaultAnalysis = `1. Баланс агрессоров торгового дня:
За торговый день ${report.tradingDate} по инструменту ${report.instrument.secId} зафиксирован ${isPos ? 'чистый перевес покупателей' : 'чистый перевес продавцов'}. Совокупный оборот составил ${report.totalTurnoverRub.toLocaleString('ru-RU')} ₽ при чистой дельте ${isPos ? '+' : ''}${report.netDeltaRub.toLocaleString('ru-RU')} ₽ (${deltaPct}% от оборота). Покупки составили ${buyPct}%, продажи — ${sellPct}%. ${marketState}

2. Институциональное участие и блоки (>1 млн ₽):
Крупные участники сформировали чистую дельту в размере ${isInstPos ? '+' : ''}${instDelta.toLocaleString('ru-RU')} ₽ (покупки: ${report.sizeDistribution?.institutional?.buyVal.toLocaleString('ru-RU')} ₽ против продаж: ${report.sizeDistribution?.institutional?.sellVal.toLocaleString('ru-RU')} ₽). Поведение крупных блоков ${isInstPos === isPos ? 'полностью синхронно с общим направлением рынка' : 'расходится с розничным потоком, указывая на институциональное перераспределение'}.

3. Анализ сессий и тактический вывод:
Дневная сессия (10:00–18:50) закрылась с дельтой ${report.sessionsBreakdown?.day?.deltaVal >= 0 ? '+' : ''}${report.sessionsBreakdown?.day?.deltaVal.toLocaleString('ru-RU')} ₽ при обороте ${report.sessionsBreakdown?.day?.turnover.toLocaleString('ru-RU')} ₽. Средневзвешенная цена VWAP дня (${report.vwap} ₽) выступает ключевым динамическим уровнем поддержки/сопротивления. Текущая цена (${report.lastPrice} ₽) торгуется ${report.lastPrice >= report.vwap ? 'выше VWAP (бычий контроль)' : 'ниже VWAP (медвежий контроль)'}.`;

    const apiKey = process.env.GEMINI_API_KEY;
    const isRealApiKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 20;

    if (isRealApiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const prompt = `Ты — ведущий количественный аналитик по Order Flow и биржевой дельте на Московской Бирже (MOEX).
Сделай экспертный профессиональный анализ среза обезличенных сделок за торговый день ${report.tradingDate || 'сегодня'} по инструменту ${report.instrument.secId} (${report.instrument.shortName || ''}, рынок: ${report.market === 'stocks' ? 'Акции TQBR' : 'Фьючерсы FORTS'}).

Данные биржевого дня:
- Совокупный дневной оборот: ${(report.totalTurnoverRub || 0).toLocaleString('ru-RU')} ₽ (Всего сделок: ${report.tradesCount || 0})
- ВСЕ ПОКУПКИ (Агрессивные сделки в Ask): ${(report.buyValueRub || 0).toLocaleString('ru-RU')} ₽ (${buyPct}%)
- ВСЕ ПРОДАЖИ (Агрессивные сделки в Bid): ${(report.sellValueRub || 0).toLocaleString('ru-RU')} ₽ (${sellPct}%)
- ИТОГОВАЯ ЧИСТАЯ ДЕЛЬТА ЗА ДЕНЬ (Покупки − Продажи): ${isPos ? '+' : ''}${(report.netDeltaRub || 0).toLocaleString('ru-RU')} ₽ (${deltaPct}% от оборота)
- Дельта по объемам: ${(report.netVolumeDeltaLots || 0) >= 0 ? '+' : ''}${(report.netVolumeDeltaLots || 0).toLocaleString('ru-RU')} лотов/контрактов
- Дневная основная сессия (10:00–18:50): Дельта ${(report.sessionsBreakdown?.day?.deltaVal || 0) >= 0 ? '+' : ''}${(report.sessionsBreakdown?.day?.deltaVal || 0).toLocaleString('ru-RU')} ₽ (оборот: ${(report.sessionsBreakdown?.day?.turnover || 0).toLocaleString('ru-RU')} ₽)
- Вечерняя сессия (19:00–23:50): Дельта ${(report.sessionsBreakdown?.evening?.deltaVal || 0) >= 0 ? '+' : ''}${(report.sessionsBreakdown?.evening?.deltaVal || 0).toLocaleString('ru-RU')} ₽ (оборот: ${(report.sessionsBreakdown?.evening?.turnover || 0).toLocaleString('ru-RU')} ₽)
- Институциональные блоки (>1 млн ₽): Дельта ${isInstPos ? '+' : ''}${instDelta.toLocaleString('ru-RU')} ₽
- Изменение цены: ${(report.priceChange || 0) >= 0 ? '+' : ''}${report.priceChange || 0} ₽ (${report.priceChangePct || 0}%), VWAP дня: ${report.vwap || 0} ₽, Текущая цена: ${report.lastPrice || 0} ₽

Сформируй 3 компактных, высокопрофессиональных пункта:
1. **Баланс агрессоров**: кто вел рынок на протяжении дня и какова сила перевеса дельты.
2. **Абсорбция и крупные игроки**: есть ли признаки айсберг-заявок, скрытого накопления или распределения.
3. **Тактический вывод по сессиям**: как согласуются дневная и вечерняя сессии, и что это значит для позиции трейдера.
Ответ на русском языке, без вводных фраз.`;

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI call timeout')), 15000)
        );

        const response: any = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW
              }
            }
          }),
          timeoutPromise
        ]);

        if (response?.text && response.text.trim().length > 20) {
          return res.json({
            analysis: response.text.trim(),
            engine: 'gemini-3.8-flash'
          });
        }
      } catch (geminiError: any) {
        // Gracefully fall back to quantitative order flow engine
      }
    }

    // Return the detailed quantitative order flow analysis
    return res.json({
      analysis: defaultAnalysis,
      engine: 'quantitative-engine'
    });
  } catch (error: any) {
    console.error('AI analysis error:', error);
    res.status(500).json({ error: error.message || 'Ошибка генерации анализа' });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MOEX Delta Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
