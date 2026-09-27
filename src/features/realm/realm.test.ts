import { describe, expect, it } from "vitest";

import { normalizeRealm, pickRealm, withRealm } from "./realm";

describe("realms", () => {
  it("normalizes channel names and rejects junk", () => {
    expect(normalizeRealm(" #PiggHudson ")).toBe("pigghudson");
    expect(normalizeRealm("@some_streamer")).toBe("some_streamer");
    expect(normalizeRealm("bad name")).toBeNull();
    expect(normalizeRealm("x".repeat(26))).toBeNull();
    expect(normalizeRealm("")).toBeNull();
  });

  it("prefers the link, then the cookie, then the streamer's own channel, then the env default", () => {
    const all = { param: "a", cookie: "b", accountChannel: "c", envDefault: "d" };
    expect(pickRealm(all)).toEqual({ channel: "a", source: "param" });
    expect(pickRealm({ ...all, param: null })).toEqual({ channel: "b", source: "cookie" });
    expect(pickRealm({ ...all, param: null, cookie: null })).toEqual({ channel: "c", source: "account" });
    expect(pickRealm({ envDefault: "d" })).toEqual({ channel: "d", source: "env" });
    expect(pickRealm({})).toEqual({ channel: null, source: "none" });
    expect(pickRealm({ param: "not valid!", cookie: "b" })).toEqual({ channel: "b", source: "cookie" });
  });

  it("tags bot links with the realm", () => {
    const url = withRealm(new URL("https://fe.example/collections?mode=user&q=viewer"), "#PiggHudson");
    expect(url.toString()).toBe("https://fe.example/collections?mode=user&q=viewer&realm=pigghudson");
  });
});
