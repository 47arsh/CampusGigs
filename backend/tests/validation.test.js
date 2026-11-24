import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
    connectTestDb,
    disconnectTestDb,
    jsonRequest,
    request,
    startTestServer,
    uniqueEmail
} from "./helpers/testApp.js";

describe("request validation", () => {
    let testServer;
    let registeredEmail;

    before(async () => {
        await connectTestDb("campusgigs_test_validation");
        testServer = await startTestServer();
    });

    after(async () => {
        if (registeredEmail) {
            await User.deleteMany({ email: registeredEmail });
        }
        await testServer?.close();
        await disconnectTestDb();
    });

    it("reports healthy status without authentication", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/health");

        assert.equal(response.status, 200);
        assert.deepEqual(response.body, { status: "ok" });
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

    it("rejects an invalid notification id", async () => {
        const token = jwt.sign({ userId: "0123456789abcdef01234567" }, process.env.JWT_SECRET);
        const response = await jsonRequest(testServer.baseUrl, "/api/notifications/not-an-id/read", {
            method: "PATCH",
            token,
        });

        assert.equal(response.status, 400);
        assert.equal(response.body.message, "Validation failed");
    });

    it("rejects request bodies above the size limit", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email: "user@example.test", password: "x".repeat(40_000) }),
        });

        assert.equal(response.status, 413);
        assert.equal(response.body.message, "Request payload is too large");
    });

    it("returns 400 for malformed JSON instead of 500", async () => {
        const response = await request(testServer.baseUrl, "/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{not-json",
        });
        const body = await response.json();

        assert.equal(response.status, 400);
        assert.equal(body.message, "Invalid JSON payload");
    });

    it("registers, then logs in, with validated payloads", async () => {
        registeredEmail = uniqueEmail("validation-user");
        const password = "correct-horse";

        const registration = await jsonRequest(testServer.baseUrl, "/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ name: "Validation User", email: registeredEmail, password }),
        });
        assert.equal(registration.status, 201);

        const login = await jsonRequest(testServer.baseUrl, "/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email: registeredEmail, password }),
        });
        assert.equal(login.status, 200);
        assert.equal(typeof login.body.token, "string");
    });
});
