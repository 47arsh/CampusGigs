import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { io } from "socket.io-client";
import jwt from "jsonwebtoken";

// Staging-style end-to-end check. It boots the real server entrypoint against a
// throwaway local database, exercises the full task lifecycle over HTTP and
// Socket.IO, and drops the database afterwards.
// Never point this at a shared or production database.

const PORT = Number(process.env.E2E_PORT || 3105);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const MONGO_BASE = process.env.E2E_MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_PREFIX = "campusgigs_e2e_staging_";
const DB_NAME = `${DB_PREFIX}${Date.now().toString(36)}`;
const JWT_SECRET = "e2e-staging-run-secret-not-used-in-production";
const RUN_ID = Date.now().toString(36);

const results = [];
let serverProcess;

function check(name, condition, detail = "") {
    results.push({ name, ok: Boolean(condition), detail });
    const mark = condition ? "PASS" : "FAIL";
    console.log(`  [${mark}] ${name}${condition || !detail ? "" : ` — ${detail}`}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, { token, ...options } = {}) {
    const response = await fetch(BASE_URL + path, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
}

const json = (value) => JSON.stringify(value);

async function waitForServer() {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${BASE_URL}/health`);
            if (response.ok) return;
        } catch {
            // server not up yet
        }
        await sleep(200);
    }
    throw new Error("Server did not become healthy within 30s");
}

function connectSocket(token) {
    return new Promise((resolve) => {
        const socket = io(BASE_URL, {
            auth: token ? { token } : {},
            transports: ["websocket"],
            reconnection: false,
            timeout: 5_000,
        });
        const events = [];
        socket.on("notification:new", (notification) => events.push(notification));
        const timer = setTimeout(() => resolve({ socket, events, error: "connect timeout" }), 6_000);
        socket.on("connect", () => {
            clearTimeout(timer);
            resolve({ socket, events, error: null });
        });
        socket.on("connect_error", (error) => {
            clearTimeout(timer);
            resolve({ socket, events, error: error.message });
        });
    });
}

async function waitForEvent(events, predicate, timeoutMs = 5_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const match = events.find(predicate);
        if (match) return match;
        await sleep(50);
    }
    return null;
}

