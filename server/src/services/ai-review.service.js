import { GoogleGenAI } from "@google/genai";
import { AI_REVIEW_PROVIDER, GEMINI_API_KEY, GEMINI_MODEL } from "../config/constants.js";

const AI_REVIEW_TIMEOUT_MS = 30000;
const MAX_TOTAL_SOURCE_CHARS = 28000;
const MAX_SOURCE_CHARS_PER_FILE = 7000;
const MAX_STATIC_FINDINGS = 20;
const MAX_AI_FINDINGS = 8;

const supportedSeverities = new Set(["low", "medium", "high", "critical"]);

const truncate = (value = "", maxLength) => {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}\n/* truncated for AI review */`;
};

const parseJson = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const parseGeminiJson = (text) => {
    const trimmed = text.trim();
    const withoutFence = trimmed
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    const direct = parseJson(withoutFence);
    if (direct) return direct;

    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return parseJson(withoutFence.slice(start, end + 1));
};

const getFocusAreas = (sources) => {
    const areas = sources.flatMap((source) => source.metadata?.focusAreas || []);
    return [...new Set(areas)].slice(0, 10);
};

const lineNumberedExcerpt = (content = "", maxCharacters) => {
    const lines = content.split(/\r\n|\r|\n/);
    let output = "";

    for (let index = 0; index < lines.length; index += 1) {
        const line = `${String(index + 1).padStart(4, " ")} | ${lines[index]}\n`;
        if (output.length + line.length > maxCharacters) {
            output += "/* truncated for AI review */";
            break;
        }
        output += line;
    }

    return output;
};

const buildSourceContext = (sources) => {
    let remainingCharacters = MAX_TOTAL_SOURCE_CHARS;

    return sources
        .map((source, index) => {
            if (remainingCharacters <= 0) return null;

            const maxCharacters = Math.min(MAX_SOURCE_CHARS_PER_FILE, remainingCharacters);
            const excerpt = lineNumberedExcerpt(source.content || "", maxCharacters);
            remainingCharacters -= excerpt.length;

            return {
                index: index + 1,
                title: source.title,
                file_name: source.file_name,
                language: source.language,
                line_count: source.line_count,
                excerpt,
            };
        })
        .filter(Boolean);
};

const buildPrompt = ({ sources, staticAnalysis }) => {
    const focusAreas = getFocusAreas(sources);
    const sourceContext = buildSourceContext(sources);
    const staticFindings = staticAnalysis.findings.slice(0, MAX_STATIC_FINDINGS);

    return `You are a senior software engineer reviewing code inside an AI code review app.

Return only valid JSON with this exact shape:
{
  "summary": "2-4 sentence review summary with the most important risks and next steps.",
  "findings": [
    {
      "severity": "low | medium | high | critical",
      "issue": "Concise issue title",
      "explanation": "Clear explanation of why this matters.",
      "suggested_fix": "Specific remediation guidance.",
      "file_name": "file name from the provided context or null",
      "line_number": 12
    }
  ]
}

Review rules:
- Prioritize correctness, security, maintainability, performance, and the requested focus areas.
- Use the static tool findings as evidence, but add human-readable explanations and only add extra findings when they are grounded in the code.
- Do not invent files, line numbers, dependencies, or runtime behavior.
- Keep findings actionable. Return at most ${MAX_AI_FINDINGS} findings.
- If the code looks good beyond static tool findings, return an empty findings array and explain that in the summary.

Focus areas: ${focusAreas.length > 0 ? focusAreas.join(", ") : "General review"}

Static analysis summary:
${staticAnalysis.summary}

Static analysis findings:
${JSON.stringify(staticFindings, null, 2)}

Source excerpts:
${JSON.stringify(sourceContext, null, 2)}
`;
};

const withTimeout = (promise, timeoutMs) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error("Gemini request timed out")),
            timeoutMs
        );

        promise.then(resolve, reject).finally(() => clearTimeout(timer));
    });

const requestGeminiReview = async (prompt) => {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await withTimeout(
        ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                temperature: 0.2,
                maxOutputTokens: 4096,
                responseMimeType: "application/json",
            },
        }),
        AI_REVIEW_TIMEOUT_MS
    );

    const text = response.text?.trim();
    if (!text) throw new Error("Gemini returned an empty review response");

    const parsed = parseGeminiJson(text);
    if (!parsed) throw new Error("Gemini response was not valid JSON");

    return parsed;
};

const normalizeSeverity = (severity) => {
    const normalized = String(severity || "").toLowerCase();
    return supportedSeverities.has(normalized) ? normalized : "medium";
};

const normalizeLineNumber = (lineNumber) => {
    const numericLine = Number(lineNumber);
    return Number.isInteger(numericLine) && numericLine > 0 ? numericLine : null;
};

const normalizeText = (value, maxLength) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? truncate(trimmed, maxLength) : null;
};

const normalizeFinding = (finding) => {
    const issue = normalizeText(finding.issue, 500);
    if (!issue) return null;

    return {
        severity: normalizeSeverity(finding.severity),
        issue: issue.startsWith("[Gemini]") ? issue : `[Gemini] ${issue}`,
        explanation:
            normalizeText(finding.explanation, 1200) ||
            "Gemini flagged this issue during AI-assisted review.",
        suggested_fix:
            normalizeText(finding.suggested_fix, 1200) ||
            "Review this code path and apply the safest targeted fix.",
        file_name: normalizeText(finding.file_name, 255),
        line_number: normalizeLineNumber(finding.line_number),
    };
};

const normalizeAiReview = (review) => ({
    summary:
        normalizeText(review.summary, 1200) ||
        "Gemini completed the AI-assisted review without a summary.",
    findings: Array.isArray(review.findings)
        ? review.findings.map(normalizeFinding).filter(Boolean).slice(0, MAX_AI_FINDINGS)
        : [],
});

const providerName = () => AI_REVIEW_PROVIDER.trim().toLowerCase();

export const generateAiReview = async ({ sources, staticAnalysis }) => {
    if (providerName() === "none") {
        return {
            summary: null,
            findings: [],
            notes: ["AI review is disabled by AI_REVIEW_PROVIDER=none."],
        };
    }

    if (providerName() !== "gemini") {
        return {
            summary: null,
            findings: [],
            notes: [`AI provider ${AI_REVIEW_PROVIDER} is not configured yet.`],
        };
    }

    if (!GEMINI_API_KEY) {
        return {
            summary: null,
            findings: [],
            notes: ["AI review skipped: set GEMINI_API_KEY to enable Gemini explanations."],
        };
    }

    try {
        const prompt = buildPrompt({ sources, staticAnalysis });
        const review = await requestGeminiReview(prompt);
        const normalizedReview = normalizeAiReview(review);

        return {
            ...normalizedReview,
            notes: [`AI review generated with Gemini (${GEMINI_MODEL}).`],
        };
    } catch (error) {
        console.error("Gemini review failed", error);
        return {
            summary: null,
            findings: [],
            notes: [`AI review skipped: ${error.message || "Gemini request failed"}.`],
        };
    }
};
