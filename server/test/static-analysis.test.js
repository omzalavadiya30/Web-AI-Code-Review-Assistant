import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSources } from "../src/services/static-analysis.service.js";

test("static analysis reports code smells for unsupported source types", async () => {
    const result = await analyzeSources([
        {
            id: "source-1",
            title: "notes.md",
            file_name: "notes.md",
            language: "Markdown",
            content: `TODO: turn this reminder into tracked work\n${"x".repeat(121)}`,
        },
    ]);

    assert.equal(result.tools.length, 1);
    assert.equal(result.tools[0], "CodeSmell");
    assert.equal(result.findings.length, 2);
    assert.equal(result.overallScore, 94);
    assert.match(result.summary, /2 static findings across 1 source/);
    assert.ok(
        result.findings.some((finding) => finding.issue.includes("todo-marker")),
        "expected TODO marker finding"
    );
    assert.ok(
        result.findings.some((finding) => finding.issue.includes("long-line")),
        "expected long line finding"
    );
    assert.ok(
        result.notes.some((note) => note.includes("No static analyzer is configured")),
        "expected unsupported analyzer note"
    );
});

test("static analysis returns a clean score when no findings are present", async () => {
    const result = await analyzeSources([
        {
            id: "source-2",
            title: "readme.md",
            file_name: "readme.md",
            language: "Markdown",
            content: "A short project note with no obvious code smells.",
        },
    ]);

    assert.deepEqual(result.findings, []);
    assert.equal(result.overallScore, 100);
    assert.match(result.summary, /0 static findings across 1 source/);
});
