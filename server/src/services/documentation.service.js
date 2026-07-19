const MAX_DOCUMENTED_ITEMS_PER_SOURCE = 30;
const MAX_DESCRIPTION_LENGTH = 500;
const ROUTE_LOOKAHEAD_LINES = 8;
const nextRouteMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
const ignoredJavaScriptFunctionNames = new Set([
    "catch",
    "for",
    "if",
    "switch",
    "while",
    "with",
]);

const extensionLanguageMap = {
    cjs: "javascript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    pyw: "python",
    java: "java",
    go: "go",
};

const splitSourceLines = (content = "") => (content.length > 0 ? content.split(/\r\n|\r|\n/) : []);

const normalizeWhitespace = (value = "") => value.replace(/\s+/g, " ").trim();

const truncate = (value = "", maxLength = MAX_DESCRIPTION_LENGTH) => {
    const normalized = normalizeWhitespace(value);
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 3).trim()}...`;
};

const getSourceName = (source) => source.file_name || source.title || "source";

const getExtension = (source) => {
    const fileName = getSourceName(source);
    return fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() || "" : "";
};

const getLanguageKind = (source) => {
    const language = (source.language || "").toLowerCase();
    const extension = getExtension(source);

    if (language.includes("typescript") || ["ts", "tsx"].includes(extension)) return "typescript";
    if (language.includes("javascript") || ["js", "jsx", "mjs", "cjs"].includes(extension)) {
        return "javascript";
    }
    if (language.includes("python") || ["py", "pyw"].includes(extension)) return "python";
    if (language.includes("java") || extension === "java") return "java";
    if (language === "go" || extension === "go") return "go";

    return extensionLanguageMap[extension] || "unknown";
};

const cleanCommentLines = (commentLines) =>
    truncate(
        commentLines
            .map((line) =>
                line
                    .trim()
                    .replace(/^\/\*\*?/, "")
                    .replace(/\*\/$/, "")
                    .replace(/^\*\s?/, "")
                    .replace(/^\/\/\s?/, "")
                    .replace(/^#\s?/, "")
                    .trim()
            )
            .filter(Boolean)
            .filter((line) => !line.startsWith("@"))
            .join(" ")
    );

const getLeadingComment = (lines, index, languageKind) => {
    let current = index - 1;
    while (current >= 0 && !lines[current].trim()) current -= 1;
    if (current < 0) return "";

    const trimmed = lines[current].trim();

    if (["javascript", "typescript", "java", "go"].includes(languageKind)) {
        if (trimmed.endsWith("*/")) {
            const blockLines = [];
            while (current >= 0) {
                blockLines.unshift(lines[current]);
                if (lines[current].includes("/*")) break;
                current -= 1;
            }
            return cleanCommentLines(blockLines);
        }

        if (trimmed.startsWith("//")) {
            const blockLines = [];
            while (current >= 0 && lines[current].trim().startsWith("//")) {
                blockLines.unshift(lines[current]);
                current -= 1;
            }
            return cleanCommentLines(blockLines);
        }
    }

    if (languageKind === "python" && trimmed.startsWith("#")) {
        const blockLines = [];
        while (current >= 0 && lines[current].trim().startsWith("#")) {
            blockLines.unshift(lines[current]);
            current -= 1;
        }
        return cleanCommentLines(blockLines);
    }

    return "";
};

const getPythonDocstring = (lines, declarationIndex) => {
    let current = declarationIndex + 1;
    while (current < lines.length && !lines[current].trim()) current += 1;
    if (current >= lines.length) return "";

    const trimmed = lines[current].trim();
    const quote = trimmed.startsWith('"""') ? '"""' : trimmed.startsWith("'''") ? "'''" : null;
    if (!quote) return "";

    const docLines = [trimmed.replace(quote, "")];
    if (trimmed.endsWith(quote) && trimmed.length > quote.length * 2) {
        return truncate(trimmed.replace(new RegExp(`^${quote}|${quote}$`, "g"), ""));
    }

    current += 1;
    while (current < lines.length) {
        const line = lines[current];
        if (line.trim().endsWith(quote)) {
            docLines.push(line.trim().replace(quote, ""));
            break;
        }
        docLines.push(line);
        current += 1;
    }

    return cleanCommentLines(docLines);
};

const stripInlineComment = (line, languageKind) => {
    if (languageKind === "python") return line.replace(/\s+#.*$/, "");
    return line.replace(/\s+\/\/.*$/, "");
};

const collectDeclaration = (lines, index, languageKind) => {
    const parts = [];

    for (let current = index; current < Math.min(lines.length, index + 8); current += 1) {
        const line = stripInlineComment(lines[current], languageKind).trim();
        if (!line) continue;

        parts.push(line);
        if (/[{;:]$/.test(line) || line.includes("=>") || line.includes(") {")) break;
    }

    return normalizeWhitespace(parts.join(" "))
        .replace(/\s*\{.*$/, "")
        .replace(/\s*=>\s*\{?.*$/, " =>")
        .replace(/\s*:\s*$/, "");
};

const splitParameters = (parameters = "") => {
    const values = [];
    let current = "";
    let depth = 0;

    for (const character of parameters) {
        if (character === "(" || character === "[" || character === "{" || character === "<") {
            depth += 1;
        }
        if (character === ")" || character === "]" || character === "}" || character === ">") {
            depth = Math.max(0, depth - 1);
        }

        if (character === "," && depth === 0) {
            values.push(current);
            current = "";
        } else {
            current += character;
        }
    }

    if (current.trim()) values.push(current);
    return values.map((value) => value.trim()).filter(Boolean);
};

const parseParameter = (parameter, languageKind = "unknown") => {
    const [withoutDefault, ...defaultParts] = parameter.split("=");
    const defaultValue = defaultParts.length > 0 ? defaultParts.join("=").trim() : null;
    const normalized = withoutDefault.trim();

    if (languageKind === "java") {
        const parts = normalized
            .replace(/@\w+(?:\([^)]*\))?\s*/g, "")
            .replace(/^final\s+/, "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (parts.length > 1) {
            const name = parts.pop();
            return {
                name: name || parameter,
                type: parts.join(" ") || null,
                defaultValue,
            };
        }
    }

    if (languageKind === "go") {
        const parts = normalized.split(/\s+/).filter(Boolean);

        if (parts.length > 1) {
            return {
                name: parts.slice(0, -1).join(" "),
                type: parts[parts.length - 1] || null,
                defaultValue,
            };
        }
    }

    const [rawName, ...typeParts] = withoutDefault.split(":");
    const name = rawName
        .replace(/^\.\.\./, "")
        .replace(/\?$/, "")
        .trim();
    const type = typeParts.length > 0 ? typeParts.join(":").trim() : null;

    return {
        name: name || parameter,
        type: type || null,
        defaultValue,
    };
};

const parseParameters = (parameters = "", languageKind = "unknown") =>
    splitParameters(parameters).map((parameter) => parseParameter(parameter, languageKind));

const extractReturnType = (signature, languageKind) => {
    if (languageKind === "python") {
        return signature.match(/\)\s*->\s*([^:]+)\s*:?$/)?.[1]?.trim() || null;
    }

    const arrowMatch = signature.match(/\)\s*:\s*([^=]+?)\s*=>/);
    if (arrowMatch) return arrowMatch[1].trim();

    return signature.match(/\)\s*:\s*([^{;]+)$/)?.[1]?.trim() || null;
};

const fallbackDescription = ({ kind, name, method, path, parameters, returns, languageKind }) => {
    if (kind === "api") {
        return `${method?.toUpperCase() || "API"} ${path || "endpoint"} endpoint defined in ${languageKind} source.`;
    }

    if (kind === "class") {
        return `${name} groups related state and behavior in this source.`;
    }

    const parameterText =
        parameters.length === 0
            ? "no parameters"
            : `${parameters.length} parameter${parameters.length === 1 ? "" : "s"}`;
    const returnText = returns ? ` and returns ${returns}` : "";
    return `${name} is a ${languageKind} function that accepts ${parameterText}${returnText}.`;
};

const createDocumentationItem = ({
    kind,
    name,
    signature,
    description,
    fileName,
    lineNumber,
    languageKind,
    parameters = [],
    returns = null,
    method = null,
    path = null,
}) => ({
    kind,
    name,
    signature,
    description:
        description ||
        fallbackDescription({ kind, name, method, path, parameters, returns, languageKind }),
    fileName,
    lineNumber,
    parameters,
    returns,
    method,
    path,
});

const getNextRoutePath = (fileName) => {
    const normalized = fileName.replace(/\\/g, "/");
    const routeMatch = normalized.match(/(?:^|\/)app\/(.+)\/route\.(?:js|jsx|ts|tsx)$/i);
    if (!routeMatch) return "Next.js route handler";

    const segments = routeMatch[1]
        .split("/")
        .filter((segment) => segment && !segment.startsWith("(") && !segment.startsWith("@"));

    return segments.length > 0 ? `/${segments.join("/")}` : "/";
};

const getJavaScriptFunctionMatch = (line) => {
    const patterns = [
        /^(?:export\s+default\s+|export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)?\s*(?:<[^>]+>\s*)?\(([^)]*)\)/,
        /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*(?:<[^>]+>\s*)?\(([^)]*)\)/,
        /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:<[^>]+>\s*)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*(?::\s*[^=]+)?=>/,
        /^([A-Za-z_$][\w$]*)\s*:\s*(?:async\s*)?(?:<[^>]+>\s*)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*(?::\s*[^=]+)?=>/,
        /^(?:(?:public|private|protected|static|override|readonly|abstract|async|get|set)\s+)*(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?:<[^>]+>\s*)?\(([^)]*)\)\s*(?::\s*[^=]+)?(?:\{|$)/,
    ];

    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (!match) continue;

        const name = match[1] || "anonymous function";
        if (ignoredJavaScriptFunctionNames.has(name)) continue;

        return {
            name,
            parameters: match[2] ?? match[3] ?? "",
        };
    }

    return null;
};

const collectRouteExpression = (lines, index, languageKind) =>
    normalizeWhitespace(
        lines
            .slice(index, Math.min(lines.length, index + ROUTE_LOOKAHEAD_LINES))
            .map((line) => stripInlineComment(line, languageKind))
            .join(" ")
    );

const getJavaScriptRouteMatch = (lines, index, languageKind) => {
    if (!/\b(?:router|app)\s*\./.test(lines[index])) return null;

    const expression = collectRouteExpression(lines, index, languageKind);
    const directRouteMatch = expression.match(
        /\b(?:router|app)\s*\.\s*(get|post|put|patch|delete|options|head|all)\s*\(\s*["'`]([^"'`]+)["'`]/i
    );
    const chainedRouteMatch = expression.match(
        /\b(?:router|app)\s*\.\s*route\s*\(\s*["'`]([^"'`]+)["'`]\s*\)\s*\.\s*(get|post|put|patch|delete|options|head|all)\s*\(/i
    );

    if (!directRouteMatch && !chainedRouteMatch) return null;

    return {
        method: (directRouteMatch?.[1] || chainedRouteMatch?.[2] || "all").toUpperCase(),
        path: directRouteMatch?.[2] || chainedRouteMatch?.[1] || "/",
    };
};

const extractJavaScriptItems = (lines, source, languageKind) => {
    const fileName = getSourceName(source);
    const items = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        const classMatch = trimmed.match(/^(?:export\s+default\s+|export\s+)?class\s+([A-Za-z_$][\w$]*)?([^{]*)/);
        if (classMatch) {
            const name = classMatch[1] || "AnonymousClass";
            items.push(
                createDocumentationItem({
                    kind: "class",
                    name,
                    signature: collectDeclaration(lines, index, languageKind),
                    description: getLeadingComment(lines, index, languageKind),
                    fileName,
                    lineNumber: index + 1,
                    languageKind,
                })
            );
        }

        const functionMatch = getJavaScriptFunctionMatch(trimmed);
        if (functionMatch) {
            const signature = collectDeclaration(lines, index, languageKind);
            const parameters = parseParameters(functionMatch.parameters, languageKind);
            const methodName = functionMatch.name.toUpperCase();
            const isNextRouteHandler =
                nextRouteMethods.has(methodName) && /(^|[\\/])route\.(js|jsx|ts|tsx)$/i.test(fileName);
            const nextRoutePath = isNextRouteHandler ? getNextRoutePath(fileName) : null;

            items.push(
                createDocumentationItem({
                    kind: isNextRouteHandler ? "api" : "function",
                    name: functionMatch.name,
                    signature,
                    description: getLeadingComment(lines, index, languageKind),
                    fileName,
                    lineNumber: index + 1,
                    languageKind,
                    parameters,
                    returns: isNextRouteHandler ? "HTTP response" : extractReturnType(signature, languageKind),
                    method: isNextRouteHandler ? methodName : null,
                    path: nextRoutePath,
                })
            );
        }

        const routeMatch = getJavaScriptRouteMatch(lines, index, languageKind);
        if (routeMatch) {
            items.push(
                createDocumentationItem({
                    kind: "api",
                    name: `${routeMatch.method} ${routeMatch.path}`,
                    signature: `${routeMatch.method} ${routeMatch.path}`,
                    description: getLeadingComment(lines, index, languageKind),
                    fileName,
                    lineNumber: index + 1,
                    languageKind,
                    returns: "HTTP response",
                    method: routeMatch.method,
                    path: routeMatch.path,
                })
            );
        }
    });

    return items;
};

const getPendingPythonApi = (line) => {
    const directMethod = line.match(
        /^\s*@(?:\w+\.)?(get|post|put|patch|delete|options|head)\(\s*["']([^"']+)["']/i
    );
    if (directMethod) {
        return {
            method: directMethod[1].toUpperCase(),
            path: directMethod[2],
        };
    }

    const route = line.match(/^\s*@(?:\w+\.)?route\(\s*["']([^"']+)["'](.*)\)/i);
    if (route) {
        const methods = route[2]
            .match(/methods\s*=\s*\[([^\]]+)\]/i)?.[1]
            ?.split(",")
            .map((method) => method.replace(/["'\s]/g, "").toUpperCase())
            .filter(Boolean);

        return {
            method: methods?.join(", ") || "GET",
            path: route[1],
        };
    }

    return null;
};

const extractPythonItems = (lines, source) => {
    const fileName = getSourceName(source);
    const languageKind = "python";
    const items = [];
    let pendingApi = null;

    lines.forEach((line, index) => {
        const apiDecorator = getPendingPythonApi(line);
        if (apiDecorator) {
            pendingApi = apiDecorator;
            return;
        }

        const classMatch = line.match(/^\s*class\s+([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?:/);
        if (classMatch) {
            const name = classMatch[1];
            items.push(
                createDocumentationItem({
                    kind: "class",
                    name,
                    signature: collectDeclaration(lines, index, languageKind),
                    description:
                        getPythonDocstring(lines, index) || getLeadingComment(lines, index, languageKind),
                    fileName,
                    lineNumber: index + 1,
                    languageKind,
                })
            );
            pendingApi = null;
            return;
        }

        const functionMatch = line.match(
            /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\((.*)\)\s*(?:->\s*([^:]+))?:/
        );
        if (!functionMatch) return;

        const signature = collectDeclaration(lines, index, languageKind);
        const parameters = parseParameters(functionMatch[2], languageKind);
        const description =
            getPythonDocstring(lines, index) || getLeadingComment(lines, index, languageKind);

        items.push(
            createDocumentationItem({
                kind: pendingApi ? "api" : "function",
                name: pendingApi ? `${pendingApi.method} ${pendingApi.path}` : functionMatch[1],
                signature: pendingApi ? `${pendingApi.method} ${pendingApi.path}` : signature,
                description,
                fileName,
                lineNumber: index + 1,
                languageKind,
                parameters,
                returns: pendingApi ? "HTTP response" : functionMatch[3]?.trim() || null,
                method: pendingApi?.method || null,
                path: pendingApi?.path || null,
            })
        );
        pendingApi = null;
    });

    return items;
};

const getPendingJavaApi = (line) => {
    const mappingMatch = line.match(/^@(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping|RequestMapping)(?:\((.*)\))?/);
    if (!mappingMatch) return null;

    const methodMap = {
        DeleteMapping: "DELETE",
        GetMapping: "GET",
        PatchMapping: "PATCH",
        PostMapping: "POST",
        PutMapping: "PUT",
    };
    const annotation = mappingMatch[1];
    const argumentsText = mappingMatch[2] || "";
    const explicitMethod = argumentsText.match(/RequestMethod\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)/i);
    const pathMatch = argumentsText.match(/(?:path|value)\s*=\s*["']([^"']+)["']|["']([^"']+)["']/);

    return {
        method: methodMap[annotation] || explicitMethod?.[1]?.toUpperCase() || "HTTP",
        path: pathMatch?.[1] || pathMatch?.[2] || "/",
    };
};

const extractJavaItems = (lines, source) => {
    const fileName = getSourceName(source);
    const languageKind = "java";
    const items = [];
    let pendingApi = null;

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        const apiAnnotation = getPendingJavaApi(trimmed);
        if (apiAnnotation) {
            pendingApi = apiAnnotation;
            return;
        }

        const classMatch = trimmed.match(/^(?:public\s+|private\s+|protected\s+|abstract\s+|final\s+)*class\s+([A-Za-z_]\w*)/);
        if (classMatch) {
            items.push(
                createDocumentationItem({
                    kind: "class",
                    name: classMatch[1],
                    signature: collectDeclaration(lines, index, languageKind),
                    description: getLeadingComment(lines, index, languageKind),
                    fileName,
                    lineNumber: index + 1,
                    languageKind,
                })
            );
            pendingApi = null;
            return;
        }

        const methodMatch = trimmed.match(
            /^(?:public|private|protected|static|final|synchronized|abstract|\s)+\s*([\w<>\[\].?,\s]+)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/
        );
        if (!methodMatch || ["if", "for", "while", "switch", "catch"].includes(methodMatch[2])) return;

        const signature = collectDeclaration(lines, index, languageKind);
        const parameters = parseParameters(methodMatch[3], languageKind);
        items.push(
            createDocumentationItem({
                kind: pendingApi ? "api" : "function",
                name: pendingApi ? `${pendingApi.method} ${pendingApi.path}` : methodMatch[2],
                signature: pendingApi ? `${pendingApi.method} ${pendingApi.path}` : signature,
                description: getLeadingComment(lines, index, languageKind),
                fileName,
                lineNumber: index + 1,
                languageKind,
                parameters,
                returns: pendingApi ? "HTTP response" : methodMatch[1].trim(),
                method: pendingApi?.method || null,
                path: pendingApi?.path || null,
            })
        );
        pendingApi = null;
    });

    return items;
};

const extractGoItems = (lines, source) => {
    const fileName = getSourceName(source);
    const languageKind = "go";
    const items = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        const functionMatch = trimmed.match(/^func\s+(?:\([^)]+\)\s*)?([A-Za-z_]\w*)\s*\(([^)]*)\)\s*([^{]*)/);
        if (functionMatch) {
            const signature = collectDeclaration(lines, index, languageKind);
            const parameters = parseParameters(functionMatch[2], languageKind);
            items.push(
                createDocumentationItem({
                    kind: "function",
                    name: functionMatch[1],
                    signature,
                    description: getLeadingComment(lines, index, languageKind),
                    fileName,
                    lineNumber: index + 1,
                    languageKind,
                    parameters,
                    returns: functionMatch[3]?.trim() || null,
                })
            );
        }

        const handleMatch = trimmed.match(/\bhttp\.HandleFunc\(\s*"([^"]+)"/);
        if (handleMatch) {
            items.push(
                createDocumentationItem({
                    kind: "api",
                    name: `HTTP ${handleMatch[1]}`,
                    signature: `HTTP ${handleMatch[1]}`,
                    description: getLeadingComment(lines, index, languageKind),
                    fileName,
                    lineNumber: index + 1,
                    languageKind,
                    returns: "HTTP response",
                    method: "HTTP",
                    path: handleMatch[1],
                })
            );
        }
    });

    return items;
};

const uniqueItems = (items) => {
    const seen = new Set();
    return items.filter((item) => {
        const key = `${item.kind}:${item.name}:${item.lineNumber}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const buildSummary = (counts) => {
    const parts = [
        counts.functions > 0 ? `${counts.functions} function${counts.functions === 1 ? "" : "s"}` : null,
        counts.classes > 0 ? `${counts.classes} class${counts.classes === 1 ? "" : "es"}` : null,
        counts.apis > 0 ? `${counts.apis} API${counts.apis === 1 ? "" : "s"}` : null,
    ].filter(Boolean);

    if (parts.length === 0) return "No documentable functions, classes, or APIs were detected.";
    return `Generated documentation for ${parts.join(", ")}.`;
};

export const generateSourceDocumentation = (source) => {
    const languageKind = getLanguageKind(source);
    const lines = splitSourceLines(source.content || "");
    let items = [];

    if (languageKind === "javascript" || languageKind === "typescript") {
        items = extractJavaScriptItems(lines, source, languageKind);
    } else if (languageKind === "python") {
        items = extractPythonItems(lines, source);
    } else if (languageKind === "java") {
        items = extractJavaItems(lines, source);
    } else if (languageKind === "go") {
        items = extractGoItems(lines, source);
    }

    const normalizedItems = uniqueItems(items)
        .sort((left, right) => left.lineNumber - right.lineNumber)
        .slice(0, MAX_DOCUMENTED_ITEMS_PER_SOURCE);
    const counts = normalizedItems.reduce(
        (total, item) => ({
            functions: total.functions + (item.kind === "function" ? 1 : 0),
            classes: total.classes + (item.kind === "class" ? 1 : 0),
            apis: total.apis + (item.kind === "api" ? 1 : 0),
        }),
        { functions: 0, classes: 0, apis: 0 }
    );

    return {
        generatedAt: new Date().toISOString(),
        language: languageKind,
        summary: buildSummary(counts),
        counts,
        items: normalizedItems,
    };
};
