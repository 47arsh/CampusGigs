import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import User from "../models/User.js";
import {
    connectTestDb,
    disconnectTestDb,
    jsonRequest,
    startTestServer,
    uniqueEmail
} from "./helpers/testApp.js";

describe("public user profiles", () => {
    let testServer;
    let creator;
    let worker;
    let taskIds = [];

    before(async () => {
        await connectTestDb("campusgigs_test_users");
        testServer = await startTestServer();

        [creator, worker] = await User.create([
            { name: "Profile Creator", email: uniqueEmail("profile-creator"), password: "test-password-hash" },
            { name: "Profile Worker", email: uniqueEmail("profile-worker"), password: "test-password-hash" }
        ]);

        const tasks = await Task.create([
            {
                title: "Completed profile task",
                description: "A completed task used to verify profile counts.",
                reward: 50,
                pickupLocation: "Test pickup",
                dropLocation: "Test drop",
                createdBy: creator._id,
                assignedTo: worker._id,
                status: "completed"
            },
            {
                title: "Accepted profile task",
                description: "An accepted task that must not count as completed.",
                reward: 50,
                pickupLocation: "Test pickup",
                dropLocation: "Test drop",
                createdBy: creator._id,
                assignedTo: worker._id,
                status: "accepted"
            },
            {
                title: "Open profile task",
                description: "An open task used to verify public listing names.",
                reward: 50,
                pickupLocation: "Test pickup",
                dropLocation: "Test drop",
                createdBy: creator._id
            }
        ]);
        taskIds = tasks.map((task) => task._id);
    });

    after(async () => {
        if (taskIds.length) {
            await Task.deleteMany({ _id: { $in: taskIds } });
        }
        await User.deleteMany({ _id: { $in: [creator._id, worker._id] } });
        await testServer?.close();
        await disconnectTestDb();
    });

    it("returns a public profile without private fields", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            `/api/users/${worker._id}/profile`
        );

        assert.equal(response.status, 200);
        assert.equal(response.body.profile.name, "Profile Worker");
        assert.ok(response.body.profile.joinedAt, "the join date should be exposed");
        assert.equal(response.body.profile.completedTasks, 1);
        assert.deepEqual(response.body.profile.rating, { average: null, count: 0 });
        assert.deepEqual(response.body.profile.reviews, []);
        assert.equal(response.body.profile.email, undefined);
        assert.equal(response.body.profile.password, undefined);
        assert.equal(JSON.stringify(response.body).includes(worker.email), false);
    });

    it("counts only completed gigs", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            `/api/users/${creator._id}/profile`
        );

        assert.equal(response.status, 200);
        assert.equal(response.body.profile.completedTasks, 0);
    });

    it("reports an unknown user as not found", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            `/api/users/${new mongoose.Types.ObjectId()}/profile`
        );

        assert.equal(response.status, 404);
        assert.equal(response.body.message, "User not found");
    });

    it("rejects a malformed user id", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            "/api/users/definitely-not-an-id/profile"
        );

        assert.equal(response.status, 400);
    });

    it("includes the poster name when listing tasks", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            "/api/tasks?status=open&limit=50&page=1"
        );

        assert.equal(response.status, 200);
        const openTask = response.body.tasks.find(
            (task) => task._id === taskIds[2].toString()
        );

        assert.ok(openTask, "the open task should be listed");
        assert.ok(openTask.createdBy, "the poster should be populated");
        assert.equal(openTask.createdBy.name, "Profile Creator");
        assert.equal(openTask.createdBy.email, undefined);
        assert.ok(!openTask.assignedTo, "open tasks have no assignee");
    });
});
