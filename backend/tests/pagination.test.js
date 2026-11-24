import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
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

// Exercise production query semantics: operators must be explicitly trusted.
mongoose.set("sanitizeFilter", true);

describe("list pagination", () => {
    let testServer;
    let user;
    let taskIds = [];

    before(async () => {
        await connectTestDb("campusgigs_test_pagination");
        testServer = await startTestServer();

        user = await User.create({
            name: "Pagination User",
            email: uniqueEmail("pagination"),
            password: "test-password-hash"
        });

        const tasks = await Task.create(["First", "Second", "Third"].map((title) => ({
            title: `Pagination ${title}`,
            description: "A task used to verify list pagination.",
            reward: 50,
            pickupLocation: "Test pickup",
            dropLocation: "Test drop",
            createdBy: user._id
        })));
        taskIds = tasks.map((task) => task._id);

        await Notification.create(["One", "Two", "Three"].map((label) => ({
            recipient: user._id,
            type: "general",
            message: `Notification ${label}`
        })));
    });

    after(async () => {
        await Notification.deleteMany({ recipient: user._id });
        await Task.deleteMany({ _id: mongoose.trusted({ $in: taskIds }) });
        await User.deleteOne({ _id: user._id });
        await testServer?.close();
        await disconnectTestDb();
    });

    const token = () => jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET);

    it("paginates notifications and reports totals", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/notifications?limit=2", {
            token: token()
        });

        assert.equal(response.status, 200);
        assert.equal(response.body.notifications.length, 2);
        assert.deepEqual(response.body.pagination, {
            page: 1,
            limit: 2,
            totalNotifications: 3,
            totalPages: 2,
            hasNextPage: true,
            hasPrevPage: false
        });
    });

    it("paginates posted tasks", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/tasks/my/posted?limit=2", {
            token: token()
        });

        assert.equal(response.status, 200);
        assert.equal(response.body.tasks.length, 2);
        assert.equal(response.body.pagination.totalTasks, 3);
        assert.equal(response.body.pagination.totalPages, 2);
    });

    it("rejects limits above the cap", async () => {
        const response = await jsonRequest(testServer.baseUrl, "/api/notifications?limit=101", {
            token: token()
        });

        assert.equal(response.status, 400);
    });

    it("filters tasks by reward range while operators stay trusted", async () => {
        const inRange = await jsonRequest(testServer.baseUrl, "/api/tasks?minReward=40&maxReward=60");
        assert.equal(inRange.status, 200);
        assert.equal(inRange.body.pagination.totalTasks, 3);

        const outOfRange = await jsonRequest(testServer.baseUrl, "/api/tasks?minReward=51");
        assert.equal(outOfRange.status, 200);
        assert.equal(outOfRange.body.pagination.totalTasks, 0);
    });
});
