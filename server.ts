import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // Resilient Server-Side Simulated Ticking Engine
  const priceState: Record<string, number> = {
    'EURUSD=X': 1.08520,
    'GBPUSD=X': 1.26840,
    'USDJPY=X': 157.350,
    'USDCHF=X': 0.8950,
    'USDCAD=X': 1.3650,
    'AUDUSD=X': 0.6650,
    'NZDUSD=X': 0.6120,
    'EURJPY=X': 170.80,
    'GBPJPY=X': 199.50,
    'EURGBP=X': 0.8550,
    'AUDJPY=X': 104.70,
    'CADJPY=X': 115.30,
    'CHFJPY=X': 175.70,
    'XAUUSD=X': 2332.60,
    'SI=F': 29.50,
    '^DJI': 39120.0,
    '^NDX': 19850.0,
    '^GSPC': 5470.0,
    '^GDAXI': 18150.0,
    '^FTSE': 8210.0,
    '^N225': 38600.0,
    '^AXJO': 7780.0,
    '^HSI': 18050.0,
    '^FCHI': 7630.0,
    'CL=F': 80.50,
    'BZ=F': 84.80,
    'NG=F': 2.85,
    'BTC-USD': 67250.00,
    'ETH-USD': 3520.00,
    'SOL-USD': 145.00,
    'XRP-USD': 0.4850,
    'BNB-USD': 580.00,
    'DOGE-USD': 0.12500,
    'ADA-USD': 0.3750,
  };

  const prevCloseState: Record<string, number> = {};
  Object.entries(priceState).forEach(([sym, val]) => {
    prevCloseState[sym] = val * (1 + (Math.random() - 0.5) * 0.002);
  });

  // Background price ticking loop (runs on server to keep prices moving)
  setInterval(() => {
    Object.keys(priceState).forEach(sym => {
      // Tiny random walk step: max +/- 0.012%
      const step = 1 + (Math.random() - 0.5) * 0.00024;
      priceState[sym] = priceState[sym] * step;
    });
  }, 1000);

  // Cache for Twelve Data to easily stay within free tier limits
  const priceCache: Record<string, { data: any; timestamp: number }> = {};
  const CACHE_TTL_MS = 25000; // 25 seconds cache TTL

  // Baselines for fallback
  const BASELINE_PRICES: Record<string, string> = {
    'XAUUSD': '2332.60',
    'GOLD': '2332.60',
    'EURUSD': '1.08520',
    'GBPUSD': '1.26840',
    'USDJPY': '157.350',
    'BTCUSD': '67250.00',
    'ETHUSD': '3520.00',
    'US30': '39120.0',
    'NAS100': '19850.0',
  };

  // Maps Twelve Data Symbols to our priceState tickers
  function mapTwelveToYahoo(cleanSym: string): string {
    if (cleanSym === 'XAUUSD' || cleanSym === 'GOLD') return 'XAUUSD=X';
    if (cleanSym === 'EURUSD') return 'EURUSD=X';
    if (cleanSym === 'GBPUSD') return 'GBPUSD=X';
    if (cleanSym === 'USDJPY') return 'USDJPY=X';
    if (cleanSym === 'BTCUSD') return 'BTC-USD';
    if (cleanSym === 'ETHUSD') return 'ETH-USD';
    return cleanSym;
  }

  // 1. Twelve Data Proxy Route
  app.get('/api/price', async (req, res) => {
    try {
      const symbol = req.query.symbol as string;
      if (!symbol) {
        return res.status(400).json({ error: 'Symbol query parameter is required' });
      }

      const cleanSymbol = symbol.toUpperCase().replace('/', '');
      const now = Date.now();
      const cached = priceCache[cleanSymbol];

      // Serve from cache if still valid
      if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
        return res.json(cached.data);
      }

      const yahooMappedSym = mapTwelveToYahoo(cleanSymbol);
      const simulatedPrice = priceState[yahooMappedSym] || parseFloat(BASELINE_PRICES[cleanSymbol] || '1.00');

      // Otherwise fetch fresh data
      const apiKey = process.env.TWELVE_DATA_API_KEY || 'd260f852e00a40c6b12a86f99725f4fb';
      const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(cleanSymbol)}&apikey=${apiKey}`;
      
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          
          // Twelve Data sometimes returns error inside a 200 response
          if (data && data.status === 'error') {
            console.warn(`[Twelve Data Error Payload] Symbol ${cleanSymbol}:`, data.message);
            
            // Fallback to cached or server-side simulated price
            const fallbackPrice = cached ? cached.data.price : String(simulatedPrice);
            return res.json({ price: fallbackPrice });
          }

          if (data && data.price) {
            // Update cache
            priceCache[cleanSymbol] = {
              data: data,
              timestamp: now
            };
            // Also sync our simulated priceState with the real data
            priceState[yahooMappedSym] = parseFloat(data.price);
            return res.json(data);
          }
          
          return res.json({ price: String(simulatedPrice) });
        } else {
          console.warn(`Twelve Data HTTP ${response.status} - Falling back to simulated price for ${cleanSymbol}`);
          return res.json({ price: String(simulatedPrice) });
        }
      } catch (fetchError: any) {
        console.warn(`Failed to fetch from Twelve Data for ${cleanSymbol}:`, fetchError.message);
        return res.json({ price: String(simulatedPrice) });
      }
    } catch (error: any) {
      console.error('Error in Twelve Data API handler:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cache for Yahoo Finance to avoid over-fetching
  const yahooCache: Record<string, { data: any; timestamp: number }> = {};
  const YAHOO_CACHE_TTL_MS = 15000; // 15 seconds cache TTL

  // Helper to generate a highly realistic simulated Yahoo Finance response
  function generateSimulatedYahooResponse(symbolsStr: string) {
    const symList = symbolsStr.split(',');
    const resultList = symList.map(symbol => {
      const cleanSym = symbol.trim().toUpperCase();
      const price = priceState[cleanSym] || 1.00;
      const prevClose = prevCloseState[cleanSym] || (price * 0.998);
      const diffPercent = ((price - prevClose) / prevClose) * 100;

      return {
        symbol: cleanSym,
        regularMarketPrice: price,
        regularMarketPreviousClose: prevClose,
        regularMarketDayHigh: Math.max(price, prevClose) * 1.002,
        regularMarketDayLow: Math.min(price, prevClose) * 0.998,
        regularMarketChangePercent: diffPercent
      };
    });

    return {
      quoteResponse: {
        result: resultList,
        error: null
      }
    };
  }

  // 2. Yahoo Finance Proxy Route
  app.get('/api/yahoo/v7/finance/quote', async (req, res) => {
    try {
      const symbols = req.query.symbols as string;
      if (!symbols) {
        return res.status(400).json({ error: 'symbols query parameter is required' });
      }

      const cacheKey = symbols.toUpperCase();
      const now = Date.now();
      const cached = yahooCache[cacheKey];

      if (cached && (now - cached.timestamp < YAHOO_CACHE_TTL_MS)) {
        return res.json(cached.data);
      }

      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const results = data?.quoteResponse?.result;
          if (Array.isArray(results) && results.length > 0) {
            yahooCache[cacheKey] = {
              data,
              timestamp: now
            };
            // Sync our local state with the successfully fetched real-time quotes
            results.forEach((item: any) => {
              if (item.symbol && item.regularMarketPrice !== undefined) {
                const s = item.symbol.toUpperCase();
                priceState[s] = parseFloat(item.regularMarketPrice);
                if (item.regularMarketPreviousClose !== undefined) {
                  prevCloseState[s] = parseFloat(item.regularMarketPreviousClose);
                }
              }
            });
            return res.json(data);
          }
        }
        
        // If response is not ok or result list is empty, fall back to our premium simulated tick generator
        console.log(`[Yahoo Fallback] Generating simulation response for: ${symbols}`);
        const mockData = generateSimulatedYahooResponse(symbols);
        return res.json(mockData);
      } catch (fetchError: any) {
        console.warn('Failed to fetch Yahoo quote, generating simulated response:', fetchError.message);
        const mockData = generateSimulatedYahooResponse(symbols);
        return res.json(mockData);
      }
    } catch (error: any) {
      console.error('Error proxying Yahoo Finance quote:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Startup Failure]:', err);
});
