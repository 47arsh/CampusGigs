import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import {
    connectTestDb,
    disconnectTestDb,
    request,
    startTestServer,
    uniqueEmail
} from "./helpers/testApp.js";

// Exercise production query semantics: operators must be explicitly trusted.
mongoose.set("sanitizeFilter", true);

let server;
let testTaskId;
let testUserIds = [];

before(async () => {
    await connectTestDb("campusgigs_test_accept");
    server = await startTestServer();
});

after(async () => {
    if (testTaskId) {
        await Notification.deleteMany({ task: testTaskId });
        await Task.deleteOne({ _id: testTaskId });
    }
    if (testUserIds.length) {
        await User.deleteMany({ _id: mongoose.trusted({ $in: testUserIds }) });
    }
    if (server) {
        await server.close();
    }
    await disconnectTestDb();
});

test("only one of two concurrent users can accept the same open task", async () => {
    const [creator, userA, userB] = await User.create([
        {
            name: "Concurrency Test Creator",
            email: uniqueEmail("accept-creator"),
            password: "test-password-hash"
        },
        {
            name: "Concurrency Test User A",
            email: uniqueEmail("accept-a"),
            password: "test-password-hash"
        },
        {
            name: "Concurrency Test User B",
            email: uniqueEmail("accept-b"),
            password: "test-password-hash"
        }
    ]);
    testUserIds = [creator._id, userA._id, userB._id];

    const task = await Task.create({
        title: "Concurrent acceptance test",
        description: "A test task used to verify concurrent acceptance.",
        reward: 50,
        pickupLocation: "Test pickup",
        dropLocation: "Test drop",
        createdBy: creator._id,
        status: "open"
    });
    testTaskId = task._id;

    const endpoint = `/api/tasks/${task._id}/accept`;
    const tokenFor = (user) => jwt.sign(
        { userId: user._id.toString() },
        process.env.JWT_SECRET
    );

    const results = await Promise.all(
        [userA, userB].map((user) => request(server.baseUrl, endpoint, {
            method: "PATCH",
            token: tokenFor(user)
        }))
    );

    const successfulIndexes = results
        .map((response, index) => response.status === 200 ? index : -1)
        .filter((index) => index !== -1);
    const failedIndexes = results
        .map((response, index) => response.status !== 200 ? index : -1)
        .filter((index) => index !== -1);

    assert.equal(successfulIndexes.length, 1, "exactly one acceptance should succeed");
    assert.equal(failedIndexes.length, 1, "exactly one competing acceptance should fail");
    assert.equal(results[failedIndexes[0]].status, 400, "the competing request should be rejected");

    const acceptedTask = await Task.findById(task._id);
    assert.equal(acceptedTask.status, "accepted");
    assert.equal(
        acceptedTask.assignedTo.toString(),
        [userA, userB][successfulIndexes[0]]._id.toString(),
        "the assignee should be the user whose request succeeded"
    );
});
