import { describe, expect, it } from "vitest";
import { formatTimestamp } from "./formatTimestamp.js";

const now = Date.parse("2026-01-10T12:00:00.000Z");
const at = (minutesAgo) => new Date(now - minutesAgo * 60000).toISOString();

describe("formatTimestamp", () => {
  it("describes the last minute as just now", () => {
    expect(formatTimestamp(at(0), now)).toBe("Just now");
    expect(formatTimestamp(at(0.5), now)).toBe("Just now");
  });

  it("counts minutes and pluralizes correctly", () => {
    expect(formatTimestamp(at(1), now)).toBe("1 minute ago");
    expect(formatTimestamp(at(5), now)).toBe("5 minutes ago");
  });

  it("counts hours", () => {
    expect(formatTimestamp(at(60), now)).toBe("1 hour ago");
    expect(formatTimestamp(at(180), now)).toBe("3 hours ago");
  });

  it("counts days within the first week", () => {
    expect(formatTimestamp(at(1440), now)).toBe("1 day ago");
    expect(formatTimestamp(at(4320), now)).toBe("3 days ago");
  });

  it("falls back to a calendar date after a week", () => {
    const value = at(60 * 24 * 10);

    expect(formatTimestamp(value, now)).toBe(new Date(value).toLocaleDateString());
  });

  it("does not produce negative durations for future values", () => {
    expect(formatTimestamp(at(-5), now)).toBe("Just now");
  });
});
