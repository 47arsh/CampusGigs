import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { connectTestDb, disconnectTestDb, jsonRequest, startTestServer } from "./helpers/testApp.js";

describe("request validation", () => {
    let testServer;

    before(async () => {
        await connectTestDb("campusgigs_test_validation");
        testServer = await startTestServer();
    });

    after(async () => {
        await testServer?.close();
        await disconnectTestDb();
    });

    it("rejects a non-numeric page with 400", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/tasks?page=abc");

        assert.equal(response.status, 400);
        assert.equal(response.body.message, "Validation failed");
    });

    it("rejects a limit above 50 with 400", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/tasks?limit=51");

        assert.equal(response.status, 400);
    });

    it("applies validated defaults when no query is provided", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/tasks");

        assert.equal(response.status, 200);
        assert.equal(response.body.pagination.page, 1);
        assert.equal(response.body.pagination.limit, 10);
    });

    it("validates the register body", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ name: "a", email: "not-an-email", password: "123" }),
        });

        assert.equal(response.status, 400);
        assert.equal(response.body.message, "Validation failed");
        assert.ok(response.body.errors.length >= 3);
    });

    it("requires authentication for the AI chat endpoint", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/ai/chat", {
            method: "POST",
            body: JSON.stringify({ message: "How do I cancel a task?" }),
        });

        assert.equal(response.status, 401);
    });

    it("rejects an oversized AI chat message", async () => {
        const token = jwt.sign({ userId: "0123456789abcdef01234567" }, process.env.JWT_SECRET);
        const response = await jsonRequest(testServer.baseUrl, "/api/ai/chat", {
            method: "POST",
            token,
            body: JSON.stringify({ message: "a".repeat(2001) }),
        });

        assert.equal(response.status, 400);
        assert.equal(response.body.message, "Validation failed");
    });
});
