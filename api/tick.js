import { Redis } from '@upstash/redis';

// Inisialisasi koneksi Upstash Redis menggunakan env bawaan Vercel
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const INITIAL_CAPITAL = 100_000_000; // Modal awal Rp100.000.000
const TAKER_FEE_PERCENT = 0.0051;     // Fee taker 0.51%
const MIN_ORDER_IDR = 25000;          // Minimal order Rp25.000
const PAIRS = ['btcidr', 'ethcidr', 'solidr'];

export default async function handler(req, res) {
  // 1. Verifikasi Keamanan Secret
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(0x191).json({ error: 'Unauthorized access' });
  }

  // 2. Cek Kill Switch Manual
  const isKillSwitchActive = process.env.KILL_SWITCH === 'true';
  if (isKillSwitchActive) {
    return res.status(200).json({ status: 'HALTED', message: 'Kill switch is ACTIVE' });
  }

  try {
    // 3. Ambil State Terakhir dari Redis
    let state = await redis.get('bot_state');
    if (!state) {
      state = {
        virtualBalance: INITIAL_CAPITAL,
        positions: {}, // { symbol: { amount, avgPrice } }
        dailyPnl: 0,
        lastProcessedCandle: {},
        updatedAt: new Date().toISOString()
      };
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      executionResult: []
    };

    // 4. Integrasi Logika Simulasi & Risk Management
    for (const pair of PAIRS) {
      // Pembacaan API Indodax & Pengecekan Spread < 2%
      const depthRes = await fetch(`https://indodax.com/api/depth/${pair}`);
      const depthData = await depthRes.json();
      
      if (!depthData.buy || !depthData.sell) continue;
      
      const bestBid = parseFloat(depthData.buy[0][0]);
      const bestAsk = parseFloat(depthData.sell[0][0]);
      const spreadPercent = ((bestAsk - bestBid) / bestAsk) * 100;

      // Catat Snapshot Orderbook untuk estimasi spread backtest
      await redis.lpush('orderbook_snapshots', JSON.stringify({
        pair, bestBid, bestAsk, spreadPercent, time: logEntry.timestamp
      }));

      if (spreadPercent > 2.0) {
        logEntry.executionResult.push({ pair, status: 'SKIPPED_HIGH_SPREAD', spreadPercent });
        continue;
      }

      // Sinyal SMA(20) & RSI(14) diproses di sini...
      logEntry.executionResult.push({ pair, bestBid, bestAsk, spreadPercent, status: 'CHECKED' });
    }

    // 5. Simpan Kembali State & Append Log
    state.updatedAt = new Date().toISOString();
    await redis.set('bot_state', JSON.stringify(state));
    await redis.lpush('raw_logs', JSON.stringify(logEntry));

    return res.status(200).json({ status: 'SUCCESS', state, logEntry });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
