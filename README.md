# DrawLint.ai

> LeetCode for System Design — but visual and AI-driven.

Draw system architecture diagrams and get instant AI-powered feedback on scalability, bottlenecks, single points of failure, and best practices.

## Features (MVP)

- ✏️ **Draw** — Excalidraw-powered canvas for system design diagrams
- 🤖 **Analyze** — AI reviews your architecture via Azure OpenAI
- 📊 **Feedback** — Structured results: score, issues, suggestions, follow-up questions
- 🔑 **BYO Key** — Use your own Azure OpenAI credentials for unlimited analyses
- 💾 **Auto-save** — Diagrams persist in localStorage

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Excalidraw** — diagram canvas
- **Azure OpenAI** — AI analysis engine
- **shadcn/ui + Tailwind CSS** — UI components

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Azure OpenAI credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AZURE_OPENAI_API_KEY` | Platform API key (for free trial) |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT` | Model deployment name (e.g., gpt-4o) |
| `AZURE_OPENAI_API_VERSION` | API version (default: 2024-02-01) |

Users can also configure their own Azure OpenAI key via the Settings modal (BYO key).

## License

Private — not yet licensed.
