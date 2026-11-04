# UAS Algorithmic Trading - Bot Dry Run Indodax

## Informasi Mahasiswa & Repositori
- **Nama**: Dyandra
- **Mata Kuliah**: Algorithmic Trading
- **Tanggal Freeze**: Rabu, 4 November 2026
- **Status Commit Freeze**: Finalized Strategy & Parameters

---

## 1. Aturan Strategi (Strategy Rules)
- **Tipe Strategi**: Long-Only (Tanpa short, margin, atau leverage)
- **Timeframe**: 1 Jam (60 Menit)
- **Universe Pasangan (Pair)**: BTC/IDR, ETH/IDR, SOL/IDR (Dipilih berdasarkan kriteria likuiditas volume pasar IDR di awal periode)
- **Aturan Masuk (Entry)**: 
  - Beli (BUY) ketika harga Close menembus di atas SMA 20 dan RSI(14) < 70.
- **Aturan Keluar (Exit)**: 
  - Jual (SELL) ketika harga Close turun di bawah SMA 20.
- **Position Sizing**: Maksimal 30% dari total modal per posisi.

---

## 2. Risk Management & Keamanan
- **Daily Loss Limit**: Berhenti membuka posisi baru jika rugi harian mencapai 5% (direset pukul 00.00 WIB).
- **Idempotency Check**: Setiap candle 1 jam hanya diproses 1 kali berdasarkan Unix Timestamp candle tertutup.
- **Kill Switch**: Kontrol manual via variabel environment `KILL_SWITCH`.
- **Order Execution**: Order Beli di Best Ask, Order Jual di Best Bid (Taker Fee 0.51%).
- **Minimum Order**: Rp25.000 per eksekusi.
