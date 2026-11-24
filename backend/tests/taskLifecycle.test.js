import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import Notification from "../models/Notification.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import {
    connectTestDb,
    disconnectTestDb,
    jsonRequest,
    startTestServer,
    uniqueEmail
} from "./helpers/testApp.js";

describe("task lifecycle notifications", () => {
    let testServer;
    let creator;
    let worker;
    let task;

    const tokenFor = (user) => jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET);

    before(async () => {
        await connectTestDb("campusgigs_test_lifecycle");
        testServer = await startTestServer();

        [creator, worker] = await User.create([
            { name: "Lifecycle Creator", email: uniqueEmail("lifecycle-creator"), password: "test-password-hash" },
            { name: "Lifecycle Worker", email: uniqueEmail("lifecycle-worker"), password: "test-password-hash" }
        ]);

        task = await Task.create({
            title: "Lifecycle test task",
            description: "A task used to verify lifecycle notifications.",
            reward: 50,
            pickupLocation: "Test pickup",
            dropLocation: "Test drop",
            createdBy: creator._id
        });
    });

    after(async () => {
        if (task) {
            await Notification.deleteMany({ task: task._id });
            await Task.deleteOne({ _id: task._id });
        }
        await User.deleteMany({ _id: { $in: [creator._id, worker._id] } });
        await testServer?.close();
        await disconnectTestDb();
    });

    it("notifies the poster when a worker accepts the task", async () => {
        const response = await jsonRequest(testServer.baseUrl, `/api/tasks/${task._id}/accept`, {
            method: "PATCH",
            token: tokenFor(worker)
        });

        assert.equal(response.status, 200);

        const notification = await Notification.findOne({
            task: task._id,
            recipient: creator._id,
            type: "task_accepted"
        });
        assert.ok(notification, "the poster should receive an acceptance notification");
        assert.match(notification.message, /Lifecycle Worker/);
    });

    it("notifies the poster, not the worker, when the task is completed", async () => {
        const response = await jsonRequest(testServer.baseUrl, `/api/tasks/${task._id}/complete`, {
            method: "PATCH",
            token: tokenFor(worker)
        });

        assert.equal(response.status, 200);

        const creatorNotification = await Notification.findOne({
            task: task._id,
            recipient: creator._id,
            type: "task_completed"
        });
        assert.ok(creatorNotification, "the poster should be told their task was completed");
        assert.match(creatorNotification.message, /Lifecycle Worker/);

        const workerNotifications = await Notification.countDocuments({
            task: task._id,
            recipient: worker._id
        });
        assert.equal(workerNotifications, 0, "the worker should not notify themselves");
    });

    it("lets the poster cancel an open task exactly once", async () => {
        const cancelable = await Task.create({
            title: "Cancelable test task",
            description: "A task used to verify cancellation rules.",
            reward: 50,
            pickupLocation: "Test pickup",
            dropLocation: "Test drop",
            createdBy: creator._id
        });

        try {
            const first = await jsonRequest(testServer.baseUrl, `/api/tasks/${cancelable._id}/cancel`, {
                method: "PATCH",
                token: tokenFor(creator)
            });
            assert.equal(first.status, 200);
            assert.equal(first.body.task.status, "cancelled");

            const second = await jsonRequest(testServer.baseUrl, `/api/tasks/${cancelable._id}/cancel`, {
                method: "PATCH",
                token: tokenFor(creator)
            });
            assert.equal(second.status, 400);
            assert.equal(second.body.message, "Task is already cancelled");
        } finally {
            await Task.deleteOne({ _id: cancelable._id });
        }
    });

    it("rejects cancellation attempts by non-posters", async () => {
        const cancelable = await Task.create({
            title: "Protected test task",
            description: "A task used to verify cancellation authorization.",
            reward: 50,
            pickupLocation: "Test pickup",
            dropLocation: "Test drop",
            createdBy: creator._id
        });

        try {
            const response = await jsonRequest(testServer.baseUrl, `/api/tasks/${cancelable._id}/cancel`, {
                method: "PATCH",
                token: tokenFor(worker)
            });
            assert.equal(response.status, 403);

            const stored = await Task.findById(cancelable._id);
            assert.equal(stored.status, "open");
        } finally {
            await Task.deleteOne({ _id: cancelable._id });
        }
    });
});
