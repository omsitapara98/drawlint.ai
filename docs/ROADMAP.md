# DrawLint.ai — Product Roadmap

> MVP is shipped. This document covers the Alpha, Beta, and GA roadmap.

---

## 🟢 MVP (Private) — ✅ Complete

| Feature | Status |
|---------|--------|
| Excalidraw canvas with auto-save | ✅ |
| Diagram serializer (shapes → structured JSON) | ✅ |
| Azure OpenAI AI analysis engine | ✅ |
| Feedback panel (score, issues, suggestions, follow-ups) | ✅ |
| BYO Azure OpenAI key support | ✅ |
| Free trial rate limiting (5/month via localStorage) | ✅ |
| Settings modal | ✅ |
| Split-pane responsive layout | ✅ |
| Landing hero component | ✅ |

---

## 🔵 Alpha — Authentication, Persistence & Multi-Provider AI — ✅ Complete

**Goal:** Users can sign in, save their work, track usage server-side, and choose their AI provider.

### Shipped Features

| Feature | Status |
|---------|--------|
| **Auth (NextAuth.js v5)** — GitHub + Google OAuth | ✅ |
| **MongoDB (Cosmos DB)** — users, designs, reviews, topics | ✅ |
| **Azure Blob Storage** — design element persistence | ✅ |
| **Email Verification** — Gmail SMTP with verification links | ✅ |
| **Community Library** — browse, filter, fork designs by topic | ✅ |
| **Draft System** — auto-save drafts, continue editing | ✅ |
| **Server-side Quota** — 10 managed reviews/month with atomic reservation | ✅ |
| **Multi-Reviewer AI** — 5 parallel section reviewers + Lead Reviewer | ✅ |
| **4 Review Levels** — Mid, Senior, Staff, Deep | ✅ |
| **Anonymous Mode** — post designs with pseudonym | ✅ |
| **Multi-Provider AI** — DrawLint AI + Gemini + Azure OpenAI + Azure AI Foundry | ✅ |
| **Provider Abstraction Layer** — unified interface, factory pattern, per-provider optimizations | ✅ |
| **Gemini AI (Free)** — REST API integration, capped concurrency, stricter JSON prompts | ✅ |
| **Azure AI Foundry** — Responses API support for newer models (GPT-5.4 Pro) | ✅ |
| **Test Connection** — verify credentials before saving | ✅ |
| **Provider Badges** — library cards show which AI reviewed each design | ✅ |
| **3-Card Settings UI** — DrawLint AI / Gemini AI / Azure OpenAI with quality indicators | ✅ |
| **Client-Side Key Migration** — versioned localStorage schema with auto-migration | ✅ |
| **AI Setup Guide** — step-by-step for Gemini (~30s) and Azure (~10-15 min) | ✅ |
| **Pro Plan Teaser** — coming soon card in settings | ✅ |
| **Respond to Feedback** — address warnings verbally with AI evaluation | ✅ |
| **Re-evaluate Signal** — Lead Reviewer re-assesses after responses | ✅ |
| **Follow-up Q&A** — answer AI-generated probing questions | ✅ |
| **Share Design Link** — copy link to share design + review | ✅ |
| **SEO + OG Image** — meta tags, OpenGraph, Twitter cards | ✅ |
| **Welcome Email** — onboarding email for new users | ✅ |
| **Premium Badges** — 👑 for premium/admin users in library + header | ✅ |
| **Collapse/Expand All** — toggle all review sections at once | ✅ |
| **Login Rate Limiting** — 5 attempts per 15 min per email | ✅ |
| **AI Disclaimer** — "AI-generated · Use your own judgment" | ✅ |

---

## 🟡 Beta — Scoring, Billing & Community

**Goal:** A polished experience with monetization and deeper AI interaction.

### Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Pro tier (Stripe)** | More reviews, deeper evaluation, priority processing — pricing TBD | P0 |
| **Usage analytics** | Track reviews per provider, quality metrics, trends | P0 |
| **Test Review button** | Try a review without submitting to library | P1 |
| **Error tracking** | Sentry integration for production monitoring | P1 |
| **Follow-up conversation** | Ask follow-up questions about your review (chat-style) | P1 |
| **Diagram templates** | Pre-built templates: URL shortener, chat system, e-commerce, etc. | P1 |
| **Sharing** | Share diagram + review via public link | P1 |
| **Export** | Export review as PDF/Markdown | P2 |
| **Multi-model selection** | Choose model within a provider (e.g. GPT-4o vs GPT-5.4) | P2 |
| **Review modes** | Fast vs Deep review within same provider | P2 |

### AI Improvements

| Feature | Description | Priority |
|---------|-------------|----------|
| **Score calibration** | Normalize scores across providers for fair comparison | P1 |
| **Confidence scores** | How confident the AI is in each finding | P2 |
| **Component-specific feedback** | Click a node → get focused feedback | P2 |
| **OpenRouter support** | Additional provider if demand exists | P2 |

---

## 🔴 GA — Polish & Enterprise

**Goal:** Production-ready product with enterprise features.

### Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Billing portal** | Usage graphs, plan management, invoices | P0 |
| **SEO & marketing pages** | Pricing page, feature pages, comparison pages | P1 |
| **Community challenges** | Weekly system design challenges with leaderboards | P1 |
| **Team/org support** | Shared diagrams within a team | P2 |
| **API access** | Public API for programmatic diagram analysis | P2 |
| **Custom rubrics** | Define your own scoring criteria | P2 |
| **SSO / Enterprise** | SAML/OIDC for enterprise customers | P3 |
| **Self-hosted option** | Docker image for on-prem deployment | P3 |

---

## Release Criteria

| Phase | Criteria |
|-------|----------|
| **Alpha** | ✅ Auth works, diagrams persist, rate limits enforced, multi-provider AI, 0 data loss |
| **Beta** | Billing works, templates available, <3s analysis response time |
| **GA** | 99.9% uptime, <500ms p95 page load, error monitoring active |

---

## Timeline Philosophy

No fixed dates — ship when quality gates are met. Each phase is released when all P0 features are complete and tested.

---

*Last updated: 2026-04-24*
