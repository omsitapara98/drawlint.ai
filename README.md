# DrawLint.ai

> LeetCode for System Design — but visual and AI-driven.

AI-powered system design review platform. Draw your architecture, get expert-level feedback on scalability, reliability, and best practices.

**Live:** https://drawlint-ai.azurewebsites.net

## 🎯 How It Works

1. **Draw** — Use the Excalidraw whiteboard with structured sections (Functional Requirements, Assumptions, NFRs, Entities, Capacity, API Routes, HLD)
2. **Analyze** — Click the Analyze button to trigger multi-call AI review
3. **Review** — Get expert feedback from 5 specialized reviewers + 1 Lead Reviewer with hire signals

## ✨ Features (Alpha)

- 🎨 **Excalidraw Canvas** — Structured template with locked sections for consistent system design documentation
- 🤖 **Multi-Call AI Review** — 5 parallel section reviewers (NFR, Entities, Capacity, API, HLD) + Lead Reviewer
- 📈 **4 Review Levels** — Mid (L4-L5), Senior (L5-L6), Staff (L6+), Deep Analysis
- ✅ **Positive & Critical Feedback** — Highlights strengths + identifies issues (critical/warning/info)
- 🎓 **Hire Signal** — Lead Reviewer assessment (strong-hire → no-hire)
- 🔐 **BYO Azure OpenAI Key** — Bring your own credentials, stored in browser localStorage (never sent to our servers)
- 💾 **Cached Results** — Re-analyze button for quick re-review
- 🎛️ **Resizable Feedback Panel** — Adjust workspace layout on demand
- 🌙 **Dark Mode** — Full theme support
- 📱 **Auto-save** — Diagrams persist in localStorage

## 🏗️ Architecture

- **4-Pass Graph Parser** — Nodes → Edges → Annotations → Clusters for comprehensive diagram analysis
- **Isolated Section Reviews** — Each reviewer receives only its section data for focused analysis
- **Structured Input Template** — Locked sections enforce consistent system design documentation

## 🛣️ Pages

- **`/`** — Landing page
- **`/canvas`** — Interactive whiteboard + AI review engine
- **`/guide`** — Drawing guide & best practices

## 🛠️ Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Excalidraw 0.18** — diagram canvas
- **Azure OpenAI** — AI analysis engine (BYO key)
- **shadcn/ui + Tailwind CSS v4** — UI components
- **Docker + Azure App Service** — deployment
- **GitHub Actions** — CI/CD (manual trigger)

## 🚀 Getting Started

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production

The app is deployed on Azure App Service via GitHub Actions. Deploy by pushing to main or manually triggering the workflow.

### Configuration

All Azure OpenAI credentials are configured via the **Settings** modal in the app (no `.env.local` needed). Your keys are stored securely in browser localStorage and never sent to our servers.

## 📄 License

MIT
