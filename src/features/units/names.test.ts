import { describe, expect, it } from "vitest";

import { lordDisplayNames, parseChannelNames, unitDisplayName, withChannelName } from "./names";
import { getUnitById, LORDS, findLord } from "./roster";

describe("realm names", () => {
  const hector = getUnitById("lord-brannoc")!;

  it("defaults to the community preset and falls back to original names", () => {
    expect(unitDisplayName(hector)).toBe("Hector");
    expect(unitDisplayName(hector, { mode: "original", custom: {} })).toBe("Brannoc");
    expect(unitDisplayName(getUnitById("bram")!)).toBe("Bram"); // non-lords never change
  });

  it("lets a custom name win in either mode and cleans it", () => {
    const names = parseChannelNames({ mode: "official", custom: { "lord-brannoc": "  Big — Axe  ", bram: "nope", "lord-x": "no" } });
    expect(names.custom).toEqual({ "lord-brannoc": "Big - Axe" });
    expect(unitDisplayName(hector, names)).toBe("Big - Axe");
    expect(withChannelName(hector, names).name).toBe("Big - Axe");
    expect(withChannelName(hector, names).id).toBe("lord-brannoc");
  });

  it("covers every lord in the preset and resolves lookups by any name", () => {
    const names = lordDisplayNames();
    expect(Object.keys(names)).toHaveLength(LORDS.length);
    expect(new Set(Object.values(names)).size).toBe(LORDS.length);
    expect(findLord("Lyn", names)?.id).toBe("lord-sable");
    expect(findLord("sable")?.id).toBe("lord-sable");
    expect(findLord("lord-sable")?.id).toBe("lord-sable");
    expect(findLord("nobody", names)).toBeUndefined();
  });

  it("tolerates junk settings", () => {
    expect(parseChannelNames(null)).toEqual({ mode: "official", custom: {} });
    expect(parseChannelNames({ mode: "weird", custom: "x" })).toEqual({ mode: "official", custom: {} });
  });
});
