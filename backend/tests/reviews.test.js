import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import Notification from "../models/Notification.js";
import Review from "../models/Review.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import {
    connectTestDb,
    disconnectTestDb,
    jsonRequest,
    startTestServer,
    uniqueEmail
} from "./helpers/testApp.js";

describe("task reviews", () => {
    let testServer;
    let creator;
    let worker;
    let outsider;
    let completedTask;
    let openTask;

    const tokenFor = (user) => jwt.sign(
        { userId: user._id.toString() },
        process.env.JWT_SECRET
    );

    before(async () => {
        await connectTestDb("campusgigs_test_reviews");
        testServer = await startTestServer();

        [creator, worker, outsider] = await User.create([
            { name: "Reviews Creator", email: uniqueEmail("reviews-creator"), password: "test-password-hash" },
            { name: "Reviews Worker", email: uniqueEmail("reviews-worker"), password: "test-password-hash" },
            { name: "Reviews Outsider", email: uniqueEmail("reviews-outsider"), password: "test-password-hash" }
        ]);

        [completedTask, openTask] = await Task.create([
            {
                title: "Completed review task",
                description: "A completed task that both participants can review.",
                reward: 50,
                pickupLocation: "Test pickup",
                dropLocation: "Test drop",
                createdBy: creator._id,
                assignedTo: worker._id,
                status: "completed"
            },
            {
                title: "Open review task",
                description: "An open task that must not be reviewable.",
                reward: 50,
                pickupLocation: "Test pickup",
                dropLocation: "Test drop",
                createdBy: creator._id
            }
        ]);
    });

    after(async () => {
        const taskIds = [completedTask._id, openTask._id];
        await Review.deleteMany({ task: { $in: taskIds } });
        await Notification.deleteMany({ task: { $in: taskIds } });
        await Task.deleteMany({ _id: { $in: taskIds } });
        await User.deleteMany({ _id: { $in: [creator._id, worker._id, outsider._id] } });
        await testServer?.close();
        await disconnectTestDb();
    });

    it("lets the worker review the poster and updates the public profile", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            `/api/tasks/${completedTask._id}/reviews`,
            {
                method: "POST",
                token: tokenFor(worker),
                body: JSON.stringify({ rating: 5, comment: "Quick to respond" })
            }
        );

        assert.equal(response.status, 201);
        assert.equal(response.body.review.rating, 5);

        const profile = await jsonRequest(
            testServer.baseUrl,
            `/api/users/${creator._id}/profile`
        );

        assert.equal(profile.status, 200);
        assert.deepEqual(profile.body.profile.rating, { average: 5, count: 1 });
        assert.equal(profile.body.profile.reviews.length, 1);
        assert.equal(profile.body.profile.reviews[0].rating, 5);
        assert.equal(profile.body.profile.reviews[0].comment, "Quick to respond");
        assert.equal(profile.body.profile.reviews[0].reviewer.name, "Reviews Worker");
    });

    it("notifies the reviewee", async () => {
        const notification = await Notification.findOne({
            task: completedTask._id,
            recipient: creator._id,
            type: "review_received"
        });

        assert.ok(notification, "the reviewee should receive a review notification");
        assert.match(notification.message, /Reviews Worker left you a 5-star review/);
    });

    it("rejects a second review from the same reviewer", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            `/api/tasks/${completedTask._id}/reviews`,
            {
                method: "POST",
                token: tokenFor(worker),
                body: JSON.stringify({ rating: 4 })
            }
        );

        assert.equal(response.status, 409);
        assert.equal(response.body.message, "You already reviewed this task");
    });

    it("rejects out-of-range and fractional ratings", async () => {
        const tooHigh = await jsonRequest(
            testServer.baseUrl,
            `/api/tasks/${completedTask._id}/reviews`,
            {
                method: "POST",
                token: tokenFor(outsider),
                body: JSON.stringify({ rating: 6 })
            }
        );
        assert.equal(tooHigh.status, 400);

        const fractional = await jsonRequest(
            testServer.baseUrl,
            `/api/tasks/${completedTask._id}/reviews`,
            {
                method: "POST",
                token: tokenFor(worker),
                body: JSON.stringify({ rating: 4.5 })
            }
        );
        assert.equal(fractional.status, 400);
    });

    it("rejects reviewers who are not participants", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            `/api/tasks/${completedTask._id}/reviews`,
            {
                method: "POST",
                token: tokenFor(outsider),
                body: JSON.stringify({ rating: 5 })
            }
        );

        assert.equal(response.status, 403);
    });

    it("rejects reviews on tasks that are not completed", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            `/api/tasks/${openTask._id}/reviews`,
            {
                method: "POST",
                token: tokenFor(worker),
                body: JSON.stringify({ rating: 5 })
            }
        );

        assert.equal(response.status, 400);
        assert.equal(response.body.message, "Only completed tasks can be reviewed");
    });

    it("requires authentication", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            `/api/tasks/${completedTask._id}/reviews`,
            {
                method: "POST",
                body: JSON.stringify({ rating: 5 })
            }
        );

        assert.equal(response.status, 401);
    });

    it("lets the poster review the worker and marks the task as reviewed in their list", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            `/api/tasks/${completedTask._id}/reviews`,
            {
                method: "POST",
                token: tokenFor(creator),
                body: JSON.stringify({ rating: 4, comment: "Solid work" })
            }
        );

        assert.equal(response.status, 201);

        const profile = await jsonRequest(
            testServer.baseUrl,
            `/api/users/${worker._id}/profile`
        );
        assert.deepEqual(profile.body.profile.rating, { average: 4, count: 1 });

        const posted = await jsonRequest(
            testServer.baseUrl,
            "/api/tasks/my/posted?limit=100",
            { token: tokenFor(creator) }
        );

        const completed = posted.body.tasks.find(
            (task) => task._id === completedTask._id.toString()
        );
        const open = posted.body.tasks.find(
            (task) => task._id === openTask._id.toString()
        );

        assert.equal(completed.reviewedByMe, true);
        assert.equal(open.reviewedByMe, false);
    });

    it("exposes the poster rating in the public task listing", async () => {
        const response = await jsonRequest(
            testServer.baseUrl,
            "/api/tasks?status=open&limit=50&page=1"
        );

        assert.equal(response.status, 200);
        const task = response.body.tasks.find(
            (item) => item._id === openTask._id.toString()
        );

        assert.equal(task.createdBy.name, "Reviews Creator");
        assert.equal(task.createdBy.ratingCount, 1);
        assert.equal(task.createdBy.ratingSum, 5);
        assert.equal(task.createdBy.email, undefined);
    });
});
