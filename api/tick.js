import { Redis } from '@upstash/redis';

// Inisialisasi koneksi Redis dari env Vercel
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const INITIAL_CAPITAL = 100_000_000; // Rp100.000.000
const TAKER_FEE = 0.0051;             // Fee 0.51%
const MIN_ORDER = 25000;              // Rp25.000
const PAIRS = ['btcidr', 'ethcidr', 'solidr'];

export default async function handler(req, res) {
  // 1. Keamanan Secret
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Kill Switch Check
  if (process.env.KILL_SWITCH === 'true') {
    return res.status(200).json({ status: 'HALTED', message: 'Kill switch active' });
  }

  try {
    // 3. Ambil/Inisialisasi State dari Redis
    let state = await redis.get('bot_state');
    if (typeof state === 'string') state = JSON.parse(state);
    
    if (!state) {
      state = {
        virtualBalance: INITIAL_CAPITAL,
        positions: {},
        lastProcessedCandle: {},
        updatedAt: new Date().toISOString()
      };
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      results: []
    };

    // 4. Loop Pengecekan Pair Kripto
    for (const pair of PAIRS) {
      const depthRes = await fetch(`https://indodax.com/api/depth/${pair}`);
      const depthData = await depthRes.json();
      
      if (!depthData.buy || !depthData.sell) continue;

      const bestBid = parseFloat(depthData.buy[0][0]);
      const bestAsk = parseFloat(depthData.sell[0][0]);
      const spreadPercent = ((bestAsk - bestBid) / bestAsk) * 100;

      // Catat Snapshot Orderbook tiap tick
      await redis.lpush('orderbook_snapshots', JSON.stringify({
        pair, bestBid, bestAsk, spreadPercent, timestamp: logEntry.timestamp
      }));

      // Filter Spread > 2%
      if (spreadPercent > 2.0) {
        logEntry.results.push({ pair, status: 'SKIPPED_HIGH_SPREAD', spreadPercent });
        continue;
      }

      logEntry.results.push({ pair, bestBid, bestAsk, spreadPercent, status: 'PROCESSED' });
    }

    // 5. Simpan Kembali State & Raw Logs
    state.updatedAt = new Date().toISOString();
    await redis.set('bot_state', JSON.stringify(state));
    await redis.lpush('raw_logs', JSON.stringify(logEntry));

    return res.status(200).json({ status: 'SUCCESS', state, logEntry });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
