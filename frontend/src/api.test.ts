import { afterEach, describe, expect, it, vi } from "vitest";
import { executeAction, fetchStats } from "./api";

describe("MIRAGE dashboard API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests real stats without caching", async () => {
    const stats = {
      raw_events: 8,
      incidents: 2,
      critical_open: 1,
      opportunistic: 1,
      contained: 0,
      noise_suppressed_pct: 75
    };
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(stats), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    vi.stubGlobal("fetch", fetch);

    await expect(fetchStats()).resolves.toEqual(stats);
    expect(fetch).toHaveBeenCalledWith("/api/stats", { cache: "no-store" });
  });

  it("posts explicit action approval to the incident endpoint", async () => {
    const action = {
      id: "block-1",
      type: "block_source",
      title: "Block source",
      why: "Real asset contact",
      params: {},
      requires_approval: true,
      status: "executed"
    };
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(action), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    vi.stubGlobal("fetch", fetch);

    await expect(executeAction("INC-203.0.113.8", "block-1", "approve")).resolves.toEqual(action);
    expect(fetch).toHaveBeenCalledWith(
      "/api/incidents/INC-203.0.113.8/actions/block-1?mode=approve",
      { cache: "no-store", method: "POST" }
    );
  });

  it("surfaces backend errors instead of treating them as successful data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Incident not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        })
      )
    );

    await expect(fetchStats()).rejects.toThrow("404 Incident not found");
  });
});
