# Contributing to Day Trader India

Thank you for your interest in contributing to **Day Trader India**! We welcome contributions from developers, quantitative researchers, and active market traders across the Indian equities ecosystem.

---

## 🛠️ Development Setup

### Prerequisites
- **Python 3.10+** (Tested on Python 3.11 & 3.12)
- **Node.js 18+** & **npm 9+**
- Active internet connection (for live NSE market data feeds)

### 1. Fork & Clone
```bash
git clone https://github.com/<your-username>/day-trader-india.git
cd day-trader-india
```

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to see the live workstation.

---

## 🚀 Priority Roadmap & Where to Contribute

We actively welcome contributions in the following areas:

### 1. Multi-Broker Adapters
Currently, the live execution engine natively supports **DhanHQ API v2**. We are building abstract broker interfaces to support:
- [ ] **Zerodha Kite Connect v3**
- [ ] **Angel One SmartAPI**
- [ ] **Fyers API v3**
- [ ] **Shoonya (Finvasia) API**
- [ ] **Groww API**

*Broker adapters should implement `place_order`, `get_positions`, `get_orders`, and `flatten_positions`.*

### 2. Scanner Strategies & Indicators
- [ ] **VWAP & Anchored VWAP (AVWAP)** Intraday Breakouts
- [ ] **Central Pivot Range (CPR) & Daily Pivot Points**
- [ ] **Option Chain Greeks & PCR (Put-Call Ratio)** for Index Day Trading (NIFTY / BANKNIFTY)
- [ ] **Supertrend Crossover (10, 3)**

### 3. Mobile & Responsive Layout
- [ ] Responsive drawer and mobile viewport optimization for iPad / smartphone tablets.

---

## 📐 Guidelines & Code Standards

- **Backend (Python)**:
  - Adhere to PEP 8 standards with type hints (`typing.Optional`, `typing.Dict`, `typing.List`).
  - Keep IST time calculations anchored to `app.core.nse_calendar.now_ist()`.
  - Maintain defensive error handling for third-party market data APIs.
- **Frontend (React & TypeScript)**:
  - Strict TypeScript types (no `any` where avoidable).
  - Use Tailwind CSS utility classes.
  - Ensure TradingView Lightweight Charts canvas instances clean up properly on unmount.
- **Pull Request Process**:
  1. Create a feature branch: `git checkout -b feature/zerodha-connector`.
  2. Test changes locally in both Paper and Live modes.
  3. Ensure `npm run build` in `frontend/` succeeds with zero errors.
  4. Submit your Pull Request with a clear description and screenshots/GIFs.

---

## ⚖️ Code of Conduct
Please be respectful, collaborative, and constructive. We are building open-source financial technology for Indian retail traders to trade systematically with discipline and risk control.

