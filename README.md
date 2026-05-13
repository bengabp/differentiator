# Differentiator

A web tool that takes two files (PDF or image) and produces an exhaustive, copyable
report of every visual and textual difference between them, powered by Google
Gemini's vision-capable models.

- **MAIN** is the reference file.
- **SAMPLE** is the candidate, compared against MAIN.

Built with Next.js (App Router) and shadcn/ui in a dark, minimalistic theme.

## Features

- Drag-and-drop upload for PDFs and images (PNG / JPEG / WEBP / HEIC).
- Side-by-side comparison with a structured difference list (category, location, impact).
- Copy any single difference or the whole report; download as Markdown.
- Settings page to add and **test** your Gemini API key, and pick a model
  (`gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`).
- API key is stored only in your browser's `localStorage`.
- Rendered, list, and raw-markdown views of the report.
- Loading skeletons, progress stages, and toast feedback throughout.

## Local development

```bash
npm install
npm run dev
# http://localhost:3000
```

Open Settings (`/settings`), paste your Gemini API key (get one from
[Google AI Studio](https://aistudio.google.com/app/apikey)), hit **Test**, then
return to **Compare**.

## Production build

```bash
npm run build
npm start
```

## Docker

The repo ships a multi-stage `Dockerfile` (Next.js `standalone` output) and a
`docker-compose.yml`.

```bash
docker compose up --build
# http://localhost:3000
```

Customize the port with `PORT=4000 docker compose up`.

## Stack

- Next.js 16 (App Router, Turbopack, route handlers for backend)
- React 19
- shadcn/ui + Tailwind v4
- `@google/generative-ai`
- `react-markdown`, `sonner`, `lucide-react`

## Notes

- Files are sent to your own Next.js backend, which forwards them to Gemini
  with your API key. Nothing is persisted server-side.
- Max file size per upload: **20 MB**.
- Server response timeout: 5 minutes (large PDFs).
