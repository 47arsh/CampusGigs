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
    let cleanupTaskIds = [];

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
            cleanupTaskIds.push(task._id);
        }
        await Notification.deleteMany({ task: { $in: cleanupTaskIds } });
        await Task.deleteMany({ _id: { $in: cleanupTaskIds } });
        await User.deleteMany({ _id: { $in: [creator._id, worker._id] } });
        await testServer?.close();
        await disconnectTestDb();
    });

    const trackTask = (createdTask) => {
        cleanupTaskIds.push(createdTask._id);
        return createdTask;
    };

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

    it("notifies the poster when the worker submits the task", async () => {
        const response = await jsonRequest(testServer.baseUrl, `/api/tasks/${task._id}/submit`, {
            method: "PATCH",
            token: tokenFor(worker)
        });

        assert.equal(response.status, 200);
        assert.equal(response.body.task.status, "submitted");
        assert.ok(response.body.task.submittedAt, "the submission timestamp is recorded");

        const submissionNotification = await Notification.findOne({
            task: task._id,
            recipient: creator._id,
            type: "task_submitted"
        });
        assert.ok(submissionNotification, "the poster should be asked to confirm");
        assert.match(submissionNotification.message, /Lifecycle Worker/);

        const workerNotifications = await Notification.countDocuments({
            task: task._id,
            recipient: worker._id
        });
        assert.equal(workerNotifications, 0, "the worker should not notify themselves");
    });

    it("lets the poster confirm a submitted task and notifies the worker", async () => {
        const response = await jsonRequest(testServer.baseUrl, `/api/tasks/${task._id}/confirm`, {
            method: "PATCH",
            token: tokenFor(creator)
        });

        assert.equal(response.status, 200);
        assert.equal(response.body.task.status, "completed");

        const confirmation = await Notification.findOne({
            task: task._id,
            recipient: worker._id,
            type: "task_completed"
        });
        assert.ok(confirmation, "the worker should learn the poster confirmed");
        assert.match(confirmation.message, /confirmed/);
    });

    it("only the assignee can submit and only the poster can confirm", async () => {
        const guardedTask = trackTask(await Task.create({
            title: "Guarded lifecycle task",
            description: "A task used to verify who may submit and confirm.",
            reward: 50,
            pickupLocation: "Test pickup",
            dropLocation: "Test drop",
            createdBy: creator._id,
            status: "accepted",
            assignedTo: worker._id
        }));

        const creatorSubmit = await jsonRequest(testServer.baseUrl, `/api/tasks/${guardedTask._id}/submit`, {
            method: "PATCH",
            token: tokenFor(creator)
        });
        assert.equal(creatorSubmit.status, 400);

        const workerConfirm = await jsonRequest(testServer.baseUrl, `/api/tasks/${guardedTask._id}/confirm`, {
            method: "PATCH",
            token: tokenFor(worker)
        });
        assert.equal(workerConfirm.status, 400);

        const stored = await Task.findById(guardedTask._id);
        assert.equal(stored.status, "accepted");
    });

    it("auto-completes stale submissions on read and leaves fresh ones alone", async () => {
        const staleCutoff = 73 * 60 * 60 * 1000;

        const staleTask = trackTask(await Task.create({
            title: "Stale submitted task",
            description: "A task used to verify lazy auto-confirmation.",
            reward: 50,
            pickupLocation: "Test pickup",
            dropLocation: "Test drop",
            createdBy: creator._id,
            status: "submitted",
            assignedTo: worker._id,
            submittedAt: new Date(Date.now() - staleCutoff)
        }));
        const freshTask = trackTask(await Task.create({
            title: "Fresh submitted task",
            description: "A task used to verify recent submissions stay pending.",
            reward: 50,
            pickupLocation: "Test pickup",
            dropLocation: "Test drop",
            createdBy: creator._id,
            status: "submitted",
            assignedTo: worker._id,
            submittedAt: new Date()
        }));

        const staleDetail = await jsonRequest(testServer.baseUrl, `/api/tasks/${staleTask._id}`);
        assert.equal(staleDetail.status, 200);
        assert.equal(staleDetail.body.task.status, "completed");

        const autoConfirmNotification = await Notification.findOne({
            task: staleTask._id,
            recipient: worker._id,
            type: "task_completed"
        });
        assert.ok(autoConfirmNotification, "the worker should be told about the auto-confirmation");
        assert.match(autoConfirmNotification.message, /auto-completed/);

        const freshDetail = await jsonRequest(testServer.baseUrl, `/api/tasks/${freshTask._id}`);
        assert.equal(freshDetail.body.task.status, "submitted");
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