async function main() {
    serverProcess = spawn(process.execPath, ["server.js"], {
        cwd: fileURLToPath(new URL("..", import.meta.url)),
        env: {
            ...process.env,
            NODE_ENV: "development",
            PORT: String(PORT),
            MONGO_URI: `${MONGO_BASE}/${DB_NAME}`,
            JWT_SECRET,
            CORS_ORIGINS: "http://localhost:5173",
            AI_SERVICE_URL: "",
            AI_SERVICE_TOKEN: "",
            TRUST_PROXY: "false",
            LOG_LEVEL: "error",
        },
        stdio: ["ignore", "pipe", "pipe"],
    });

    let serverLog = "";
    serverProcess.stdout.on("data", (chunk) => { serverLog += chunk; });
    serverProcess.stderr.on("data", (chunk) => { serverLog += chunk; });
    serverProcess.on("exit", (code) => {
        if (code && code !== 0) serverLog += `\nserver exited with code ${code}`;
    });

    await waitForServer();
    console.log(`\nServer ready on ${BASE_URL} (db ${DB_NAME})\n`);

    const emailA = `e2e-a-${RUN_ID}@students.example.test`;
    const emailB = `e2e-b-${RUN_ID}@students.example.test`;
    const password = "staging-pass-123";

    // 1–2. Register both accounts.
    const registerA = await request("/api/auth/register", {
        method: "POST",
        body: json({ name: "E2E Owner", email: emailA, password }),
    });
    check("register account A", registerA.status === 201, `status ${registerA.status}`);
    const registerB = await request("/api/auth/register", {
        method: "POST",
        body: json({ name: "E2E Worker", email: emailB, password }),
    });
    check("register account B", registerB.status === 201, `status ${registerB.status}`);
    const userIdB = registerB.body.user._id;

    const duplicate = await request("/api/auth/register", {
        method: "POST",
        body: json({ name: "E2E Owner", email: emailA, password }),
    });
    check("duplicate registration is rejected with 409", duplicate.status === 409, `status ${duplicate.status}`);

    // 3. Log in as A.
    const loginA = await request("/api/auth/login", {
        method: "POST",
        body: json({ email: emailA, password }),
    });
    check("log in as account A", loginA.status === 200 && Boolean(loginA.body?.token), `status ${loginA.status}`);
    const tokenA = loginA.body.token;
    const userIdA = registerA.body.user._id;

    // 4. A creates a task.
    const createTask = await request("/api/tasks", {
        method: "POST",
        token: tokenA,
        body: json({
            title: `E2E staging task ${RUN_ID}`,
            description: "Pick up a parcel from the campus post office and deliver it.",
            reward: 150,
            pickupLocation: "Campus Post Office",
            dropLocation: "Hostel Block C",
        }),
    });
    check("account A creates a task", createTask.status === 201, `status ${createTask.status}`);
    const taskId = createTask.body?.task?._id;

    // 5–6. Connect A's socket, then log in as B and accept.
    const socketA = await connectSocket(tokenA);
    check("account A connects to Socket.IO", !socketA.error, socketA.error || "");

    const loginB = await request("/api/auth/login", {
        method: "POST",
        body: json({ email: emailB, password }),
    });
    check("log in as account B", loginB.status === 200 && Boolean(loginB.body?.token), `status ${loginB.status}`);
    const tokenB = loginB.body.token;

    const browse = await request("/api/tasks?status=open&limit=50");
    check(
        "browse lists the open task with pagination metadata",
        browse.status === 200 && browse.body.tasks.some((task) => task._id === taskId) && browse.body.pagination?.totalPages >= 1,
        `status ${browse.status}`,
    );

    const ownAccept = await request(`/api/tasks/${taskId}/accept`, { method: "PATCH", token: tokenA });
    check("creator cannot accept their own task", ownAccept.status >= 400 && ownAccept.status < 500, `status ${ownAccept.status}`);

    const accept = await request(`/api/tasks/${taskId}/accept`, { method: "PATCH", token: tokenB });
    check("account B accepts the task", accept.status === 200 && accept.body?.task?.status === "accepted", `status ${accept.status}`);

    // 7. A receives the acceptance notification in realtime.
    const acceptedEvent = await waitForEvent(socketA.events, (event) => event.type === "task_accepted");
    check(
        "account A receives the acceptance notification over Socket.IO",
        Boolean(acceptedEvent) && acceptedEvent.task === taskId,
        acceptedEvent ? "" : "no event received",
    );

    // 8. B sees the accepted task in "my gigs".
    const acceptedList = await request("/api/tasks/my/accepted?limit=100", { token: tokenB });
    check(
        "account B sees the accepted task in my gigs",
        acceptedList.status === 200 && acceptedList.body.tasks.some((task) => task._id === taskId && task.status === "accepted"),
        `status ${acceptedList.status}`,
    );

    // 9–10. B completes; A receives the completion notification.
    const complete = await request(`/api/tasks/${taskId}/complete`, { method: "PATCH", token: tokenB });
    check("account B completes the task", complete.status === 200 && complete.body?.task?.status === "completed", `status ${complete.status}`);

    const completedEvent = await waitForEvent(socketA.events, (event) => event.type === "task_completed");
    check(
        "account A receives the completion notification over Socket.IO",
        Boolean(completedEvent) && completedEvent.task === taskId,
        completedEvent ? "" : "no event received",
    );

    const repeatComplete = await request(`/api/tasks/${taskId}/complete`, { method: "PATCH", token: tokenB });
    check("completing twice is rejected", repeatComplete.status >= 400 && repeatComplete.status < 500, `status ${repeatComplete.status}`);

    // 11. Notifications persist and can be marked read across requests.
    const notifications = await request("/api/notifications", { token: tokenA });
    const persistedTypes = notifications.body?.notifications?.map((notification) => notification.type) || [];
    check(
        "acceptance and completion notifications persist for account A",
        notifications.status === 200 &&
            persistedTypes.includes("task_accepted") &&
            persistedTypes.includes("task_completed") &&
            notifications.body.notifications.every((notification) => notification.read === false),
        `status ${notifications.status}, types ${persistedTypes.join(",")}`,
    );

    const notificationId = notifications.body?.notifications?.[0]?._id;
    const markRead = await request(`/api/notifications/${notificationId}/read`, { method: "PATCH", token: tokenA });
    check("account A marks a notification as read", markRead.status === 200 && markRead.body?.notification?.read === true, `status ${markRead.status}`);

    const refresh = await request("/api/notifications", { token: tokenA });
    check(
        "read state survives a fresh fetch",
        refresh.body?.notifications?.find((notification) => notification._id === notificationId)?.read === true,
    );

    const foreignRead = await request(`/api/notifications/${notificationId}/read`, { method: "PATCH", token: tokenB });
    check("account B cannot mark account A's notification", foreignRead.status === 404, `status ${foreignRead.status}`);

    // 12. Reviews update reputation and unlock review state.
    const reviewByA = await request(`/api/tasks/${taskId}/reviews`, {
        method: "POST",
        token: tokenA,
        body: json({ rating: 5, comment: "Great work, delivered on time." }),
    });
    check("account A reviews the worker", reviewByA.status === 201, `status ${reviewByA.status}`);

    const duplicateReview = await request(`/api/tasks/${taskId}/reviews`, {
        method: "POST",
        token: tokenA,
        body: json({ rating: 4 }),
    });
    check("a second review from the same account is rejected with 409", duplicateReview.status === 409, `status ${duplicateReview.status}`);

    const reviewByB = await request(`/api/tasks/${taskId}/reviews`, {
        method: "POST",
        token: tokenB,
        body: json({ rating: 4, comment: "Clear instructions." }),
    });
    check("account B reviews the poster", reviewByB.status === 201, `status ${reviewByB.status}`);

    const profileB = await request(`/api/users/${userIdB}/profile`);
    check(
        "account B's public profile shows the rating and reviewer",
        profileB.status === 200 &&
            profileB.body?.profile?.rating?.average === 5 &&
            profileB.body?.profile?.rating?.count === 1 &&
            profileB.body?.profile?.reviews?.[0]?.reviewer?.name === "E2E Owner" &&
            profileB.body?.profile?.reviews?.[0]?.comment === "Great work, delivered on time.",
        `status ${profileB.status}, rating ${json(profileB.body?.profile?.rating)}`,
    );

    const profileA = await request(`/api/users/${userIdA}/profile`);
    check(
        "account A's public profile shows the worker's review",
        profileA.status === 200 &&
            profileA.body?.profile?.rating?.average === 4 &&
            profileA.body?.profile?.rating?.count === 1,
        `status ${profileA.status}, rating ${json(profileA.body?.profile?.rating)}`,
    );

    const reviewedAccepted = await request("/api/tasks/my/accepted?limit=100", { token: tokenB });
    check(
        "the worker's my gigs marks the task as reviewed",
        reviewedAccepted.body?.tasks?.find((task) => task._id === taskId)?.reviewedByMe === true,
    );

    const reviewEvent = await waitForEvent(socketA.events, (event) => event.type === "review_received");
    check(
        "account A receives the review notification over Socket.IO",
        Boolean(reviewEvent) && reviewEvent.task === taskId,
        reviewEvent ? "" : "no event received",
    );

    const anonymousReview = await request(`/api/tasks/${taskId}/reviews`, {
        method: "POST",
        body: json({ rating: 5 }),
    });
    check("anonymous review submission is rejected", anonymousReview.status === 401, `status ${anonymousReview.status}`);

    // 13. Anonymous privacy.
    const anonymousDetail = await request(`/api/tasks/${taskId}`);
    const detailText = json(anonymousDetail.body || {});
    check(
        "anonymous task detail still works",
        anonymousDetail.status === 200,
        `status ${anonymousDetail.status}`,
    );
    check(
        "anonymous task detail exposes no participant emails",
        !detailText.includes(emailA) && !detailText.includes(emailB) && anonymousDetail.body?.task?.createdBy?.email === undefined,
    );
    const anonymousNotifications = await request("/api/notifications");
    check("anonymous notification access is rejected", anonymousNotifications.status === 401, `status ${anonymousNotifications.status}`);
    const anonymousAccept = await request(`/api/tasks/${taskId}/accept`, { method: "PATCH" });
    check("anonymous task acceptance is rejected", anonymousAccept.status === 401, `status ${anonymousAccept.status}`);

    // 14. Invalid and expired tokens.
    const garbageToken = await request("/api/auth/me", { token: "not-a-valid-token" });
    check("garbage token is rejected", garbageToken.status === 401, `status ${garbageToken.status}`);
    const expiredToken = jwt.sign(
        { userId: userIdA, exp: Math.floor(Date.now() / 1000) - 60 },
        JWT_SECRET,
        { algorithm: "HS256" },
    );
    const expiredMe = await request("/api/auth/me", { token: expiredToken });
    check("expired token is rejected", expiredMe.status === 401, `status ${expiredMe.status}`);
    const expiredSocket = await connectSocket(expiredToken);
    check("expired token cannot open a socket", Boolean(expiredSocket.error), expiredSocket.error || "unexpectedly connected");
    expiredSocket.socket.close();
    const anonymousSocket = await connectSocket("");
    check("anonymous socket connection is rejected", Boolean(anonymousSocket.error), anonymousSocket.error || "unexpectedly connected");
    anonymousSocket.socket.close();

    // 15. Session behaviour: logout is client-side; the API is stateless.
    const afterLogout = await request("/api/tasks/my/posted");
    check("requests without a token behave as logged out", afterLogout.status === 401, `status ${afterLogout.status}`);
    const reusedToken = await request("/api/auth/me", { token: tokenA });
    check(
        "JWTs stay valid until expiry after client logout (stateless, no revocation)",
        reusedToken.status === 200,
        `status ${reusedToken.status}`,
    );

    // Extra guardrails around contract limits.
    const oversizedLimit = await request("/api/tasks?limit=500");
    check("oversized pagination limit is rejected", oversizedLimit.status === 400, `status ${oversizedLimit.status}`);
    const anonymousAi = await request("/api/ai/chat", { method: "POST", body: json({ message: "hello" }) });
    check("AI chat requires authentication", anonymousAi.status === 401, `status ${anonymousAi.status}`);

    socketA.socket.close();
}

