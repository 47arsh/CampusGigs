import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import "./helpers/testApp.js";
import { authenticateSocket, disconnectWhenTokenExpires } from "../middleware/socketAuth.js";

const USER_ID = "0123456789abcdef01234567";
const sign = (payload, secret = process.env.JWT_SECRET, options = { expiresIn: "1h" }) =>
    jwt.sign(payload, secret, options);

const fakeSocket = (token) => ({
    handshake: { auth: token === undefined ? {} : { token } },
    user: undefined,
    disconnected: false,
    disconnectCalls: [],
    listeners: new Map(),
    disconnect() {
        this.disconnected = true;
        this.disconnectCalls.push(true);
    },
    once(event, handler) {
        this.listeners.set(event, handler);
    }
});

const runMiddleware = (socket) => {
    let outcome = "not-called";
    authenticateSocket(socket, (error) => {
        outcome = error ? error.message : "ok";
    });
    return outcome;
};

describe("socket authentication", () => {
    it("accepts a valid HS256 token and exposes the user", () => {
        const socket = fakeSocket(sign({ userId: USER_ID }));

        assert.equal(runMiddleware(socket), "ok");
        assert.equal(socket.user.userId, USER_ID);
    });

    it("accepts a Bearer-prefixed token", () => {
        const socket = fakeSocket("Bearer " + sign({ userId: USER_ID }));

        assert.equal(runMiddleware(socket), "ok");
    });

    it("rejects a missing token", () => {
        assert.equal(runMiddleware(fakeSocket(undefined)), "Authentication failed");
    });

    it("rejects an expired token", () => {
        const expired = sign({ userId: USER_ID }, process.env.JWT_SECRET, { expiresIn: -60 });

        assert.equal(runMiddleware(fakeSocket(expired)), "Authentication failed");
    });

    it("rejects a token without an expiry claim", () => {
        const socket = fakeSocket(sign({ userId: USER_ID }, process.env.JWT_SECRET, {}));

        assert.equal(runMiddleware(socket), "Authentication failed");
    });

    it("rejects a token signed with a different algorithm", () => {
        const token = sign({ userId: USER_ID }, process.env.JWT_SECRET, { algorithm: "HS512" });

        assert.equal(runMiddleware(fakeSocket(token)), "Authentication failed");
    });

    it("rejects a malformed user id claim", () => {
        const token = sign({ userId: "not-an-object-id" });

        assert.equal(runMiddleware(fakeSocket(token)), "Authentication failed");
    });
});

describe("socket token expiry", () => {
    it("disconnects the socket when the token lifetime ends", (t) => {
        t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.now() });

        const expiresAt = Math.floor(Date.now() / 1000) + 60;
        const socket = fakeSocket(jwt.sign({ userId: USER_ID, exp: expiresAt }, process.env.JWT_SECRET, {}));
        assert.equal(runMiddleware(socket), "ok");

        disconnectWhenTokenExpires(socket);
        assert.equal(socket.disconnected, false);

        t.mock.timers.tick(61_000);
        assert.equal(socket.disconnected, true);
        t.mock.timers.reset();
    });

    it("disconnects immediately when the expiry has already passed", () => {
        const socket = fakeSocket("unused");
        socket.user = { exp: Math.floor(Date.now() / 1000) - 1 };

        disconnectWhenTokenExpires(socket);

        assert.equal(socket.disconnected, true);
    });
});
