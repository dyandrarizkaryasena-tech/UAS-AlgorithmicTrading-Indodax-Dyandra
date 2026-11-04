import { generateSignal } from '../src/strategy.js';

export default async function handler(req, res) {
  // 1. Keamanan Endpoint (Vercel Cron & External Bearer)
  const authHeader = req.headers.authorization;
  const userAgent = req.headers['user-agent'] || '';
  const isVercelCron = userAgent.includes('vercel-cron');

  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized Access' });
  }

  // 2. Kill Switch Check
  if (process.env.KILL_SWITCH === 'true') {
    return res.status(200).json({ status: 'Kill switch active. Trading halted.' });
  }

  try {
    const pairs = ['btcidr', 'ethidr', 'solidr'];
    const results = [];

    // Ambil Waktu Server Indodax dengan User-Agent Header
    const serverTimeRes = await fetch('https://indodax.com/api/server_time', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const serverTimeData = await serverTimeRes.json();
    const serverTime = serverTimeData.server_time;

    for (const pair of pairs) {
      // Ambil Candle Historis
      const candleRes = await fetch(
        `https://indodax.com/tradingview/history_v2?symbol=${pair.toUpperCase()}&tf=60&from=${serverTime - 86400 * 5}&to=${serverTime}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );

      const contentType = candleRes.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        results.push({ pair, status: 'SKIPPED', reason: 'Non-JSON API Response' });
        continue;
      }

      const candleData = await candleRes.json();
      if (!candleData || !Array.isArray(candleData.t)) continue;

      // Formatting data candle
      const candles = candleData.t.map((t, index) => ({
        time: t,
        open: candleData.o[index],
        high: candleData.h[index],
        low: candleData.l[index],
        close: candleData.c[index],
        volume: candleData.v[index]
      }));

      // Filter Candle Tertutup: Time + duration <= serverTime
      const timeframeSec = 3600;
      const closedCandles = candles.filter(c => (c.time + timeframeSec) <= serverTime);

      // Hitung sinyal trading
      const signal = generateSignal(closedCandles);

      // Ambil Order Book Live
      const depthRes = await fetch(`https://indodax.com/api/depth/${pair}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const depth = await depthRes.json();

      const bestAsk = parseFloat(depth.buy[0][0]);
      const bestBid = parseFloat(depth.sell[0][0]);
      const spreadPercent = ((bestAsk - bestBid) / bestAsk) * 100;

      if (spreadPercent > 2.0) {
        results.push({ pair, status: 'SKIPPED', reason: 'Spread > 2%' });
        continue;
      }

      results.push({
        pair,
        signal: signal.action,
        bestAsk,
        bestBid,
        spreadPercent: spreadPercent.toFixed(2) + '%'
      });
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      results
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
