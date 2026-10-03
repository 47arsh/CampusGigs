import assert from "node:assert/strict";
import { after, test } from "node:test";
import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import taskRoutes from "../routes/taskRoutes.js";
import Notification from "../models/Notification.js";
import Task from "../models/Task.js";
import User from "../models/User.js";

const testDatabaseName = "campusgigs_test";
let httpServer;
let testTaskId;
let testUserIds = [];

after(async () => {
    if (testTaskId) {
        await Notification.deleteMany({ task: testTaskId });
        await Task.deleteOne({ _id: testTaskId });
    }
    if (testUserIds.length) {
        await User.deleteMany({ _id: { $in: testUserIds } });
    }
    if (httpServer) {
        await new Promise((resolve, reject) => {
            httpServer.close((error) => error ? reject(error) : resolve());
        });
    }
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
});

test("only one of two concurrent users can accept the same open task", async () => {
    assert.ok(process.env.MONGO_URI, "MONGO_URI must be configured for the test database");
    assert.ok(process.env.JWT_SECRET, "JWT_SECRET must be configured");
    await mongoose.connect(process.env.MONGO_URI, { dbName: testDatabaseName });

    const [creator, userA, userB] = await User.create([
        {
            name: "Concurrency Test Creator",
            email: `accept-creator-${new mongoose.Types.ObjectId()}@example.test`,
            password: "test-password-hash"
        },
        {
            name: "Concurrency Test User A",
            email: `accept-a-${new mongoose.Types.ObjectId()}@example.test`,
            password: "test-password-hash"
        },
        {
            name: "Concurrency Test User B",
            email: `accept-b-${new mongoose.Types.ObjectId()}@example.test`,
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

    const app = express();
    app.use(express.json());
    app.use("/api/tasks", taskRoutes);
    httpServer = app.listen(0);
    await new Promise((resolve, reject) => {
        httpServer.once("listening", resolve);
        httpServer.once("error", reject);
    });
    const address = httpServer.address();
    const endpoint = `http://127.0.0.1:${address.port}/api/tasks/${task._id}/accept`;
    const tokenFor = (user) => jwt.sign(
        { userId: user._id.toString() },
        process.env.JWT_SECRET
    );

    const results = await Promise.all(
        [userA, userB].map((user) => fetch(endpoint, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${tokenFor(user)}`
            }
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
    assert.equal(results[failedIndexes[0]].status, 400, "the competing request should be rejected as unavailable");

    const acceptedTask = await Task.findById(task._id);
    assert.equal(acceptedTask.status, "accepted");
    assert.equal(
        acceptedTask.assignedTo.toString(),
        [userA, userB][successfulIndexes[0]]._id.toString(),
        "the assignee should be the user whose request succeeded"
    );
});
