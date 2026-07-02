import { describe, it, expect } from "vitest";
import {
  ProviderError,
  providerErrorStatus,
  mapMiniMaxStatusCode,
} from "../providerError";

describe("providerErrorStatus", () => {
  it("maps each kind to its HTTP status", () => {
    expect(providerErrorStatus("quota_exceeded")).toBe(402);
    expect(providerErrorStatus("invalid_key")).toBe(401);
    expect(providerErrorStatus("key_missing")).toBe(400);
    expect(providerErrorStatus("rate_limited")).toBe(429);
    expect(providerErrorStatus("unknown")).toBe(502);
  });
});

describe("ProviderError", () => {
  it("builds a default message of <provider>_<kind>", () => {
    const err = new ProviderError("minimax", "invalid_key", 401);
    expect(err.message).toBe("minimax_invalid_key");
    expect(err.provider).toBe("minimax");
    expect(err.kind).toBe("invalid_key");
    expect(err.httpStatus).toBe(401);
  });
});

describe("mapMiniMaxStatusCode", () => {
  it("maps known MiniMax status codes", () => {
    expect(mapMiniMaxStatusCode(1004)).toBe("invalid_key");
    expect(mapMiniMaxStatusCode(1002)).toBe("rate_limited");
    expect(mapMiniMaxStatusCode(1039)).toBe("rate_limited");
    expect(mapMiniMaxStatusCode(2038)).toBe("quota_exceeded");
    expect(mapMiniMaxStatusCode(2013)).toBe("unknown");
    expect(mapMiniMaxStatusCode(undefined)).toBe("unknown");
  });
});
