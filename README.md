# DrawLint.ai

> LeetCode for System Design — but visual and AI-driven.

AI-powered system design review platform. Draw your architecture, get expert-level feedback on scalability, reliability, and best practices.

**Live:** https://drawlint-ai.in

---

## 🎯 How It Works

1. **Draw** — Use the Excalidraw whiteboard with structured sections (FR, Assumptions, NFRs, Entities, Capacity, API Routes, HLD)
2. **Submit** — Choose your review level and submit to the community library
3. **Review** — Get feedback from 6 AI reviewers (5 section specialists + 1 Lead Reviewer) with hire signals

## ✨ Features

### AI Review Engine
- 🤖 **Multi-Reviewer Pipeline** — 5 parallel section reviewers (NFR, Entities, Capacity, API, HLD) + Lead Reviewer synthesis
- 📈 **4 Review Levels** — Mid (L4-L5), Senior (L5-L6), Staff (L6+), Deep Analysis
- ✅ **Highlights + Issues** — Strengths (strong/good) and issues (critical/warning/info)
- 🎓 **Hire Signal** — Lead Reviewer assessment (strong-hire → no-hire)
- 💬 **Respond to Feedback** — Address warnings verbally, like in a real interview
- 🔄 **Re-evaluate Signal** — AI re-assesses hire signal after your responses
- ❓ **Follow-up Questions** — Answer AI-generated probing questions with AI evaluation

### Weekly Challenge
- 🔥 **Weekly System Design Challenge** — New problem every Monday, practice all week
- 🏆 **Leaderboard** — Ranked by hire signal + submission time
- 📊 **Streak Tracking** — Track consecutive weeks of practice
- 🎯 **Pre-filled Requirements** — FR and scale expectations auto-filled from topic data
- 🔒 **One-shot Submission** — Submit once, no re-evaluations — mirrors real interview pressure
- 🆓 **Free for Everyone** — Separate from monthly quota, no credits needed

### AI Providers
- ⭐ **DrawLint AI** — Managed, best quality, 10 free reviews/month
- 💡 **Gemini AI** — Free, unlimited with your own Google API key (~30 sec setup)
- ⚙️ **Azure OpenAI** — BYO key with full control, supports Azure OpenAI + Azure AI Foundry
- 🔌 **Provider Abstraction** — Unified interface, per-provider optimizations, automatic retry on malformed JSON

### Platform
- 🎨 **Excalidraw Canvas** — Structured whiteboard template with locked sections
- 📚 **Community Library** — 51 enriched topics with difficulty, requirements, scale, and hints
- 🏷️ **Official + Community Topics** — Curated problems with difficulty badges (Easy/Medium/Hard)
- 💾 **Draft System** — Auto-save drafts, continue editing anytime
- 🔗 **Share Designs** — Copy link to share your design + review with anyone
- 🔒 **Auth** — GitHub + Google OAuth via NextAuth.js v5
- 👤 **Anonymous Mode** — Post designs with a pseudonym
- 👑 **Premium Badges** — Premium users highlighted in the library
- 🌙 **Dark Mode** — Full theme support
- 🎛️ **Resizable Panels** — Adjust workspace layout

## 🏗️ Architecture

```
User Input → Core Evaluation Prompt → Provider Adapter → LLM Call → Output Normalizer → Final Review
```

- **4-Pass Graph Parser** — Nodes → Edges → Annotations → Clusters
- **Provider Abstraction Layer** — DrawLint (managed) / Gemini / Azure with unified `generate()` interface
- **Concurrency Control** — Parallel reviewers for Azure, capped concurrency for Gemini (free tier rate limits)
- **Output Normalization** — JSON schema validation, retry on malformed output, default fallbacks

