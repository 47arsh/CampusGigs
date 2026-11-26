import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import Dashboard from "./Dashboard.jsx";

vi.mock("../components/Navbar.jsx", () => ({ default: () => null }));
vi.mock("../lib/api.js", () => ({ api: vi.fn() }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const task = (id, title) => ({
  _id: id,
  title,
  description: "Pagination test task description.",
  status: "open",
  reward: 50,
  pickupLocation: "Library",
  dropLocation: "Hostel",
});

const completedTask = {
  _id: "p1",
  title: "Completed audit task",
  description: "A completed task ready for a review.",
  status: "completed",
  reward: 60,
  pickupLocation: "Library",
  dropLocation: "Hostel",
  createdBy: { _id: "creator-1", name: "Phase A", ratingSum: 8, ratingCount: 2 },
  assignedTo: { _id: "worker-1", name: "Phase B" },
  reviewedByMe: false,
};

const acceptedTask = {
  _id: "a1",
  title: "Accepted audit task",
  description: "An accepted task awaiting submission.",
  status: "accepted",
  reward: 50,
  pickupLocation: "Library",
  dropLocation: "Hostel",
  createdBy: { _id: "creator-1", name: "Phase A", ratingSum: 8, ratingCount: 2 },
};

const submittedTask = {
  _id: "s1",
  title: "Submitted audit task",
  description: "A submitted task awaiting poster confirmation.",
  status: "submitted",
  reward: 50,
  pickupLocation: "Library",
  dropLocation: "Hostel",
  createdBy: { _id: "creator-1", name: "Phase A", ratingSum: 8, ratingCount: 2 },
  assignedTo: { _id: "worker-1", name: "Phase B" },
};

describe("Dashboard", () => {
  let container;
  let root;
  let postedTasks;
  let acceptedTasks;

  const renderDashboard = () => act(async () => {
    root.render(
      <MemoryRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </MemoryRouter>,
    );
  });

  const clickButton = async (label) => {
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent.includes(label),
    );
    expect(button).toBeTruthy();
    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  };

  beforeEach(() => {
    localStorage.setItem("campusgigs_token", "test-token");
    postedTasks = [completedTask];
    acceptedTasks = [];

    api.mockImplementation((path) => {
      if (path.startsWith("/tasks?status=open")) {
        if (path.includes("page=2")) {
          return Promise.resolve({ tasks: [task("2", "Second page task")], pagination: { hasNextPage: false } });
        }
        return Promise.resolve({ tasks: [task("1", "First page task")], pagination: { hasNextPage: true } });
      }
      if (path.startsWith("/tasks/my/posted")) {
        return Promise.resolve({ tasks: postedTasks });
      }
      if (path.startsWith("/tasks/my/accepted")) return Promise.resolve({ tasks: acceptedTasks });
      return Promise.resolve({});
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("loads additional pages when more open tasks exist", async () => {
    await renderDashboard();
    await act(async () => {});
    expect(container.querySelectorAll("article")).toHaveLength(1);

    const loadMore = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Load more tasks"),
    );
    expect(loadMore).toBeTruthy();

    await act(async () => {
      loadMore.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelectorAll("article")).toHaveLength(2);
    expect(
      Array.from(container.querySelectorAll("button")).some((button) =>
        button.textContent.includes("Load more tasks"),
      ),
    ).toBe(false);
    expect(api).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });

  it("submits a review for a completed task", async () => {
    await renderDashboard();
    await act(async () => {});

    await clickButton("My posted");
    await clickButton("Leave a review");

    const form = container.querySelector("article form");
    expect(form).toBeTruthy();

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(api).toHaveBeenCalledWith(
      "/tasks/p1/reviews",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("submits an accepted gig for poster confirmation", async () => {
    acceptedTasks = [acceptedTask];
    await renderDashboard();
    await act(async () => {});

    await clickButton("My gigs");
    await clickButton("Submit for confirmation");

    expect(api).toHaveBeenCalledWith(
      "/tasks/a1/submit",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("confirms a submitted task from my posted", async () => {
    postedTasks = [submittedTask];
    await renderDashboard();
    await act(async () => {});

    await clickButton("My posted");
    await clickButton("Confirm completion");

    expect(api).toHaveBeenCalledWith(
      "/tasks/s1/confirm",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
