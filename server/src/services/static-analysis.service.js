import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const COMMAND_TIMEOUT_MS = 15000;
const DEFAULT_EXTENSION = "txt";

const jsExtensions = new Set(["cjs", "js", "jsx", "mjs"]);
const tsExtensions = new Set(["ts", "tsx"]);
const pythonExtensions = new Set(["py", "pyw"]);

const eslintRules = [
    ["no-unused-vars", "error"],
    ["no-undef", "error"],
    ["no-unreachable", "error"],
    ["no-dupe-keys", "error"],
    ["no-redeclare", "error"],
    ["no-eval", "error"],
    ["no-implied-eval", "error"],
    ["eqeqeq", "warn"],
    ["no-var", "warn"],
    ["prefer-const", "warn"],
    ["no-extra-semi", "warn"],
];

const eslintGlobals = [
    "console",
    "process",
    "module",
    "require",
    "__dirname",
    "__filename",
    "window",
    "document",
    "fetch",
    "setTimeout",
    "clearTimeout",
    "setInterval",
    "clearInterval",
];

const severityWeight = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
};

const binName = (name) => (process.platform === "win32" ? `${name}.cmd` : name);

const uniquePaths = (paths) => [...new Set(paths)];

const nodeToolCandidates = (name, envName, packageBinPath) => {
    const localBinPaths = uniquePaths([
        path.resolve(process.cwd(), "node_modules", ...packageBinPath),
        path.resolve(process.cwd(), "client", "node_modules", ...packageBinPath),
        path.resolve(process.cwd(), "..", "client", "node_modules", ...packageBinPath),
    ]);

    return [
        process.env[envName] ? { command: process.env[envName], argsPrefix: [] } : null,
        ...localBinPaths.map((binPath) => ({
            command: process.execPath,
            argsPrefix: [binPath],
            pathToCheck: binPath,
        })),
        { command: binName(name), argsPrefix: [] },
        { command: name, argsPrefix: [] },
    ].filter(Boolean);
};

const commandCandidates = (name, envName) => [
    process.env[envName] ? { command: process.env[envName], argsPrefix: [] } : null,
    { command: binName(name), argsPrefix: [] },
    { command: name, argsPrefix: [] },
].filter(Boolean);

const hasPathSeparator = (command) => command.includes("/") || command.includes("\\");

const pathExists = async (candidate) => {
    try {
        await access(candidate);
        return true;
    } catch {
        return false;
    }
};

const isWindowsCommandScript = (command) =>
    process.platform === "win32" && /\.(cmd|bat)$/i.test(command);

const quoteCommandArg = (value) => `"${String(value).replace(/"/g, '\\"')}"`;

const isWindowsCommandNotRecognized = (result) =>
    process.platform === "win32" &&
    /is not recognized as an internal or external command/i.test(
        `${result.stdout}\n${result.stderr}`
    );

const runCommand = (command, args, options = {}) =>
    new Promise((resolve) => {
        let stdout = "";
        let stderr = "";
        let settled = false;

        const childCommand = isWindowsCommandScript(command)
            ? process.env.ComSpec || "cmd.exe"
            : command;
        const childArgs = isWindowsCommandScript(command)
            ? ["/d", "/s", "/c", [quoteCommandArg(command), ...args.map(quoteCommandArg)].join(" ")]
            : args;

        const child = spawn(childCommand, childArgs, {
            cwd: options.cwd,
            shell: false,
            windowsHide: true,
        });

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                child.kill("SIGTERM");
                resolve({ code: null, stdout, stderr, timedOut: true, notFound: false });
            }
        }, options.timeoutMs || COMMAND_TIMEOUT_MS);

        child.stdout?.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        child.on("error", (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({
                code: null,
                stdout,
                stderr: error.message,
                timedOut: false,
                notFound: error.code === "ENOENT",
            });
        });

        child.on("close", (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ code, stdout, stderr, timedOut: false, notFound: false });
        });
    });

const runFirstAvailable = async (candidates, args, options = {}) => {
    for (const candidate of candidates) {
        const command = candidate.command || candidate;
        const argsPrefix = candidate.argsPrefix || [];
        const pathToCheck = candidate.pathToCheck || (hasPathSeparator(command) ? command : null);

        if (pathToCheck && !(await pathExists(pathToCheck))) continue;

        const result = await runCommand(command, [...argsPrefix, ...args], options);
        if (!result.notFound && !isWindowsCommandNotRecognized(result)) {
            return { command, result };
        }
    }

    return null;
};

