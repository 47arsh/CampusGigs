import { describe, it } from "node:test";
import assert from "node:assert/strict";
import "./helpers/testApp.js";
import { buildEnv } from "../config/env.js";

const base = {
    MONGO_URI: "mongodb://127.0.0.1:27017/campusgigs_test_env",
    JWT_SECRET: "a".repeat(32),
    CORS_ORIGINS: "http://localhost:5173"
};

describe("environment validation", () => {
    it("allows production without the AI service", () => {
        const config = buildEnv({ ...base, NODE_ENV: "production" });

        assert.equal(config.isProduction, true);
        assert.equal(config.AI_SERVICE_TOKEN, undefined);
    });

    it("allows production when AI url and token are set together", () => {
        const config = buildEnv({
            ...base,
            NODE_ENV: "production",
            AI_SERVICE_URL: "http://ai.internal:8000",
            AI_SERVICE_TOKEN: "shared-secret"
        });

        assert.equal(config.AI_SERVICE_TOKEN, "shared-secret");
    });

    it("rejects production AI url without a token", () => {
        assert.throws(
            () => buildEnv({
                ...base,
                NODE_ENV: "production",
                AI_SERVICE_URL: "http://ai.internal:8000"
            }),
            /AI_SERVICE_TOKEN is required/
        );
    });

    it("rejects a production token without an AI url", () => {
        assert.throws(
            () => buildEnv({
                ...base,
                NODE_ENV: "production",
                AI_SERVICE_TOKEN: "shared-secret"
            }),
            /AI_SERVICE_URL is required/
        );
    });

    it("rejects a production JWT secret shorter than 32 characters", () => {
        assert.throws(
            () => buildEnv({ ...base, NODE_ENV: "production", JWT_SECRET: "too-short" }),
            /at least 32 characters in production/
        );
    });

    it("keeps short secrets usable outside production", () => {
        const config = buildEnv({ ...base, NODE_ENV: "development", JWT_SECRET: "short" });

        assert.equal(config.JWT_SECRET, "short");
    });

    it("rejects an empty CORS origin list", () => {
        assert.throws(
            () => buildEnv({ ...base, CORS_ORIGINS: " , " }),
            /CORS_ORIGINS must include at least one origin/
        );
    });

    it("treats empty optional variables as unset", () => {
        const config = buildEnv({
            ...base,
            AI_SERVICE_URL: "",
            AI_SERVICE_TOKEN: "",
            LOG_LEVEL: "",
            TRUST_PROXY: "",
            CORS_ORIGINS: ""
        });

        assert.equal(config.AI_SERVICE_TOKEN, undefined);
        assert.equal(config.AI_SERVICE_URL, undefined);
        assert.equal(config.LOG_LEVEL, undefined);
        assert.equal(config.TRUST_PROXY, undefined);
        assert.deepEqual(config.corsOrigins, ["http://localhost:5173"]);
    });

    it("parses TRUST_PROXY hop counts and booleans", () => {
        assert.equal(buildEnv({ ...base, TRUST_PROXY: "true" }).TRUST_PROXY, 1);
        assert.equal(buildEnv({ ...base, TRUST_PROXY: "false" }).TRUST_PROXY, false);
        assert.equal(buildEnv({ ...base, TRUST_PROXY: "2" }).TRUST_PROXY, 2);
    });
});
