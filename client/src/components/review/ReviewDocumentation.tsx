"use client";

import { useState } from "react";
import { Box, Braces, ChevronDown, ChevronUp, FileCode2, Globe2 } from "lucide-react";
import type { ReviewDocumentationItem, ReviewSource } from "@/types/review";

type DocumentationEntry = ReviewDocumentationItem & {
  sourceId: string;
  sourceTitle: string;
};

type ReviewDocumentationProps = {
  sources: ReviewSource[];
  limit?: number;
  showEmpty?: boolean;
  title?: string;
};

const kindStyles: Record<ReviewDocumentationItem["kind"], string> = {
  function: "bg-cyan-500/10 text-cyan-200 ring-cyan-500/20",
  class: "bg-indigo-500/10 text-indigo-200 ring-indigo-500/20",
  api: "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20",
};

const kindIcons = {
  function: Braces,
  class: Box,
  api: Globe2,
};

export const getDocumentationItems = (sources: ReviewSource[] = []) =>
  sources.flatMap((source) =>
    (source.metadata?.documentation?.items || []).map((item) => ({
      ...item,
      parameters: item.parameters || [],
      sourceId: source.id,
      sourceTitle: source.file_name || source.title,
    }))
  );

const formatParameters = (item: ReviewDocumentationItem) => {
  const parameters = item.parameters || [];
  if (parameters.length === 0) return "No parameters";

  return parameters
    .map((parameter) => {
      const type = parameter.type ? `: ${parameter.type}` : "";
      const defaultValue = parameter.defaultValue ? ` = ${parameter.defaultValue}` : "";
      return `${parameter.name}${type}${defaultValue}`;
    })
    .join(", ");
};

export function ReviewDocumentation({
  sources,
  limit = 6,
  showEmpty = false,
  title = "Generated documentation",
}: ReviewDocumentationProps) {
  const documentationItems = getDocumentationItems(sources);
  const [isExpanded, setIsExpanded] = useState(false);

  if (documentationItems.length === 0) {
    if (!showEmpty) return null;

    return (
      <div className="rounded-xl bg-white/5 p-4 text-sm text-zinc-400 ring-1 ring-white/10">
        No generated documentation is available for this review yet.
      </div>
    );
  }

  const visibleLimit = Math.max(0, limit);
  const hasHiddenItems = documentationItems.length > visibleLimit;
  const visibleItems = isExpanded ? documentationItems : documentationItems.slice(0, visibleLimit);
  const hiddenCount = documentationItems.length - visibleLimit;
  const counts = documentationItems.reduce(
    (total, item) => ({
      functions: total.functions + (item.kind === "function" ? 1 : 0),
      classes: total.classes + (item.kind === "class" ? 1 : 0),
      apis: total.apis + (item.kind === "api" ? 1 : 0),
    }),
    { functions: 0, classes: 0, apis: 0 }
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-300">{title}</p>
          <h2 className="mt-1 text-lg font-semibold">
            {documentationItems.length} documented item
            {documentationItems.length === 1 ? "" : "s"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-cyan-200 ring-1 ring-cyan-500/20">
            Functions {counts.functions}
          </span>
          <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-indigo-200 ring-1 ring-indigo-500/20">
            Classes {counts.classes}
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-200 ring-1 ring-emerald-500/20">
            APIs {counts.apis}
          </span>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/3">
        {visibleItems.map((item: DocumentationEntry) => {
          const Icon = kindIcons[item.kind];

          return (
            <li key={`${item.sourceId}-${item.kind}-${item.name}-${item.lineNumber}`} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ${kindStyles[item.kind]}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.kind}
                    </span>
                    <span className="truncate text-xs text-zinc-500">
                      {item.sourceTitle}
                      {item.lineNumber ? `:${item.lineNumber}` : ""}
                    </span>
                  </div>
                  <h3 className="mt-3 truncate font-semibold text-zinc-100">{item.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.description}</p>
                </div>
                <FileCode2 className="hidden h-5 w-5 shrink-0 text-zinc-600 sm:block" />
              </div>

              <pre className="mt-3 overflow-x-auto rounded-lg bg-black/20 p-3 text-xs text-zinc-300">
                <code>{item.signature}</code>
              </pre>

              <div className="mt-3 grid gap-2 text-xs text-zinc-500 md:grid-cols-2">
                <p className="truncate">
                  <span className="font-medium text-zinc-400">Params:</span>{" "}
                  {formatParameters(item)}
                </p>
                <p className="truncate">
                  <span className="font-medium text-zinc-400">Returns:</span>{" "}
                  {item.returns || "Not specified"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {hasHiddenItems && (
        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={isExpanded}
          className="mt-3 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-indigo-300 transition-colors hover:bg-white/5 hover:text-indigo-200"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show fewer
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show {hiddenCount} more documented item{hiddenCount === 1 ? "" : "s"}
            </>
          )}
        </button>
      )}
    </div>
  );
}