const getExtension = (source) => {
    const fileName = source.file_name || source.title || "";
    const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";
    return extension || extensionFromLanguage(source.language);
};

const extensionFromLanguage = (language = "") => {
    const normalized = language.toLowerCase();
    if (normalized.includes("typescript")) return "ts";
    if (normalized.includes("javascript")) return "js";
    if (normalized.includes("python")) return "py";
    if (normalized.includes("json")) return "json";
    return DEFAULT_EXTENSION;
};

const getAnalyzerKind = (source) => {
    const extension = getExtension(source);
    const language = (source.language || "").toLowerCase();

    if (pythonExtensions.has(extension) || language.includes("python")) return "python";
    if (tsExtensions.has(extension) || language.includes("typescript")) return "typescript";
    if (jsExtensions.has(extension) || language.includes("javascript")) return "javascript";
    return "unsupported";
};

const sanitizeFileName = (source, fallbackExtension) => {
    const rawName = source.file_name || source.title || `source.${fallbackExtension}`;
    const cleaned = rawName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || `source.${fallbackExtension}`;
    return cleaned.includes(".") ? cleaned : `${cleaned}.${fallbackExtension}`;
};

const parseJson = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const normalizeSeverity = (severity) => {
    if (severity === 2 || severity === "error") return "high";
    if (severity === 1 || severity === "warning" || severity === "warn") return "medium";
    return "low";
};

const suggestedFixForRule = (tool, ruleId, message) => {
    const normalized = ruleId || "";
    const lowerMessage = message.toLowerCase();

    if (normalized.includes("no-unused-vars") || lowerMessage.includes("unused")) {
        return "Remove the unused symbol or use it where it is needed.";
    }
    if (normalized.includes("no-undef") || lowerMessage.includes("undefined")) {
        return "Define the missing symbol or import it before using it.";
    }
    if (normalized.includes("no-unreachable") || lowerMessage.includes("unreachable")) {
        return "Remove unreachable code or move it before the control-flow exit.";
    }
    if (normalized.includes("dupe") || lowerMessage.includes("duplicate")) {
        return "Remove the duplicate declaration or rename one of the conflicting entries.";
    }
    if (normalized.includes("eqeqeq")) {
        return "Use strict equality operators such as === or !==.";
    }
    if (normalized.includes("no-var") || normalized.includes("prefer-const")) {
        return "Use const for values that do not change, otherwise use let.";
    }
    if (normalized.includes("eval")) {
        return "Replace dynamic evaluation with a safer explicit implementation.";
    }
    if (tool === "TypeScript") {
        return "Fix the TypeScript compiler error and rerun the review.";
    }
    if (tool === "Python") {
        return "Fix the Python syntax issue and rerun the review.";
    }
    if (tool === "Pylint") {
        return "Follow the Pylint recommendation or document why the exception is intentional.";
    }

    return "Review the reported issue and update the source code accordingly.";
};

const buildFinding = ({
    tool,
    ruleId,
    severity,
    message,
    fileName,
    line,
    column,
    fatal = false,
}) => ({
    severity: fatal ? "critical" : severity,
    issue: `[${tool}${ruleId ? ` ${ruleId}` : ""}] ${message}`,
    explanation: `${tool} reported this issue${line ? ` at line ${line}` : ""}${
        column ? `, column ${column}` : ""
    }.`,
    suggested_fix: suggestedFixForRule(tool, ruleId, message),
    file_name: fileName,
    line_number: line || null,
});

const eslintArgsFor = (filePath, extension) => [
    "--no-config-lookup",
    "--format",
    "json",
    "--ext",
    `.${extension}`,
    ...eslintGlobals.flatMap((globalName) => ["--global", globalName]),
    ...eslintRules.flatMap(([rule, level]) => ["--rule", `${rule}:${level}`]),
    filePath,
];

