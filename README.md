# AI Code Review Assistant

An AI-powered web application designed to help developers analyze source code, detect potential issues, measure code quality, identify code smells, generate documentation, and receive AI-assisted recommendations for improving their code.

This project was developed as an internship project and combines traditional static code analysis with AI-assisted code review using Google Gemini.

---

## 🌐 Live Application

### Frontend

https://web-ai-code-review-assistant.vercel.app/

### Backend API

https://web-ai-code-review-assistant.onrender.com

### API Base URL

https://web-ai-code-review-assistant.onrender.com/api

---

## 📌 Project Overview

The AI Code Review Assistant provides developers with an automated platform for reviewing source code.

Users can submit code snippets or upload multiple source files. The application analyzes the submitted code using static analysis, complexity analysis, code-smell detection, and Google Gemini AI.

The system generates structured findings with severity levels, explanations, suggested fixes, overall review scores, and generated documentation.

---

## ✨ Features

### 🔐 Authentication

- User registration
- User login
- JWT-based authentication
- Protected routes
- User profile management
- Change password
- Forgot password
- Password reset through email

---

### 💻 Code Submission

Users can submit source code using:

- Code snippets
- Multiple source file uploads

The application supports text-based source files for languages including:

- JavaScript
- TypeScript
- Python
- Java
- Go
- C
- C++
- C#
- PHP
- Ruby
- Rust
- HTML
- CSS
- SQL
- JSON
- YAML

---

### 🔍 Static Code Analysis

The application performs automated static analysis on submitted source code.

Static analysis provides:

- Code quality findings
- Potential bugs
- Severity classification
- Issue explanations
- Suggested fixes

JavaScript and TypeScript source code can be analyzed using ESLint-based static analysis.

---

### 🤖 AI-Powered Code Review

Google Gemini is integrated into the review pipeline to provide AI-assisted code analysis.

The AI review can provide:

- Human-readable code review summaries
- Bug explanations
- Security observations
- Performance recommendations
- Maintainability suggestions
- Best-practice recommendations
- Suggested fixes
- Additional code findings grounded in submitted source code

The application combines static-analysis findings with Gemini-generated insights.

---

### 📊 Complexity Analysis

The application analyzes source code complexity.

Quality signals include:

- Cyclomatic complexity
- Complex functions
- Deep nesting
- Large parameter lists
- Long functions

These metrics help developers identify code that may be difficult to understand, test, and maintain.

---

### 🧹 Code Smell Detection

The application identifies common code smells, including:

- Long functions
- Deep nesting
- Large parameter lists
- Duplicate code blocks
- TODO-style markers
- Long lines
- Oversized files

Code-smell findings are included in the overall code review.

---

### 📝 Documentation Generation

The application automatically generates structured documentation from submitted source code.

It can detect and document:

- Functions
- Classes
- API endpoints
- Function signatures
- Parameters
- Return information
- Source line numbers

Generated documentation is stored with review source metadata and can be displayed in review results.

---

### 📚 Review History

Users can access their previous code reviews.

Review history includes:

- Review title
- Review type
- Programming language
- File information
- Branch information
- Review status
- Overall score
- Static-analysis findings
- AI-assisted findings
- Severity information
- Explanations
- Suggested fixes
- Review summary

---

### 🔎 Search and Filtering

Users can search and filter their review history.

Available functionality includes:

- Search by review title
- Search by programming language
- Search by branch
- Search through findings
- Filter by review status

---

### 📈 Review Dashboard

The review dashboard provides quality information such as:

- Total reviews
- Completed reviews
- Total findings
- High-risk findings
- Average review score
- Total analyzed sources
- Total analyzed lines
- Severity distribution
- Analyzer coverage
- Highest-risk reviews
- Recent findings

---

### 🛡️ Validation and Error Handling

The application includes frontend and backend validation and centralized error handling.

Features include:

- Request validation
- Authentication validation
- Project validation
- Review validation
- File upload limits
- Source code size limits
- Malformed JSON handling
- Payload size handling
- Database conflict handling
- Global Express error middleware
- Standardized API responses
- Frontend API error handling
- Network error handling

