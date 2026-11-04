// Function hitung SMA
function calculateSMA(data, period) {
  if (data.length < period) return null;
  const slice = data.slice(data.length - period);
  return slice.reduce((acc, val) => acc + val, 0) / period;
}

// Function hitung RSI
function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
}

// Sinyal trading utama
export function generateSignal(candles) {
  const closes = candles.map(c => c.close);
  if (closes.length < 20) return { action: 'HOLD' };

  const currentClose = closes[closes.length - 1];
  const sma20 = calculateSMA(closes, 20);
  const rsi = calculateRSI(closes, 14);

  if (currentClose > sma20 && rsi < 70) {
    return { action: 'BUY', signalPrice: currentClose, rsi, sma20 };
  }
  if (currentClose < sma20) {
    return { action: 'SELL', signalPrice: currentClose, rsi, sma20 };
  }

  return { action: 'HOLD', signalPrice: currentClose, rsi, sma20 };
}