const analyzeJavaScript = async (source, filePath) => {
    const extension = getExtension(source);
    const eslintRun = await runFirstAvailable(
        nodeToolCandidates("eslint", "ESLINT_BIN", ["eslint", "bin", "eslint.js"]),
        eslintArgsFor(filePath, extension),
        { cwd: path.dirname(filePath) }
    );

    if (!eslintRun) {
        return {
            findings: [],
            tools: [],
            notes: ["ESLint was not found, so JavaScript linting was skipped."],
        };
    }

    if (eslintRun.result.timedOut) {
        return {
            findings: [
                buildFinding({
                    tool: "ESLint",
                    severity: "medium",
                    message: "Static analysis timed out before ESLint finished.",
                    fileName: source.file_name || source.title,
                }),
            ],
            tools: ["ESLint"],
            notes: [],
        };
    }

    const parsed = parseJson(eslintRun.result.stdout);
    if (!parsed) {
        return {
            findings: [
                buildFinding({
                    tool: "ESLint",
                    severity: "medium",
                    message: eslintRun.result.stderr || "ESLint output could not be parsed.",
                    fileName: source.file_name || source.title,
                }),
            ],
            tools: ["ESLint"],
            notes: [],
        };
    }

    const findings = parsed.flatMap((result) =>
        (result.messages || []).map((message) =>
            buildFinding({
                tool: "ESLint",
                ruleId: message.ruleId,
                severity: normalizeSeverity(message.severity),
                message: message.message,
                fileName: source.file_name || source.title,
                line: message.line,
                column: message.column,
                fatal: message.fatal,
            })
        )
    );

    return { findings, tools: ["ESLint"], notes: [] };
};

const parseTypeScriptOutput = (output, source) => {
    const findings = [];
    const lineRegex = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/gm;
    let match;

    while ((match = lineRegex.exec(output)) !== null) {
        findings.push(
            buildFinding({
                tool: "TypeScript",
                ruleId: match[4],
                severity: "high",
                message: match[5],
                fileName: source.file_name || source.title,
                line: Number(match[2]),
                column: Number(match[3]),
            })
        );
    }

    return findings;
};

const analyzeTypeScript = async (source, filePath) => {
    const tscRun = await runFirstAvailable(
        nodeToolCandidates("tsc", "TSC_BIN", ["typescript", "bin", "tsc"]),
        [
            "--noEmit",
            "--pretty",
            "false",
            "--skipLibCheck",
            "--strict",
            "--noUnusedLocals",
            "--noUnusedParameters",
            "--noImplicitReturns",
            "--noFallthroughCasesInSwitch",
            "--target",
            "ES2022",
            "--module",
            "ESNext",
            "--jsx",
            "react-jsx",
            filePath,
        ],
        { cwd: path.dirname(filePath) }
    );

    if (!tscRun) {
        return {
            findings: [],
            tools: [],
            notes: ["TypeScript compiler was not found, so TypeScript checks were skipped."],
        };
    }

    if (tscRun.result.timedOut) {
        return {
            findings: [
                buildFinding({
                    tool: "TypeScript",
                    severity: "medium",
                    message: "Static analysis timed out before TypeScript finished.",
                    fileName: source.file_name || source.title,
                }),
            ],
            tools: ["TypeScript"],
            notes: [],
        };
    }

    return {
        findings: parseTypeScriptOutput(`${tscRun.result.stdout}\n${tscRun.result.stderr}`, source),
        tools: ["TypeScript"],
        notes: [],
    };
};

const parsePylintOutput = (output, source) => {
    const parsed = parseJson(output);
    if (!Array.isArray(parsed)) return null;

    return parsed.map((message) => {
        const severity =
            message.type === "fatal" || message.type === "error"
                ? "high"
                : message.type === "warning"
                  ? "medium"
                  : "low";

        return buildFinding({
            tool: "Pylint",
            ruleId: message.symbol || message["message-id"],
            severity,
            message: message.message,
            fileName: source.file_name || source.title,
            line: message.line,
            column: message.column,
        });
    });
};

