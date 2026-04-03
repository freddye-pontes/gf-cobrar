# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This project is in the **design phase** — no application code exists yet. The codebase contains design specifications and tooling for the brainstorming process.

## Key Design Documents

- [prd.md](prd.md) — Business requirements (debtor roster data points, scope definition)
- [docs/superpowers/specs/2026-03-31-sistema-cobranca-design.md](docs/superpowers/specs/2026-03-31-sistema-cobranca-design.md) — Complete technical design specification (read this first)

## What This System Does

**GF Cobrar** is a multi-tenant B2B debt collection platform for a collection agency managing debt portfolios on behalf of multiple creditors. Core concerns:

1. **Carteira de Devedores** — Debtor/debt repository with enrichment (Serasa/SPC credit scores, contact info)
2. **Régua de Cobrança** — Time-based automated contact workflow (Day 0 import → Day 1 WhatsApp → Day 3 WhatsApp+Email → Day 7 call → Day 30+ legal), with adaptive branching on debtor response
3. **Multicanal** — WhatsApp via Evolution API (self-hosted), Email via SMTP/SendGrid, phone call queue
4. **Negociação** — Offers, installment plans, discounts (capped per creditor), PTP (Promise to Pay) tracking
5. **Gestão de Credores & Repasses** — Commission calculation, batched PIX transfers, creditor read-only portal
6. **Dashboard Operacional** — Operator KPIs, prioritized work queue, quick filters

## Decided Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python + FastAPI |
| Database | PostgreSQL |
| Frontend | Next.js (React + SSR) |
| WhatsApp | Evolution API (self-hosted) |
| Email | SMTP / SendGrid |
| Payments | PIX via banking APIs |
| Enrichment | Serasa / SPC APIs |

## MVP Scope

**In MVP:** CSV import, semi-automatic WhatsApp, operational dashboard, negotiation module, manual commission calculation.

**Post-MVP:** Full workflow automation, chatbot, API creditor integrations, automatic enrichment, automatic PIX transfers.

## Critical Business Rules

- One debtor may have multiple debts with different creditors (debts are creditor-scoped)
- Collection workflow pauses automatically when an active PTP exists
- Discounts are capped by per-creditor-defined limits
- Only confirmed payments (not promises) trigger creditor transfer calculations
- Creditor portal is read-only — no creditor can modify collection rules
- LGPD compliance required; role-based access (operator vs. creditor portal vs. admin)

## Brainstorm Visual Server

The `.claude/skills/brainstorm/` tooling supports interactive HTML mockups during design sessions. To start the visual companion server:

```bash
bash ".claude/skills/brainstorm/scripts/start-server.sh" --project-dir "$(pwd)"
```

Generated mockups land in `.superpowers/brainstorm/*/content/` and the server injects WebSocket-based interaction tracking. Existing session mockups are in [.superpowers/brainstorm/1626-1774981405/content/](.superpowers/brainstorm/1626-1774981405/content/).
