import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api.js";
import Profile from "./Profile.jsx";

vi.mock("../components/Navbar.jsx", () => ({ default: () => null }));
vi.mock("../lib/api.js", () => ({ api: vi.fn() }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const USER_ID = "0123456789abcdef01234567";

describe("Profile page", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  const renderProfile = async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/users/" + USER_ID]}>
          <Routes>
            <Route path="/users/:id" element={<Profile />} />
          </Routes>
        </MemoryRouter>,
      );
    });
  };

  it("shows the public profile and stats", async () => {
    api.mockResolvedValue({
      profile: {
        _id: USER_ID,
        name: "Asha Rao",
        joinedAt: "2026-01-15T00:00:00.000Z",
        completedTasks: 3,
        rating: { average: null, count: 0 },
        reviews: [],
      },
    });

    await renderProfile();

    expect(api).toHaveBeenCalledWith("/users/" + USER_ID + "/profile");
    expect(container.textContent).toContain("Asha Rao");
    expect(container.textContent).toContain("Joined");
    expect(container.textContent).toContain("3");
    expect(container.textContent).toContain("No ratings yet");
    expect(container.textContent).toContain("No reviews yet");
  });

  it("shows the API error for an unknown user", async () => {
    api.mockRejectedValue(Object.assign(new Error("User not found"), { status: 404 }));

    await renderProfile();

    expect(container.textContent).toContain("User not found");
    expect(container.textContent).not.toContain("No reviews yet");
  });
});
