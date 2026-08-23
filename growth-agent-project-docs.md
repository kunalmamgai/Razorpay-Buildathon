# AI Growth & Agentic Commerce — Project Docs

**Track:** AI Growth & Agentic Commerce (Razorpay hackathon track)
**Direction chosen:** Grow merchant revenue via an upsell/cross-sell + campaign orchestration agent
**Stack:** FastAPI (Python) + Gemini API + SQLite + Razorpay Test Mode + React (Vite)

---

## 1. The Problem, In Plain Terms

Most merchants today grow revenue through manual, occasional decisions — a human looks at a dashboard once a week and decides to run a discount, or a human designs one static upsell flow that never adapts. This track asks: what if a bounded AI agent made these decisions continuously, in real time, for every transaction and every campaign — without becoming an unaccountable black box that can quietly hurt the merchant?

### Why now
- NPCI is developing a **Unified Agent Protocol (UAP)** — a framework letting AI agents transact over UPI on a user's behalf, but strictly within pre-authorized limits the user defines upfront. NPCI's own role stays limited to verifying the agent is authorized — not seeing what's bought.
- Razorpay has already piloted this with NPCI and OpenAI — a private beta letting ChatGPT users in India shop and pay via UPI directly inside a chat interface.
- Globally, every major payment player is racing to define the same thing under different names: **ACP** (OpenAI/Stripe), **AP2** (Google), **x402** (Coinbase), **UCP** (Google, broader open standard), Visa's Trusted Agent Protocol, Mastercard's Agent Pay.
- The common thread across all of them: an AI agent needs a way to **discover** what's sellable, **decide** what to buy/offer, and **transact** — all while staying inside limits a human set, with a clear record of what happened.

This project is a small, concrete version of that same idea, scoped to merchant-side revenue growth instead of consumer-side shopping.

### The two agents we're building

| Agent | Timescale | Analogy | Job |
|---|---|---|---|
| **Upsell/Cross-sell Agent** | Per checkout (seconds) | A sales assistant proposing a bundle in the moment | Looks at a single cart, proposes one relevant upsell/bundle discount |
| **Campaign Orchestrator** | Hours/days | A growth marketer reviewing dashboards | Looks at aggregate order data, decides to launch/adjust discount campaigns |

### The real point of the track (not just "build an agent")

The interesting engineering problem isn't "can an LLM suggest a discount" — that's trivial. It's: **the moment an AI agent touches real money, the problem shifts from making it smart to making it safe and legible.** The hackathon's grading bar reflects this directly:

> Every money action explainable, bounded and gated. Show the audit trail and one failure handled gracefully.

We're structuring the whole system around three distinct layers to satisfy this:

1. **The Brain** — the LLM (Gemini). Creative, allowed to be wrong, proposes ideas.
2. **The Cage** — a deterministic, non-AI rules engine. Boring on purpose. Clamps or rejects anything outside hard limits (max discount %, allowed SKUs, campaign duration, spend caps). The LLM cannot override this layer.
3. **The Ledger** — a full audit log of every proposal, every cage decision, every Razorpay call, and every outcome — including proposals that got rejected. This is what turns "trust me, it's bounded" into "here's proof."

A mental model: the LLM is a junior employee who spots opportunities but doesn't have signing authority above a set amount. The cage is the approval workflow. The ledger is the audit trail any finance team would demand before letting that employee near customer payments.

### Why "one failure handled gracefully" matters specifically here

Traditional checkout failure = "payment failed, try again." Agentic checkout failure is a new class of bug: the agent may have already modified the order (added a bundle, applied a discount) *before* the payment fails. Does a retry silently reapply the discount and cost the merchant margin? Does the customer get charged an inconsistent amount? The system needs to visibly detect this and revert/handle it — not just demo the happy path.

---

## 2. The Ledger, In Depth

Every ledger entry must answer four questions, not just "what happened":

