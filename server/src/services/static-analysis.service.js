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

const MAX_QUALITY_FINDINGS_PER_SOURCE = 12;
const LONG_FILE_LINES = 400;
const VERY_LONG_FILE_LINES = 800;
const LONG_FUNCTION_LINES = 80;
const VERY_LONG_FUNCTION_LINES = 140;
const MEDIUM_COMPLEXITY = 8;
const HIGH_COMPLEXITY = 12;
const MEDIUM_NESTING = 4;
const HIGH_NESTING = 5;
const MANY_PARAMETERS = 6;
const TOO_MANY_PARAMETERS = 8;
const FILE_MEDIUM_COMPLEXITY = 32;
const FILE_HIGH_COMPLEXITY = 48;
const LONG_LINE_LENGTH = 120;
const DUPLICATE_BLOCK_LINES = 6;
const MAX_TODO_FINDINGS = 3;
const MAX_LONG_LINE_FINDINGS = 3;
const MAX_DUPLICATE_FINDINGS = 2;

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
    if (normalized.includes("high-cyclomatic") || normalized.includes("file-complexity")) {
        return "Split branching logic into smaller functions and move repeated decisions behind named helpers.";
    }
    if (normalized.includes("long-function")) {
        return "Extract coherent blocks into focused helper functions with clear inputs and outputs.";
    }
    if (normalized.includes("deep-nesting")) {
        return "Use guard clauses, early returns, or smaller functions to flatten nested control flow.";
    }
    if (normalized.includes("large-parameter-list")) {
        return "Group related parameters into an options object or domain-specific value object.";
    }
    if (normalized.includes("long-file")) {
        return "Split unrelated responsibilities into smaller modules so each file has a clear purpose.";
    }
    if (normalized.includes("duplicate-code")) {
        return "Extract the repeated logic into a shared helper and call it from each location.";
    }
    if (normalized.includes("todo-marker")) {
        return "Convert TODO/FIXME/HACK markers into tracked work or complete the missing implementation.";
    }
    if (normalized.includes("long-line")) {
        return "Wrap long expressions or extract intermediate variables to improve readability.";
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
    if (tool === "Complexity") {
        return "Reduce control-flow complexity before adding more behavior to this area.";
    }
    if (tool === "CodeSmell") {
        return "Refactor this smell into a smaller, clearer unit of code.";
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

const buildQualityFinding = ({
    tool,
    ruleId,
    severity,
    message,
    explanation,
    fileName,
    line,
}) => ({
    severity,
    issue: `[${tool}${ruleId ? ` ${ruleId}` : ""}] ${message}`,
    explanation,
    suggested_fix: suggestedFixForRule(tool, ruleId, message),
    file_name: fileName,
    line_number: line || null,
});

const splitSourceLines = (content = "") => (content.length > 0 ? content.split(/\r\n|\r|\n/) : []);

const countMatches = (value, regex) => value.match(regex)?.length || 0;

const countCharacter = (value, character) =>
    [...value].filter((current) => current === character).length;

const stripStringLiterals = (line) =>
    line
        .replace(/"(?:\\.|[^"\\])*"/g, "\"\"")
        .replace(/'(?:\\.|[^'\\])*'/g, "''")
        .replace(/`(?:\\.|[^`\\])*`/g, "``");

const stripJavaScriptNoise = (lines) => {
    let inBlockComment = false;

    return lines.map((line) => {
        let output = "";

        for (let index = 0; index < line.length; index += 1) {
            const current = line[index];
            const next = line[index + 1];

            if (inBlockComment) {
                if (current === "*" && next === "/") {
                    inBlockComment = false;
                    index += 1;
                }
                output += " ";
                continue;
            }

            if (current === "/" && next === "*") {
                inBlockComment = true;
                output += " ";
                index += 1;
                continue;
            }

            if (current === "/" && next === "/") {
                break;
            }

            output += current;
        }

        return stripStringLiterals(output);
    });
};

const stripPythonNoise = (lines) =>
    lines.map((line) => {
        let quote = null;
        let output = "";

        for (let index = 0; index < line.length; index += 1) {
            const current = line[index];
            const previous = line[index - 1];

            if ((current === "\"" || current === "'") && previous !== "\\") {
                quote = quote === current ? null : quote || current;
                output += current;
                continue;
            }

            if (current === "#" && !quote) {
                break;
            }

            output += quote ? " " : current;
        }

        return stripStringLiterals(output);
    });

const getAnalysisLines = (source, analyzerKind) => {
    const lines = splitSourceLines(source.content || "");
    if (analyzerKind === "python") return stripPythonNoise(lines);
    if (analyzerKind === "javascript" || analyzerKind === "typescript") {
        return stripJavaScriptNoise(lines);
    }
    return lines.map(stripStringLiterals);
};

const countTopLevelParameters = (parameters = "") => {
    const trimmed = parameters.trim();
    if (!trimmed) return 0;

    let depth = 0;
    let count = 1;

    for (const character of trimmed) {
        if (character === "(" || character === "[" || character === "{") depth += 1;
        if (character === ")" || character === "]" || character === "}") depth = Math.max(0, depth - 1);
        if (character === "," && depth === 0) count += 1;
    }

    return count;
};

const getJavaScriptFunctionMatch = (line) => {
    const patterns = [
        /(?:export\s+default\s+|export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)?\s*(?:<[^>]+>\s*)?\(([^)]*)\)\s*{/,
        /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*(?:<[^>]+>\s*)?\(([^)]*)\)\s*{/,
        /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:<[^>]+>\s*)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>\s*{/,
        /^\s*(?:(?:public|private|protected|static|override)\s+)*(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?:<[^>]+>\s*)?\(([^)]*)\)\s*{/,
    ];

    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (!match) continue;

        const name = match[1] || "anonymous function";
        const parameters = match[2] ?? match[3] ?? "";
        if (["if", "for", "while", "switch", "catch"].includes(name)) continue;

        return {
            name,
            parameters,
        };
    }

    return null;
};

const findJavaScriptFunctions = (rawLines, analysisLines) => {
    const functions = [];

    for (let index = 0; index < analysisLines.length; index += 1) {
        const match = getJavaScriptFunctionMatch(analysisLines[index]);
        if (!match) continue;

        let balance = 0;
        let endIndex = index;

        for (let current = index; current < analysisLines.length; current += 1) {
            const openedOnLine = countCharacter(analysisLines[current], "{") > 0;
            balance += countCharacter(analysisLines[current], "{");
            balance -= countCharacter(analysisLines[current], "}");

            if (balance <= 0 && (current > index || openedOnLine)) {
                endIndex = current;
                break;
            }

            endIndex = current;
        }

        functions.push({
            name: match.name,
            startLine: index + 1,
            endLine: endIndex + 1,
            lineCount: endIndex - index + 1,
            parameterCount: countTopLevelParameters(match.parameters),
            rawLines: rawLines.slice(index, endIndex + 1),
            analysisLines: analysisLines.slice(index, endIndex + 1),
        });
    }

    return functions;
};

const getIndentSize = (line) => {
    const indentation = line.match(/^\s*/)?.[0] || "";
    return [...indentation].reduce((total, character) => total + (character === "\t" ? 4 : 1), 0);
};

const findPythonFunctions = (rawLines, analysisLines) => {
    const functions = [];
    const pattern = /^(\s*)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\((.*)\)\s*:/;

    for (let index = 0; index < analysisLines.length; index += 1) {
        const match = analysisLines[index].match(pattern);
        if (!match) continue;

        const startIndent = getIndentSize(analysisLines[index]);
        let endIndex = index;

        for (let current = index + 1; current < analysisLines.length; current += 1) {
            const line = analysisLines[current];
            if (!line.trim()) {
                endIndex = current;
                continue;
            }

            if (getIndentSize(line) <= startIndent) break;
            endIndex = current;
        }

        functions.push({
            name: match[2],
            startLine: index + 1,
            endLine: endIndex + 1,
            lineCount: endIndex - index + 1,
            parameterCount: countTopLevelParameters(match[3]),
            rawLines: rawLines.slice(index, endIndex + 1),
            analysisLines: analysisLines.slice(index, endIndex + 1),
        });
    }

    return functions;
};

const findFunctions = (rawLines, analysisLines, analyzerKind) => {
    if (analyzerKind === "python") return findPythonFunctions(rawLines, analysisLines);
    if (analyzerKind === "javascript" || analyzerKind === "typescript") {
        return findJavaScriptFunctions(rawLines, analysisLines);
    }
    return [];
};

const calculateCyclomaticComplexity = (analysisLines, analyzerKind) => {
    if (analysisLines.length === 0) return 0;

    const body = analysisLines.join("\n");

    if (analyzerKind === "python") {
        return (
            1 +
            countMatches(body, /\b(if|elif|for|while|except|case|with)\b/g) +
            countMatches(body, /\b(and|or)\b/g)
        );
    }

    if (analyzerKind === "javascript" || analyzerKind === "typescript") {
        return (
            1 +
            countMatches(body, /\b(if|for|while|case|catch)\b/g) +
            countMatches(body, /&&|\|\||\?\?/g)
        );
    }

    return 0;
};

const measureJavaScriptNesting = (analysisLines) => {
    const stack = [];
    let maxDepth = 0;
    let maxLine = null;

    analysisLines.forEach((line, index) => {
        const leadingClosings = line.match(/^\s*}+/)?.[0].length || 0;
        for (let count = 0; count < leadingClosings; count += 1) stack.pop();

        const controlCount = countMatches(
            line,
            /\b(if|else|for|while|switch|case|catch|try)\b/g
        );
        const currentDepth = stack.filter(Boolean).length + controlCount;

        if (controlCount > 0 && currentDepth > maxDepth) {
            maxDepth = currentDepth;
            maxLine = index + 1;
        }

        const openCount = countCharacter(line, "{");
        const remainingCloseCount = Math.max(0, countCharacter(line, "}") - leadingClosings);
        for (let count = 0; count < openCount; count += 1) stack.push(count < controlCount);
        for (let count = 0; count < remainingCloseCount; count += 1) stack.pop();
    });

    return { maxDepth, line: maxLine };
};

const measurePythonNesting = (analysisLines) => {
    const stack = [];
    let maxDepth = 0;
    let maxLine = null;
    const controlPattern = /^\s*(if|elif|else|for|while|try|except|finally|with|match|case)\b.*:/;

    analysisLines.forEach((line, index) => {
        if (!line.trim()) return;

        const indent = getIndentSize(line);
        while (stack.length > 0 && indent <= stack[stack.length - 1]) stack.pop();

        if (!controlPattern.test(line)) return;

        const currentDepth = stack.length + 1;
        if (currentDepth > maxDepth) {
            maxDepth = currentDepth;
            maxLine = index + 1;
        }
        stack.push(indent);
    });

    return { maxDepth, line: maxLine };
};

const measureNesting = (analysisLines, analyzerKind) => {
    if (analyzerKind === "python") return measurePythonNesting(analysisLines);
    if (analyzerKind === "javascript" || analyzerKind === "typescript") {
        return measureJavaScriptNesting(analysisLines);
    }
    return { maxDepth: 0, line: null };
};

const getSeverityForThreshold = (value, medium, high) => {
    if (value >= high) return "high";
    if (value >= medium) return "medium";
    return null;
};

const findDuplicateBlocks = (analysisLines) => {
    const seen = new Map();
    const duplicates = [];
    const normalizedLines = analysisLines.map((line) => line.trim().replace(/\s+/g, " "));

    for (let index = 0; index <= normalizedLines.length - DUPLICATE_BLOCK_LINES; index += 1) {
        const block = normalizedLines.slice(index, index + DUPLICATE_BLOCK_LINES);
        const meaningfulLines = block.filter(
            (line) =>
                line.length >= 8 &&
                !/^[{}()[\],;]+$/.test(line) &&
                !/^(import|export|from|const \{|let \{|var \{)\b/.test(line)
        );

        if (meaningfulLines.length < DUPLICATE_BLOCK_LINES - 1) continue;

        const key = block.join("\n");
        const firstIndex = seen.get(key);

        if (firstIndex !== undefined && index - firstIndex >= DUPLICATE_BLOCK_LINES) {
            duplicates.push({ firstLine: firstIndex + 1, line: index + 1 });
            if (duplicates.length >= MAX_DUPLICATE_FINDINGS) break;
        } else if (firstIndex === undefined) {
            seen.set(key, index);
        }
    }

    return duplicates;
};

const getSourceDisplayName = (source) => source.file_name || source.title || "source";

const analyzeQuality = (source, analyzerKind) => {
    const fileName = getSourceDisplayName(source);
    const rawLines = splitSourceLines(source.content || "");
    const analysisLines = getAnalysisLines(source, analyzerKind);
    const functions = findFunctions(rawLines, analysisLines, analyzerKind);
    const findings = [];

    const fileLineSeverity = getSeverityForThreshold(
        rawLines.length,
        LONG_FILE_LINES,
        VERY_LONG_FILE_LINES
    );
    if (fileLineSeverity) {
        findings.push(
            buildQualityFinding({
                tool: "CodeSmell",
                ruleId: "long-file",
                severity: fileLineSeverity,
                message: `${fileName} is ${rawLines.length} lines long.`,
                explanation:
                    "Large files are harder to navigate and often mix responsibilities that should be reviewed independently.",
                fileName,
                line: 1,
            })
        );
    }

    const fileComplexity = calculateCyclomaticComplexity(analysisLines, analyzerKind);
    const fileComplexitySeverity = getSeverityForThreshold(
        fileComplexity,
        FILE_MEDIUM_COMPLEXITY,
        FILE_HIGH_COMPLEXITY
    );
    if (fileComplexitySeverity) {
        findings.push(
            buildQualityFinding({
                tool: "Complexity",
                ruleId: "file-complexity",
                severity: fileComplexitySeverity,
                message: `${fileName} has aggregate cyclomatic complexity of ${fileComplexity}.`,
                explanation:
                    "High aggregate branching raises maintenance risk because changes need to account for many possible execution paths.",
                fileName,
                line: 1,
            })
        );
    }

    functions.forEach((fn) => {
        const complexity = calculateCyclomaticComplexity(fn.analysisLines, analyzerKind);
        const complexitySeverity = getSeverityForThreshold(
            complexity,
            MEDIUM_COMPLEXITY,
            HIGH_COMPLEXITY
        );

        if (complexitySeverity) {
            findings.push(
                buildQualityFinding({
                    tool: "Complexity",
                    ruleId: "high-cyclomatic",
                    severity: complexitySeverity,
                    message: `${fn.name} has cyclomatic complexity of ${complexity}.`,
                    explanation:
                        "This function has enough branching paths that it will be difficult to test and modify safely.",
                    fileName,
                    line: fn.startLine,
                })
            );
        }

        const lineSeverity = getSeverityForThreshold(
            fn.lineCount,
            LONG_FUNCTION_LINES,
            VERY_LONG_FUNCTION_LINES
        );
        if (lineSeverity) {
            findings.push(
                buildQualityFinding({
                    tool: "CodeSmell",
                    ruleId: "long-function",
                    severity: lineSeverity,
                    message: `${fn.name} is ${fn.lineCount} lines long.`,
                    explanation:
                        "Long functions tend to hide separate responsibilities and make review, testing, and reuse harder.",
                    fileName,
                    line: fn.startLine,
                })
            );
        }

        const parameterSeverity = getSeverityForThreshold(
            fn.parameterCount,
            MANY_PARAMETERS,
            TOO_MANY_PARAMETERS
        );
        if (parameterSeverity) {
            findings.push(
                buildQualityFinding({
                    tool: "CodeSmell",
                    ruleId: "large-parameter-list",
                    severity: parameterSeverity,
                    message: `${fn.name} accepts ${fn.parameterCount} parameters.`,
                    explanation:
                        "Large parameter lists make call sites brittle and usually signal that related data should be grouped.",
                    fileName,
                    line: fn.startLine,
                })
            );
        }
    });

    const nesting = measureNesting(analysisLines, analyzerKind);
    const nestingSeverity = getSeverityForThreshold(nesting.maxDepth, MEDIUM_NESTING, HIGH_NESTING);
    if (nestingSeverity) {
        findings.push(
            buildQualityFinding({
                tool: "CodeSmell",
                ruleId: "deep-nesting",
                severity: nestingSeverity,
                message: `${fileName} reaches nesting depth ${nesting.maxDepth}.`,
                explanation:
                    "Deeply nested control flow is harder to scan and increases the chance of missed edge cases.",
                fileName,
                line: nesting.line,
            })
        );
    }

    rawLines.forEach((line, index) => {
        if (findings.filter((finding) => finding.issue.includes("todo-marker")).length >= MAX_TODO_FINDINGS) {
            return;
        }

        if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(line)) {
            findings.push(
                buildQualityFinding({
                    tool: "CodeSmell",
                    ruleId: "todo-marker",
                    severity: "low",
                    message: "Tracked placeholder marker found in source.",
                    explanation:
                        "TODO-style markers can become invisible backlog unless they are converted into tracked tasks or completed before release.",
                    fileName,
                    line: index + 1,
                })
            );
        }
    });

    rawLines.forEach((line, index) => {
        if (findings.filter((finding) => finding.issue.includes("long-line")).length >= MAX_LONG_LINE_FINDINGS) {
            return;
        }

        if (line.length > LONG_LINE_LENGTH) {
            findings.push(
                buildQualityFinding({
                    tool: "CodeSmell",
                    ruleId: "long-line",
                    severity: "low",
                    message: `Line ${index + 1} is ${line.length} characters long.`,
                    explanation:
                        "Very long lines are harder to review in diffs and often hide expressions that deserve names.",
                    fileName,
                    line: index + 1,
                })
            );
        }
    });

    findDuplicateBlocks(analysisLines).forEach((duplicate) => {
        findings.push(
            buildQualityFinding({
                tool: "CodeSmell",
                ruleId: "duplicate-code",
                severity: "medium",
                message: `Duplicate code block repeats lines ${duplicate.firstLine}-${duplicate.firstLine + DUPLICATE_BLOCK_LINES - 1}.`,
                explanation:
                    "Repeated blocks increase maintenance cost because a bug fix or behavior change needs to be applied in multiple places.",
                fileName,
                line: duplicate.line,
            })
        );
    });

    const supportsComplexity = ["javascript", "typescript", "python"].includes(analyzerKind);

    return {
        findings: findings.slice(0, MAX_QUALITY_FINDINGS_PER_SOURCE),
        tools: supportsComplexity ? ["Complexity", "CodeSmell"] : ["CodeSmell"],
        notes: [],
    };
};

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

    let toolResult;
    if (analyzerKind === "javascript") {
        toolResult = await analyzeJavaScript(source, filePath);
    } else if (analyzerKind === "typescript") {
        toolResult = await analyzeTypeScript(source, filePath);
    } else if (analyzerKind === "python") {
        toolResult = await analyzePython(source, filePath);
    } else {
        toolResult = analyzeUnsupported(source);
    }

    const qualityResult = analyzeQuality(source, analyzerKind);

    return {
        findings: [...toolResult.findings, ...qualityResult.findings],
        tools: [...toolResult.tools, ...qualityResult.tools],
        notes: [...toolResult.notes, ...qualityResult.notes],
    };
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