## 🛣️ Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/canvas` | Interactive whiteboard + AI review engine |
| `/canvas?view={id}` | View a submitted design |
| `/canvas?edit={id}` | Edit your design |
| `/library` | Community design library |
| `/library/{slug}` | Designs for a specific topic |
| `/guide` | Drawing guide & best practices |
| `/guide/byo-keys` | AI provider setup guide |
| `/support` | FAQ & support |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, TypeScript) |
| **Canvas** | Excalidraw 0.18 |
| **AI** | Azure OpenAI, Google Gemini, Azure AI Foundry |
| **Auth** | NextAuth.js v5 (GitHub + Google OAuth) |
| **Database** | MongoDB (Azure Cosmos DB) |
| **Storage** | Azure Blob Storage |
| **UI** | shadcn/ui + Tailwind CSS v4 + Framer Motion |
| **Deployment** | Docker + Azure App Service |
| **CI/CD** | GitHub Actions |

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- MongoDB instance (or Azure Cosmos DB)
- Azure Blob Storage account

### Development

```bash
# Clone the repo
git clone https://github.com/omsitapara98/drawlint.ai.git
cd drawlint.ai

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in your values (see Configuration below)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Configuration

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_OPENAI_API_KEY` | For managed AI | Platform Azure OpenAI key |
| `AZURE_OPENAI_ENDPOINT` | For managed AI | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT` | For managed AI | Model deployment name |
| `AUTH_SECRET` | ✅ | NextAuth.js secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID/SECRET` | ✅ | Google OAuth credentials |
| `AUTH_GITHUB_ID/SECRET` | ✅ | GitHub OAuth credentials |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `GMAIL_USER` | ✅ | Gmail for email verification |
| `GMAIL_APP_PASSWORD` | ✅ | Gmail app password (2FA required) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL (e.g. `http://localhost:3000`) |

> **Note:** Gemini and Azure BYO keys are provided by users via the Settings UI — no server-side config needed.

### Production

```bash
# Build
npm run build

# Docker
docker build -t drawlint-ai .
docker run -p 3000:3000 --env-file .env.local drawlint-ai
```

Deployed via GitHub Actions → Docker → Azure App Service.

## 🔐 Security

- **API keys are never stored server-side** — user credentials (Gemini/Azure) live in browser localStorage only
- **Keys transit over HTTPS** — sent to our server only during review, immediately discarded from memory
- **No logging of credentials** — API keys are never written to logs or databases
- **Open source** — verify the key handling yourself in `src/lib/ai/providers/`

## 💰 Pricing

| Tier | AI Provider | Reviews | Cost |
|------|-------------|---------|------|
| **Free** | DrawLint AI | 10/month | $0 |
| **Pro** | DrawLint AI | More reviews + deeper evaluation | *Coming soon* |
| **BYO Gemini** | Your Gemini key | Unlimited | Free (your API usage) |
| **BYO Azure** | Your Azure key | Unlimited | Your Azure costs |

## 🗺️ Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full product roadmap.

### Recently Shipped
- ✅ Multi-provider AI (DrawLint AI + Gemini + Azure OpenAI + Azure AI Foundry)
- ✅ Test Connection button in Settings
- ✅ Provider badges in library (shows which AI reviewed each design)
- ✅ Pro plan teaser

### Coming Next
- 🔜 Pro tier with Stripe billing
- 🔜 Usage analytics dashboard
- 🔜 Multi-model selection within providers

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run checks: `npm run lint && npx tsc --noEmit`
5. Commit with a descriptive message
6. Open a Pull Request

### Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── (protected)/        # Auth-gated pages (canvas, library, guide)
│   └── api/                # API routes (analyze, designs, user, topics)
├── components/             # React components
│   ├── canvas/             # Whiteboard & submit dialog
│   ├── feedback/           # AI review panel
│   ├── library/            # Design library grid & cards
│   ├── settings/           # AI settings modal
│   └── ui/                 # shadcn/ui primitives
├── hooks/                  # Custom React hooks
├── lib/
│   ├── ai/                 # AI engine
│   │   ├── providers/      # Provider abstraction (Azure, Gemini, DrawLint)
│   │   ├── prompts.ts      # Review criteria & prompt templates
│   │   └── azure-openai.ts # analyzeDesign() orchestrator
│   ├── db/                 # MongoDB data access (users, designs, reviews)
│   ├── diagram/            # 4-pass graph parser
│   └── storage/            # Client-side config & rate limiting
└── types/                  # TypeScript type definitions
```

## 📄 License

MIT