1. **What was proposed** — raw agent output before any rules applied (e.g., "25% off bundle of SKU_123 + SKU_456")
2. **Why** — the plain-English reasoning from the LLM (e.g., "cart abandonment risk: user viewed SKU_456 three times without adding to cart")
3. **What actually happened after the cage** — approved as-is / clamped down / rejected outright, and which rule was hit
4. **What the outcome was** — Razorpay order ID, payment ID, status, timestamp

**Critical design decision:** store the raw proposal and the final (post-cage) action as *separate* fields, even when identical. This is what lets the dashboard show "agent asked for 25%, got capped to 20%" — the single strongest proof-of-bounding demo moment.

**Also log rejected proposals**, not just successful ones. A ledger that only shows successes can't prove the system ever stopped a bad decision.

### Ledger → judging bar mapping

| Requirement | Ledger field that proves it |
|---|---|
| Explainable | `reasoning` |
| Bounded | `policy_check` (proposal vs. final_action) |
| Gated | entries with `outcome = "awaiting_approval"`, followed by a human-actor entry approving/rejecting |
| Audit trail | the ledger itself |

---

## 3. Architecture

```
Storefront (React demo shop)
        │
        ▼
Agent Service (FastAPI backend)
   ├── Brain (Gemini call → structured JSON proposal)
   ├── Cage (deterministic policy engine — no external calls)
   ├── Razorpay Client (Orders API, test mode)
   └── Ledger (every decision + every API call → SQLite)
        │
        ▼
Razorpay Test Mode (Orders, Payments, test cards/UPI, mock success/failure page)
        │
        ▼
Dashboard (live audit feed + campaign controls)
```

---

## 4. Tech Stack

- **Backend:** FastAPI (Python)
- **Brain:** Gemini API (`google-genai` SDK), structured JSON output
- **Database:** SQLite (file-based, zero setup — swappable to Postgres later)
- **Payments:** Razorpay Python SDK, test-mode keys, Standard Checkout (test cards/UPI, mock success/failure page)
- **Frontend:** React (Vite) — one storefront view, one dashboard/ledger view
- **Scheduler:** in-process APScheduler for the campaign orchestrator's periodic review

---

## 5. Folder Structure

```
marlin-growth-agent/
├── backend/
│   ├── main.py                # FastAPI app entrypoint
│   ├── db.py                  # SQLite models + session
│   ├── models.py              # Pydantic schemas
│   ├── razorpay_client.py     # thin wrapper around Razorpay SDK
│   ├── brain/
│   │   └── gemini_agent.py    # calls Gemini, returns structured proposal
│   ├── cage/
│   │   └── policy_engine.py   # pure functions, no external calls, deterministic
│   ├── ledger/
│   │   └── ledger.py          # write/read ledger entries
│   ├── routes/
│   │   ├── checkout.py        # cart → upsell proposal → order creation
│   │   ├── webhook.py         # Razorpay payment status webhook
│   │   ├── campaign.py        # campaign orchestrator endpoints + scheduler
│   │   └── ledger.py          # GET endpoints for dashboard feed
│   └── seed_data.py           # fake product catalog + fake order history
└── frontend/
    └── src/
        ├── Storefront.jsx      # demo shop: cart, checkout button
        ├── Dashboard.jsx       # live ledger feed + campaign controls
        └── api.js
```

---

## 6. Data Model (SQLite)

```sql
products(id, name, price, category, discountable BOOLEAN)

orders(id, razorpay_order_id, razorpay_payment_id, cart_json,
       final_amount, status, created_at)

ledger(id, timestamp, actor, trigger, proposal_json, reasoning,
       policy_passed, policy_violation, final_action_json,
       razorpay_order_id, razorpay_payment_id, outcome)

campaigns(id, name, discount_pct, target_skus_json,
          starts_at, expires_at, status, created_by)
```

---

## 7. Core Code Sketches

### The Cage (build and unit-test this first)

