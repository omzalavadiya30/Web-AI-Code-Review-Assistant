"use client";

import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-xl border border-white/10 bg-[#0d0d14] text-sm text-zinc-500">
      Loading editor...
    </div>
  ),
});

type CodeSnippetEditorProps = {
  id: string;
  value: string;
  language: string;
  fileName?: string;
  onChange: (value: string) => void;
};

const languageModeMap: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  go: "go",
  other: "plaintext",
};

const extensionModeMap: Record<string, string> = {
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
  json: "json",
  html: "html",
  css: "css",
  sql: "sql",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
};

const getEditorLanguage = (language: string, fileName?: string) => {
  const extension = fileName?.split(".").pop()?.toLowerCase();
  if (extension && extensionModeMap[extension]) return extensionModeMap[extension];

  return languageModeMap[language.trim().toLowerCase()] || "plaintext";
};

const handleEditorMount: OnMount = (editor, monaco) => {
  monaco.editor.defineTheme("labmentix-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0d0d14",
      "editor.foreground": "#e4e4e7",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorLineNumber.foreground": "#52525b",
      "editorLineNumber.activeForeground": "#a5b4fc",
      "editorCursor.foreground": "#67e8f9",
      "editor.selectionBackground": "#4f46e566",
      "editor.inactiveSelectionBackground": "#4f46e533",
      "editorIndentGuide.background1": "#27272a",
      "editorIndentGuide.activeBackground1": "#6366f1",
    },
  });
  monaco.editor.setTheme("labmentix-dark");
  editor.focus();
};

export function CodeSnippetEditor({
  id,
  value,
  language,
  fileName,
  onChange,
}: CodeSnippetEditorProps) {
  const editorLanguage = getEditorLanguage(language, fileName);
  const lineCount = value.length === 0 ? 0 : value.split(/\r\n|\r|\n/).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-medium text-zinc-300">
          Code Snippet
        </label>
        <span className="text-xs text-zinc-500">
          {editorLanguage} / {lineCount} line{lineCount === 1 ? "" : "s"}
        </span>
      </div>

      <div
        id={id}
        className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d14] ring-1 ring-transparent transition-colors focus-within:ring-indigo-500/25"
      >
        <MonacoEditor
          height="24rem"
          language={editorLanguage}
          path={fileName?.trim() || `snippet.${editorLanguage}`}
          theme="labmentix-dark"
          value={value}
          onChange={(nextValue) => onChange(nextValue || "")}
          onMount={handleEditorMount}
          options={{
            automaticLayout: true,
            fontFamily:
              "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 14,
            minimap: { enabled: false },
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: "line",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            tabSize: 2,
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}
