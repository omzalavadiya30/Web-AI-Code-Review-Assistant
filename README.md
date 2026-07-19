# AI Code Review Assistant

Internship Project

## Tech Stack

- Next.js
- Express.js
- Supabase
- Google Gemini API
- ESLint

## Static Quality Signals

Reviews include dependency-free complexity and code-smell checks for submitted
sources. JavaScript, TypeScript, and Python submissions report cyclomatic
complexity, long functions, nesting depth, large parameter lists, duplicate
blocks, TODO-style markers, long lines, and oversized files.

## Documentation Generation

Each submitted source also gets structured documentation stored in source
metadata. The app detects functions, classes, and common API endpoint patterns,
then displays generated signatures, descriptions, parameters, return values, and
line numbers in review results and history.

## AI Review Setup

The server can run Gemini-powered review explanations after static analysis. Add these to
`server/.env`:

```env
AI_REVIEW_PROVIDER=gemini
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.5-flash
```

Set `AI_REVIEW_PROVIDER=none` to keep only static analysis.

## Password Reset Email Setup

Forgot-password emails are sent with Resend. Add these to `server/.env`:

```env
CLIENT_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=CodeReview AI <onboarding@resend.dev>
```

Use a verified Resend sender/domain for production.

Project is under development.
