import test from "node:test";
import assert from "node:assert/strict";
import { registerValidation, changePasswordValidation } from "../src/validations/auth.validation.js";
import { createProjectValidation } from "../src/validations/project.validation.js";
import {
    createFileReviewValidation,
    createSnippetReviewValidation,
} from "../src/validations/review.validation.js";
import { runValidation } from "./helpers/run-validation.js";

test("snippet review validation returns sanitized field errors", async () => {
    const result = await runValidation(createSnippetReviewValidation, {
        title: "  A ",
        code: "   ",
        focusAreas: ["Security"],
    });

    assert.equal(result.statusCode, 400);
    assert.equal(result.response.success, false);
    assert.equal(result.response.message, "Validation failed");
    assert.deepEqual(
        result.response.errors.map((error) => error.path),
        ["title", "code"]
    );
    assert.ok(result.response.errors.every((error) => !("value" in error)));
});

test("file review validation rejects oversized total uploads", async () => {
    const result = await runValidation(createFileReviewValidation, {
        title: "Upload review",
        focusAreas: [],
        files: [
            {
                fileName: "large-a.js",
                content: "a".repeat(125001),
            },
            {
                fileName: "large-b.js",
                content: "b".repeat(125001),
            },
        ],
    });

    assert.equal(result.statusCode, 400);
    assert.ok(
        result.response.errors.some(
            (error) =>
                error.path === "files" &&
                error.msg.includes("250000 characters or fewer in total")
        )
    );
});

test("auth validation normalizes email and rejects weak profile data", async () => {
    const result = await runValidation(registerValidation, {
        name: "12345",
        email: "USER@Example.COM",
        password: "short",
    });

    assert.equal(result.statusCode, 400);
    assert.equal(result.body.email, "user@example.com");
    assert.deepEqual(
        result.response.errors.map((error) => error.path),
        ["name", "password"]
    );
});

test("change password validation prevents reusing the current password", async () => {
    const result = await runValidation(changePasswordValidation, {
        currentPassword: "same-password",
        newPassword: "same-password",
    });

    assert.equal(result.statusCode, 400);
    assert.deepEqual(result.response.errors, [
        {
            msg: "New password must be different from current password",
            path: "newPassword",
        },
    ]);
});

test("project validation accepts optional https GitHub URLs", async () => {
    const result = await runValidation(createProjectValidation, {
        projectName: "Code Review Assistant",
        githubUrl: "https://github.com/example/repo",
    });

    assert.equal(result.stopped, false);
    assert.equal(result.statusCode, 200);
    assert.equal(result.response, null);
});

test("project validation rejects malformed GitHub URLs", async () => {
    const result = await runValidation(createProjectValidation, {
        projectName: "Code Review Assistant",
        githubUrl: "github.com/example/repo",
    });

    assert.equal(result.statusCode, 400);
    assert.deepEqual(result.response.errors, [
        {
            msg: "GitHub URL must be a valid http or https URL",
            path: "githubUrl",
        },
    ]);
});
