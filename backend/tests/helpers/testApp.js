import { once } from "node:events";
import mongoose from "mongoose";

const DEFAULT_TEST_URI = "mongodb://127.0.0.1:27017";
const TEST_DB_PATTERN = /^campusgigs_test_[a-z0-9_]+$/;

function resolveTestUri() {
    const uri = process.env.TEST_MONGO_URI || DEFAULT_TEST_URI;

    if (/^mongodb\+srv:/i.test(uri) || /\.mongodb\.net/i.test(uri)) {
        throw new Error(
            "Refusing to run tests against a shared/Atlas MongoDB cluster. " +
            "Set TEST_MONGO_URI to a local test MongoDB instance."
        );
    }

    return uri;
}

function prepareTestEnv() {
    process.env.NODE_ENV = "test";
    process.env.MONGO_URI ||= resolveTestUri();
    process.env.JWT_SECRET ||= "campusgigs-test-secret-at-least-32-characters";
    process.env.CORS_ORIGINS ||= "http://localhost:5173";
    process.env.LOG_LEVEL ||= "error";
}

prepareTestEnv();

export const app = (await import("../../app.js")).default;

export async function connectTestDb(dbName) {
    if (!TEST_DB_PATTERN.test(dbName)) {
        throw new Error(
            `Test database name "${dbName}" is not allowed. Use campusgigs_test_<suffix>.`
        );
    }

    await mongoose.connect(resolveTestUri(), { dbName });
}

export async function disconnectTestDb() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
}

export async function startTestServer() {
    const server = app.listen(0);
    await once(server, "listening");
    const { port } = server.address();

    return {
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        })
    };
}

export function uniqueEmail(prefix) {
    return `${prefix}-${new mongoose.Types.ObjectId()}@example.test`;
}

export async function request(baseUrl, path, { token, ...options } = {}) {
    return fetch(baseUrl + path, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        }
    });
}