try {
    await main();
} catch (error) {
    console.error("\nE2E run crashed:", error.message);
    results.push({ name: "run completed", ok: false, detail: error.message });
} finally {
    if (serverProcess && serverProcess.exitCode === null) {
        serverProcess.kill();
        const deadline = Date.now() + 10_000;
        while (serverProcess.exitCode === null && Date.now() < deadline) {
            await sleep(100);
        }
        if (serverProcess.exitCode === null) serverProcess.kill("SIGKILL");
    }

    if (DB_NAME.startsWith(DB_PREFIX)) {
        try {
            await mongoose.connect(`${MONGO_BASE}/${DB_NAME}`, { serverSelectionTimeoutMS: 5_000 });
            await mongoose.connection.dropDatabase();
            await mongoose.disconnect();
        } catch (error) {
            console.error(`Cleanup warning: could not drop ${DB_NAME}: ${error.message}`);
            results.push({ name: "database cleanup", ok: false, detail: error.message });
        }
    }

    const failed = results.filter((result) => !result.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
    if (failed.length) {
        console.error("Failed checks:");
        for (const failure of failed) console.error(`- ${failure.name}${failure.detail ? ` (${failure.detail})` : ""}`);
        console.error("E2E run FAILED");
        process.exit(1);
    }
    console.log("E2E run PASSED");
}
