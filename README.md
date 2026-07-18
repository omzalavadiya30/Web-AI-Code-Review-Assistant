# AI Code Review Assistant

Internship Project

## Tech Stack

- Next.js
- Express.js
- Supabase
- Google Gemini API
- ESLint

## AI Review Setup

The server can run Gemini-powered review explanations after static analysis. Add these to
`server/.env`:

```env
AI_REVIEW_PROVIDER=gemini
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.5-flash
```

Set `AI_REVIEW_PROVIDER=none` to keep only static analysis.

Project is under development.