---

## 🛠️ Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React

### Backend

- Node.js
- Express.js
- JavaScript
- Express Validator

### Database

- Supabase
- PostgreSQL

### Artificial Intelligence

- Google Gemini API

### Static Analysis

- ESLint
- Custom Complexity Analysis
- Custom Code-Smell Detection

### Email Service

- Resend

### Testing

- Node.js Built-in Test Runner

### Deployment

- Vercel — Frontend
- Render — Backend

---

## 🏗️ System Architecture

User
  |
  v
Next.js Frontend
(Vercel)
  |
  | REST API
  v
Express.js Backend
(Render)
  |
  +-----------------------+
  |           |           |
  v           v           v
Supabase    Gemini       Resend
Database    AI API       Email Service
  |
  v
Review Data

Review Processing Pipeline:

Code Submission
      |
      v
Static Analysis
      |
      v
Complexity Analysis
      |
      v
Code Smell Detection
      |
      v
AI-Assisted Review
      |
      v
Documentation Generation
      |
      v
Review Score & Findings
      |
      v
Supabase Database

---

## 📁 Project Structure

Web-AI-Code-Review-Assistant/
│
├── client/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── next.config.ts
│
├── server/
│   ├── database/
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validations/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── test/
│   └── package.json
│
├── .gitignore
└── README.md

---

## ⚙️ Environment Variables

### Backend

Create:

server/.env

Add:

```env
PORT=5000
NODE_ENV=development

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

AI_REVIEW_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_gemini_model

CLIENT_URL=http://localhost:3000

RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_verified_sender
```

### Frontend

Create:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Never commit environment files or API keys to GitHub.

---

## 🚀 Local Installation

### 1. Clone Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Enter the project:

```bash
cd Web-AI-Code-Review-Assistant
```

### 2. Start Backend

```bash
cd server
npm install
npm run dev
```

Backend:

http://localhost:5000

### 3. Start Frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Frontend:

http://localhost:3000

---

## 🧪 Testing

The backend uses the Node.js built-in test runner.

Run tests with:

```bash
cd server
npm test
```

Automated testing covers:

- Standard API success responses
- Global API error handling
- 404 route handling
- Malformed JSON handling
- Unexpected server errors
- Authentication validation
- Password validation
- Project validation
- Review validation
- Upload-size validation
- Static analysis
- Code-smell detection

Latest verified test result:

- 14 tests
- 14 passed
- 0 failed

---

## 🚀 Production Deployment

### Frontend — Vercel

Root Directory:

client

Production environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
```

Live application:

https://your-frontend-url.vercel.app/

### Backend — Render

Root Directory:

server

Build Command:

```bash
npm install
```

Start Command:

```bash
npm start
```

Live backend:

https://your-backend-url.onrender.com

---

## 🔒 Security

The application implements several security practices:

- JWT-based authentication
- Password hashing
- Protected API routes
- Helmet security headers
- CORS configuration
- Backend request validation
- Input-size restrictions
- Centralized error handling
- Generic production server errors
- Environment variables for secrets

Sensitive credentials and API keys must never be committed to GitHub.

---

## 🔮 Future Improvements

Future versions could include:

- GitHub repository integration
- GitHub OAuth
- Pull request code reviews
- Repository-level analysis
- Side-by-side code diffs
- Automatic code fixes
- More programming languages
- Advanced security scanning
- Team collaboration
- Review comments
- CI/CD integration
- GitHub Actions integration
- Real-time AI review streaming

---

## 📊 Project Status

The core internship project has been completed.

The application includes:

- Authentication
- Project management
- Code snippet submission
- Multiple file submission
- Static code analysis
- AI-assisted code review
- Complexity analysis
- Code-smell detection
- Documentation generation
- Review scoring
- Review history
- Search and filtering
- Testing
- Validation
- Error handling
- Production deployment

---

## 👨‍💻 Author

Developed as an internship project.

## 📄 License

This project is intended for educational and internship purposes.