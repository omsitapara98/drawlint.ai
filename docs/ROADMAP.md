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

## 🔵 Alpha — Authentication & Persistence

**Goal:** Users can sign in, save their work, and track usage server-side.

### Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Auth (NextAuth.js)** | GitHub + Google OAuth login | P0 |
| **Database (PostgreSQL)** | Neon or Supabase, schema via Prisma ORM | P0 |
| **User model** | id, email, name, avatar, plan (free/pro), createdAt | P0 |
| **Diagram persistence** | Save/load diagrams to DB (replace localStorage) | P0 |
| **Diagram history** | List of saved diagrams per user, with timestamps | P1 |
| **Server-side rate limiting** | 5 analyses/month tracked in DB (not localStorage) | P0 |
| **Analysis history** | Store past analysis results linked to diagrams | P1 |
| **User dashboard** | View saved diagrams, past analyses, usage stats | P1 |
| **Diagram naming** | Users can name/rename their diagrams | P2 |
| **Delete diagrams** | Users can delete saved diagrams | P2 |
| **Middleware auth guard** | Protect API routes and dashboard pages | P0 |

### Technical Decisions to Make

- [ ] Database provider: Neon vs Supabase vs PlanetScale
- [ ] ORM: Prisma vs Drizzle
- [ ] Session strategy: JWT vs database sessions
- [ ] Migration strategy: localStorage → DB for existing users

### Schema (Draft)

```
User: id, email, name, avatar, plan, createdAt, updatedAt
Diagram: id, userId, name, elements (JSON), createdAt, updatedAt
Analysis: id, diagramId, userId, feedback (JSON), score, createdAt
UsageRecord: id, userId, month, analysisCount
```

---

## 🟡 Beta — Scoring, Sharing & Templates

**Goal:** A polished experience with community features and deeper AI interaction.

### Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Scoring system v2** | Weighted scoring with category breakdowns (scalability, reliability, performance) | P0 |
| **Follow-up conversation** | Users can ask follow-up questions about their analysis (chat-style) | P0 |
| **Diagram templates** | Pre-built templates: URL shortener, chat system, e-commerce, social feed, etc. | P1 |
| **Template browser** | Browse/search/filter templates by category | P1 |
| **Sharing** | Share diagram + analysis via public link (read-only) | P1 |
| **Prompt library** | Curated analysis prompts for different system types (distributed, real-time, batch) | P1 |
| **Export** | Export diagram as PNG/SVG, export analysis as PDF/Markdown | P2 |
| **Comparison view** | Compare two analyses side-by-side (before/after improvements) | P2 |
| **Dark mode** | Full dark mode support (canvas + UI) | P2 |
| **Keyboard shortcuts** | Analyze (Ctrl+Enter), Save (Ctrl+S), New (Ctrl+N) | P2 |
| **Mobile improvements** | Better responsive layout, touch support for canvas | P2 |
| **Analytics** | Track feature usage, popular templates, avg scores | P2 |
| **Error monitoring** | Sentry or similar for production error tracking | P2 |

### AI Improvements

| Feature | Description | Priority |
|---------|-------------|----------|
| **Multi-turn analysis** | Context-aware follow-up: "What if I add a cache here?" | P0 |
| **Component-specific feedback** | Click a node → get focused feedback on that component | P1 |
| **Improvement suggestions overlay** | AI suggests changes visually on the canvas (ghost nodes) | P2 |
| **Multiple AI providers** | Support OpenAI (non-Azure), Anthropic Claude, Gemini | P2 |

---

## 🔴 GA — Polish, Billing & Community

**Goal:** Production-ready product with monetization and community engagement.

### Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Billing (Stripe)** | Free tier (5/month) → Pro tier (unlimited, $9/month) | P0 |
| **Usage dashboard** | Billing portal, usage graphs, plan management | P0 |
| **SEO & marketing pages** | Landing page, pricing page, feature pages | P1 |
| **Blog / content** | System design tips, example walkthroughs | P1 |
| **Community challenges** | Weekly system design challenges with leaderboards | P1 |
| **Team/org support** | Shared diagrams within a team | P2 |
| **Custom rubrics** | Let users define their own scoring criteria | P2 |
| **API access** | Public API for programmatic diagram analysis | P2 |
| **Plugin system** | Custom diagram components (AWS, GCP, Azure icons) | P2 |
| **SSO / Enterprise** | SAML/OIDC for enterprise customers | P3 |
| **Self-hosted option** | Docker image for on-prem deployment | P3 |

---

## Release Criteria

| Phase | Criteria |
|-------|----------|
| **Alpha** | Auth works, diagrams persist, rate limits enforced server-side, 0 data loss scenarios |
| **Beta** | Templates available, sharing works, follow-up chat works, <3s analysis response time |
| **GA** | Billing works, 99.9% uptime, <500ms p95 page load, error monitoring active |

---

## Timeline Philosophy

No fixed dates — ship when quality gates are met. Each phase is released when all P0 features are complete and tested. P1/P2 features can ship incrementally within a phase.

---

*Last updated: 2026-04-22*
