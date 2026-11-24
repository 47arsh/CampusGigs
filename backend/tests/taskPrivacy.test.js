import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import Task from "../models/Task.js";
import User from "../models/User.js";
import {
    connectTestDb,
    disconnectTestDb,
    jsonRequest,
    startTestServer,
    uniqueEmail
} from "./helpers/testApp.js";

describe("task privacy", () => {
    let testServer;
    let userIds = [];
    let taskId;

    before(async () => {
        await connectTestDb("campusgigs_test_privacy");
        testServer = await startTestServer();

        const [creator, worker] = await User.create([
            { name: "Privacy Creator", email: uniqueEmail("privacy-creator"), password: "test-password-hash" },
            { name: "Privacy Worker", email: uniqueEmail("privacy-worker"), password: "test-password-hash" }
        ]);
        userIds = [creator._id, worker._id];

        const task = await Task.create({
            title: "Privacy test task",
            description: "A task used to verify public response fields.",
            reward: 50,
            pickupLocation: "Test pickup",
            dropLocation: "Test drop",
            createdBy: creator._id,
            assignedTo: worker._id,
            status: "accepted"
        });
        taskId = task._id;
    });

    after(async () => {
        if (taskId) {
            await Task.deleteOne({ _id: taskId });
        }
        if (userIds.length) {
            await User.deleteMany({ _id: { $in: userIds } });
        }
        await testServer?.close();
        await disconnectTestDb();
    });

    it("does not expose participant emails on the public task detail", async () => {
        const response = await jsonRequest(testServer.baseUrl, `/api/tasks/${taskId}`);

        assert.equal(response.status, 200);
        assert.equal(response.body.task.createdBy.name, "Privacy Creator");
        assert.equal(response.body.task.assignedTo.name, "Privacy Worker");
        assert.equal(response.body.task.createdBy.email, undefined);
        assert.equal(response.body.task.assignedTo.email, undefined);
    });
});
