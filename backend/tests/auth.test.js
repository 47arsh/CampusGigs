import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
    connectTestDb,
    disconnectTestDb,
    jsonRequest,
    startTestServer,
    uniqueEmail
} from "./helpers/testApp.js";

describe("auth tokens", () => {
    let testServer;
    let email;

    before(async () => {
        await connectTestDb("campusgigs_test_auth");
        testServer = await startTestServer();

        email = uniqueEmail("auth-user");
        const registration = await jsonRequest(testServer.baseUrl, "/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ name: "Auth User", email, password: "correct-horse" })
        });
        assert.equal(registration.status, 201);
    });

    after(async () => {
        await User.deleteMany({ email });
        await testServer?.close();
        await disconnectTestDb();
    });

    const login = async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password: "correct-horse" })
        });
        assert.equal(response.status, 200);
        return response.body.token;
    };

    it("returns the current user for a valid token", async () => {
        const token = await login();
        const response = await jsonRequest(testServer.baseUrl, "/api/auth/me", { token });

        assert.equal(response.status, 200);
        assert.equal(response.body.user.email, email);
        assert.equal(response.body.user.password, undefined);
    });

    it("rejects requests without a token", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/auth/me");

        assert.equal(response.status, 401);
    });

    it("rejects a token signed with a different secret", async () => {
        const forged = jwt.sign(
            { userId: "0123456789abcdef01234567" },
            "not-the-real-secret-at-all",
            { algorithm: "HS256" }
        );
        const response = await jsonRequest(testServer.baseUrl, "/api/auth/me", { token: forged });

        assert.equal(response.status, 401);
    });

    it("rejects a token whose subject is not an ObjectId", async () => {
        const malformed = jwt.sign({ userId: "definitely-not-an-id" }, process.env.JWT_SECRET, {
            algorithm: "HS256"
        });
        const response = await jsonRequest(testServer.baseUrl, "/api/auth/me", { token: malformed });

        assert.equal(response.status, 401);
    });

    it("reports duplicate registration as a conflict", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ name: "Auth User", email, password: "correct-horse" })
        });

        assert.equal(response.status, 409);
        assert.equal(response.body.message, "User already exists");
    });

    it("treats case-variant emails as duplicates", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                name: "Auth User",
                email: email.toUpperCase(),
                password: "correct-horse"
            })
        });

        assert.equal(response.status, 409);
    });
});
