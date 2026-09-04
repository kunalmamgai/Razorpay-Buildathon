# RazorCage Growth Agent

![Python 3.11](https://img.shields.io/badge/python-3.11-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![36 Tests Passing](https://img.shields.io/badge/tests-36%20passing-brightgreen)
![Razorpay Hackathon](https://img.shields.io/badge/Razorpay%20Hackathon-AI%20Growth%20Track-orange)

An AI-powered merchant revenue growth agent that automatically proposes upsell bundles and promotional campaigns — while every decision is bounded by a deterministic rules engine and immutably logged to a public audit trail.

**Built for the Razorpay AI Commerce Hackathon** · Track: AI Growth & Agentic Commerce

---

## Why This Exists

Most merchants grow revenue through manual, occasional decisions — a human looks at a dashboard once a week and decides to run a discount. RazorCage demonstrates what happens when a bounded AI agent makes these decisions continuously, in real time, for every transaction — without becoming an unaccountable black box.

The real engineering problem isn't "can an LLM suggest a discount" — it's **the moment an AI touches real money, the problem shifts from making it smart to making it safe and legible.**

## Architecture: Brain → Cage → Gate → Ledger

```
Storefront (React) → Agent Service (FastAPI)
   ├── Brain (Gemini → structured proposal)
   ├── Cage (deterministic rules engine — no LLM)
   ├── Gate (human approval for high-value decisions)
   ├── Razorpay (Orders API, test mode)
   └── Ledger (every decision → SQLite, append-only)
```

| Layer | Role | Key Property |
|-------|------|-------------|
| **Brain** | LLM proposes bundle discounts and campaigns | Advisory only — cannot create orders or approve itself |
| **Cage** | Deterministic Python rules engine | No external calls, no LLM — hard limits the AI cannot override |
| **Gate** | Human approval for discounts above 15% | Prevents unchecked high-value AI decisions |
| **Ledger** | Immutable audit trail (append-only) | Logs proposals, rejections, clamps, and every payment outcome |

## Tech Stack

- **Backend:** FastAPI (Python) · Gemini API · SQLite · Razorpay Test Mode
- **Frontend:** React (Vite) · Tailwind CSS
- **Payments:** Razorpay Standard Checkout with test cards/UPI
- **Scheduler:** APScheduler for periodic campaign orchestration

## Setup

```bash
# Backend
pip install -r requirements.txt
cp .env.example .env  # add GEMINI_API_KEY and RAZORPAY keys
python -m uvicorn backend.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

The backend seeds product data on startup. The frontend proxies API calls to the backend.

## Demo Flow

1. **Storefront** — Add items to cart. The AI growth agent proposes a bundle discount.
2. **Cage** — The rules engine checks: discount within limits? Valid SKUs? Auto-approve or needs human sign-off?
3. **Dashboard** — Every decision (including rejections and clamps) appears live in the audit trail.
4. **Failure** — Trigger a Razorpay test failure. The agent reverts — no double-charge, no stale discount.

## Key Features

- **30+ unit tests** for the policy engine covering every scenario
- **Human approval workflow** for high-value discounts (>15%)
- **Payment failure recovery** — agent reverts on failed payments
- **Live dashboard** with audit trail, campaign controls, and agent activity feed
- **Structured logging** and correlation tracking throughout

## Project Structure

```
├── backend/
│   ├── main.py                 # FastAPI entrypoint
│   ├── brain/gemini_agent.py   # LLM proposals
│   ├── cage/policy_engine.py   # Deterministic rules
│   ├── ledger/ledger.py        # Audit trail
│   ├── routes/                 # API endpoints
│   └── services/               # Business logic
├── frontend/
│   └── src/
│       ├── pages/Storefront.jsx
│       ├── pages/Dashboard.jsx
│       └── components/         # UI components
└── README.md
```

## Judging Criteria

| Requirement | How It's Proven |
|-------------|----------------|
| Explainable | Every entry has a `reasoning` field from the LLM |
| Bounded | Cage clamps proposals exceeding hard limits (with unit tests) |
| Gated | Discounts above 15% require explicit human approval |
| Audit Trail | Ledger logs every decision, including rejections |
| Graceful Failure | Payment failure triggers agent revert, no double-charge |
