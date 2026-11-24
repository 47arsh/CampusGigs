import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
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
});
