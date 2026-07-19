import test from "node:test";
import assert from "node:assert/strict";
import { AppError, errorMiddleware, notFound, successResponse } from "../src/utils/apiHandler.js";

const createResponse = () => {
    const response = {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.payload = payload;
            return this;
        },
    };

    return response;
};

test("successResponse sends the standard success envelope", () => {
    const res = createResponse();

    successResponse(res, 201, "Created", { id: "review-1" });

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.payload, {
        success: true,
        message: "Created",
        data: { id: "review-1" },
    });
});

test("notFound forwards an operational 404 AppError", () => {
    const req = { originalUrl: "/api/missing" };
    let forwardedError = null;

    notFound(req, createResponse(), (error) => {
        forwardedError = error;
    });

    assert.ok(forwardedError instanceof AppError);
    assert.equal(forwardedError.statusCode, 404);
    assert.equal(forwardedError.message, "Route /api/missing not found");
});

test("errorMiddleware preserves operational error messages", () => {
    const res = createResponse();

    errorMiddleware(new AppError("Project not found", 404), {}, res, () => {});

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.payload, {
        success: false,
        message: "Project not found",
    });
});

test("errorMiddleware maps malformed JSON to a client error", () => {
    const res = createResponse();
    const error = Object.assign(new SyntaxError("Unexpected token }"), {
        type: "entity.parse.failed",
        status: 400,
    });

    errorMiddleware(error, {}, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.payload, {
        success: false,
        message: "Malformed JSON request body",
    });
});

test("errorMiddleware hides unexpected server error messages", () => {
    const res = createResponse();

    errorMiddleware(new Error("database password leaked in stack"), {}, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.equal(res.payload.success, false);
    assert.equal(res.payload.message, "Internal Server Error");
});
