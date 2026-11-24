import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { connectTestDb, disconnectTestDb, jsonRequest, startTestServer } from "./helpers/testApp.js";

describe("auth rate limiting", () => {
    let testServer;

    before(async () => {
        await connectTestDb("campusgigs_test_ratelimit");
        testServer = await startTestServer();
    });

    after(async () => {
        await testServer?.close();
        await disconnectTestDb();
    });

    it("blocks authentication attempts after the window limit", async () => {
        const attempt = () => jsonRequest(testServer.baseUrl, "/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email: "nobody@example.test", password: "wrong-password" })
        });

        for (let index = 0; index < 20; index += 1) {
            const response = await attempt();
            assert.equal(response.status, 401, `attempt ${index + 1} should be a plain auth failure`);
        }

        const blocked = await attempt();
        assert.equal(blocked.status, 429);
        assert.match(blocked.body.message, /Too many authentication attempts/);
    });
});