const runPylint = async (source, filePath) => {
    const directPylint = await runFirstAvailable(
        commandCandidates("pylint", "PYLINT_BIN"),
        ["--output-format=json", filePath],
        { cwd: path.dirname(filePath) }
    );

    if (directPylint && !directPylint.result.stderr.includes("No module named pylint")) {
        const findings = parsePylintOutput(directPylint.result.stdout, source);
        if (findings) return { findings, tools: ["Pylint"], notes: [] };
    }

    const pythonPylint = await runFirstAvailable(
        commandCandidates("python", "PYTHON_BIN"),
        ["-m", "pylint", "--output-format=json", filePath],
        { cwd: path.dirname(filePath) }
    );

    if (
        pythonPylint &&
        !pythonPylint.result.stderr.includes("No module named pylint") &&
        !pythonPylint.result.notFound
    ) {
        const findings = parsePylintOutput(pythonPylint.result.stdout, source);
        if (findings) return { findings, tools: ["Pylint"], notes: [] };
    }

    return null;
};

const parsePythonSyntaxOutput = (output, source) => {
    const lineMatch = output.match(/File ".*?", line (\d+)/);
    const messageMatch = output.match(/(SyntaxError|IndentationError|TabError):\s+(.+)/);

    if (!messageMatch) return [];

    return [
        buildFinding({
            tool: "Python",
            ruleId: messageMatch[1],
            severity: "high",
            message: messageMatch[2],
            fileName: source.file_name || source.title,
            line: lineMatch ? Number(lineMatch[1]) : null,
        }),
    ];
};

const runPythonSyntaxCheck = async (source, filePath) => {
    const pythonRun = await runFirstAvailable(
        commandCandidates("python", "PYTHON_BIN"),
        ["-m", "py_compile", filePath],
        { cwd: path.dirname(filePath) }
    );

    if (!pythonRun) {
        return {
            findings: [],
            tools: [],
            notes: ["Python was not found, so Python syntax checks were skipped."],
        };
    }

    return {
        findings: parsePythonSyntaxOutput(`${pythonRun.result.stdout}\n${pythonRun.result.stderr}`, source),
        tools: ["Python"],
        notes: ["Pylint was not found; Python syntax checking was used as a fallback."],
    };
};

const analyzePython = async (source, filePath) => {
    const pylintResult = await runPylint(source, filePath);
    if (pylintResult) return pylintResult;
    return runPythonSyntaxCheck(source, filePath);
};

const analyzeUnsupported = (source) => ({
    findings: [],
    tools: [],
    notes: [`No static analyzer is configured for ${source.language || "this source type"}.`],
});

const analyzeSource = async (source, tempDir) => {
    const analyzerKind = getAnalyzerKind(source);
    const extension = getExtension(source);
    const fileName = sanitizeFileName(source, extension);
    const sourceDir = path.join(tempDir, source.id || randomUUID());
    await mkdir(sourceDir, { recursive: true });

    const filePath = path.join(sourceDir, fileName);
    await writeFile(filePath, source.content || "", "utf8");

    if (analyzerKind === "javascript") return analyzeJavaScript(source, filePath);
    if (analyzerKind === "typescript") return analyzeTypeScript(source, filePath);
    if (analyzerKind === "python") return analyzePython(source, filePath);
    return analyzeUnsupported(source);
};

const calculateScore = (findings) => {
    const penalty = findings.reduce(
        (total, finding) => total + (severityWeight[finding.severity] || 0),
        0
    );
    return Math.max(0, 100 - penalty);
};

const buildSummary = ({ findings, sourceCount, tools, notes }) => {
    const toolText = tools.length > 0 ? tools.join(", ") : "no configured analyzer";
    const findingText =
        findings.length === 1 ? "1 static finding" : `${findings.length} static findings`;
    const noteText = notes.length > 0 ? ` ${notes.join(" ")}` : "";

    return `Static analysis completed with ${toolText}: ${findingText} across ${sourceCount} source${
        sourceCount === 1 ? "" : "s"
    }.${noteText}`;
};

export const analyzeSources = async (sources) => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "code-review-static-"));

    try {
        const results = [];
        for (const source of sources) {
            results.push(await analyzeSource(source, tempDir));
        }

        const findings = results.flatMap((result) => result.findings);
        const tools = [...new Set(results.flatMap((result) => result.tools))];
        const notes = [...new Set(results.flatMap((result) => result.notes))];

        return {
            findings,
            tools,
            notes,
            overallScore: calculateScore(findings),
            summary: buildSummary({ findings, sourceCount: sources.length, tools, notes }),
        };
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
};