```python
# cage/policy_engine.py
MAX_DISCOUNT_PCT = 20
AUTO_APPROVE_THRESHOLD_PCT = 15
DISCOUNTABLE_SKUS = {"SKU_101", "SKU_102"}
MAX_CAMPAIGN_HOURS = 48

def evaluate_upsell_proposal(proposal: dict) -> dict:
    pct = proposal["discount_pct"]
    skus = proposal["skus"]
    violations = []
    if pct > MAX_DISCOUNT_PCT:
        violations.append(f"discount {pct}% exceeds max {MAX_DISCOUNT_PCT}%")
        pct = MAX_DISCOUNT_PCT
    if not set(skus).issubset(DISCOUNTABLE_SKUS):
        violations.append("proposal includes non-discountable SKU")
        skus = [s for s in skus if s in DISCOUNTABLE_SKUS]

    needs_approval = pct > AUTO_APPROVE_THRESHOLD_PCT
    return {
        "passed": len(violations) == 0,
        "violations": violations,
        "final_action": {"discount_pct": pct, "skus": skus},
        "needs_human_approval": needs_approval,
    }
```

### The Brain

```python
# brain/gemini_agent.py
def propose_upsell(cart: list, catalog: list) -> dict:
    prompt = f"""Given this cart: {cart} and catalog: {catalog},
    suggest ONE bundle upsell. Respond ONLY as JSON:
    {{"discount_pct": int, "skus": [...], "reasoning": "..."}}"""
    response = gemini_model.generate_content(prompt)
    return json.loads(response.text)  # validate shape; fall back to "no upsell" on malformed output
```

### The Ledger

```python
# ledger/ledger.py
def log(actor, trigger, proposal, reasoning, policy_result,
        razorpay_ref=None, outcome="pending"):
    # single INSERT into ledger table with all fields above
    ...
```

### Razorpay Client

```python
# razorpay_client.py
import razorpay
client = razorpay.Client(auth=(KEY_ID, KEY_SECRET))

def create_order(amount_paise, notes):
    return client.order.create({
        "amount": amount_paise, "currency": "INR", "notes": notes
    })
```

Frontend uses Razorpay's Standard Checkout JS with the test key, which provides a mock bank page with Success/Failure buttons — this is the mechanism for the required "one failure handled gracefully" demo.

---

## 8. Demo Ledger Feed (target UX)

```
14:32:01 — Agent proposed 25% bundle discount (reason: high abandonment risk)
           → Policy capped to 20% → Order created (order_XXXX) → Payment captured ✅

14:35:44 — Agent proposed 30% flash campaign on Product A
           → Policy rejected (exceeds max discount) → No action taken ❌

14:41:12 — Agent proposed 22% discount → Exceeds auto-approve threshold
           → Awaiting merchant approval ⏳ → Merchant approved → Order created
           → Payment failed (test failure) → Agent reverted to standard price, no retry with discount
```

---

## 9. Build Order (Multi-Day Hackathon Plan)

**Day 1 — Plumbing only, no AI**
FastAPI + SQLite + Razorpay test checkout working end-to-end. Fake storefront, fake product catalog, order → checkout → payment captured, logged in a bare-bones ledger table. Get this rock solid before adding intelligence.

**Day 2 — The cage first, then the brain**
Write and unit-test `policy_engine.py` with hardcoded fake proposals (no Gemini yet). Once the cage is trusted, wire in Gemini and route its output through it.

**Day 3 — Campaign orchestrator + dashboard**
APScheduler job reviewing fake order history, proposing campaigns through the same brain → cage → ledger pipeline. Build the React dashboard reading the ledger table live.

**Day 4 — Failure injection + polish**
Deliberately trigger a Razorpay test failure mid-flow; confirm the ledger captures it and the agent reverts gracefully instead of erroring out. Rehearse the demo narrative around the ledger feed.

---

## 10. Judging Bar — Final Checklist

- [ ] Every money-affecting action has a stored `reasoning` string (explainable)
- [ ] Policy engine is deterministic, separate from the LLM, and demonstrably clamps at least one real proposal (bounded)
- [ ] At least one flow requires human approval before the payment is created (gated)
- [ ] Dashboard renders a live, readable ledger feed including rejected/capped proposals (audit trail)
- [ ] One deliberately triggered Razorpay test-mode failure is shown being handled without crashing or double-charging (graceful failure)
