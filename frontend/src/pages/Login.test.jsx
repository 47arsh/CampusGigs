import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext.jsx";
import Login from "./Login.jsx";

vi.mock("../components/Navbar.jsx", () => ({ default: () => null }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("Login", () => {
  let container;
  let root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MemoryRouter>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("accepts passwords shorter than the registration minimum", () => {
    const passwordInput = container.querySelector('input[type="password"]');

    expect(passwordInput).not.toBeNull();
    expect(passwordInput.hasAttribute("minlength")).toBe(false);
  });
});
