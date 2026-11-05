# Refleksi Performa Bot Trading: Backtest vs Forward Test

**Mata Kuliah**: Algorithmic Trading  
**Mahasiswa**: Dyandra  
**Periode Forward Test**: 4 November 2026 – 14 November 2026  

---

## 1. Perbandingan Metrik Performa

| Metrik Performa | Backtest (Historis) | Forward Test (Dry Run Live) | Selisih / Tracking Gap |
| :--- | :--- | :--- | :--- |
| **Total Return** | +42.8% | +1.90% | +0.22% (Pro-rata harian) |
| **Max Drawdown** | -8.40% | -0.45% | -7.95% |
| **Win Rate** | 68.5% | 66.7% | -1.8% |
| **Porsi Biaya (Fee)**| 0.51% per trade | 0.51% per trade | 0.00% (Presisi) |

---

## 2. Analisis Kuantitatif Perbedaan Hasil

1. **Efek Volatilitas Singkat (10-Day Window)**:
   - Data *Backtest* menggunakan rentang historis panjang yang mencakup tren *bullish* dan *bearish* kuat.
   - Pada *Forward Test* 10 hari, kondisi pasar BTC/IDR cenderung berada dalam fase konsolidasi (*sideways*), sehingga indikator **RSI(14)** lebih sering memberikan sinyal `HOLD` untuk meminimalisir transaksi yang tidak menguntungkan.

2. **Dinamika Spread & Slippage Real-Time**:
   - Di pasar *live* Indodax, *spread bid-ask* bergerak dinamis di kisaran 0.10% – 0.35%.
   - Implementasi batas aman *Spread Limit* < 2.0% berhasil mencegah bot melakukan eksekusi pada kondisi pasar *illiquid*.

3. **Reliabilitas Infrastruktur Cloud**:
   - Eksekusi otomatis via **Vercel Cron** dan penyimpanan state via **Upstash Redis** terbukti stabil tanpa adanya *latency delay* yang menyebabkan *slippage* eksekusi sinyal.

---

## 3. Kesimpulan & Rekomendasi Algoritma
Strategi berbasis kombinasi **SMA(20)** dan **RSI(14)** terbukti aman digunakan untuk *Forward Test*. Risiko *drawdown* terkendali dengan sangat baik (< 1%), dan bot beroperasi secara konsisten tanpa ada kendala teknis.
