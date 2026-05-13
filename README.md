# Differentiator

**Differentiator** is a system that tries its best to tell the differences between
two files — **visually** and **textually** — and gives you back a clean,
copyable report.

You hand it a **MAIN** file (the reference / source of truth) and a **SAMPLE**
file (the candidate). It looks at them like a human reviewer would: layout,
spacing, colors, typography, imagery, every word, every number, every page.
Whatever has changed, it will try to find and describe.

Supports **PDFs and images** (PNG / JPEG / WEBP / HEIC). Powered by Google
Gemini's vision-capable models, with the model picker exposed so you can switch
between Gemini 3 Pro, 2.5 Flash, 2.5 Pro, etc.

## What you get

- A drag-and-drop comparison page with MAIN + SAMPLE uploaders.
- An exhaustive difference report — one line per finding — broken down by
  category (Layout, Typography, Color, Text, Image, Table, Chart, etc.),
  concrete location, and impact (low / medium / high).
- **Copy** any individual difference, **Copy all**, or **Download .md**.
- Three views of the same report: parsed List, Rendered Markdown, Raw.
- Settings as a **dialog** (not a separate page) — paste a Gemini key, **Test**
  it live, pick a preset model or paste a custom model ID.
- Friendly error UI: rate-limit messages explain *why* and offer a one-click
  retry / model switch / "copy error" so you can share it.

Your API key never leaves your browser except to call your own Next.js backend.
Files are not persisted server-side.

## Local development

```bash
npm install
npm run dev
# http://localhost:3000
```

Open the **Settings** dialog from the header, paste your Gemini API key
([get one from Google AI Studio](https://aistudio.google.com/app/apikey)),
press **Test**, save, and start comparing.

## Production build

```bash
npm run build
npm start
```

## Docker

The repo ships a multi-stage `Dockerfile` (Next.js `standalone` output) and a
`docker-compose.yml`:

```bash
docker compose up -d --build
# http://localhost:3000
```

Customize the port with `PORT=4000 docker compose up`.

## Stack

- Next.js 16 (App Router, Turbopack, route handlers for backend)
- React 19
- shadcn/ui + Tailwind v4 (dark theme by default)
- Montserrat / JetBrains Mono via `next/font/google`
- `@google/generative-ai`, `react-markdown`, `sonner`, `lucide-react`

## Notes

- Max file size per upload: **20 MB**.
- Server response timeout: 5 minutes (large PDFs take longer).
- Gemini's free tier is generous on `gemini-2.5-flash` but extremely limited
  on `gemini-2.5-pro` and the `gemini-3-*-preview` models — enable billing on
  your Google AI Studio project if you hit 429s on those.
