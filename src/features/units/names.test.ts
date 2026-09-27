import { describe, expect, it } from "vitest";

import { lordDisplayNames, NAMEABLE_UNITS, OFFICIAL_NAMES, parseChannelNames, unitDisplayName, withChannelName } from "./names";
import { getUnitById, LORDS, findLord } from "./roster";

describe("realm names", () => {
  const hector = getUnitById("lord-hadrian")!;

  it("defaults to the community preset and falls back to original names", () => {
    expect(unitDisplayName(hector)).toBe("Hector");
    expect(unitDisplayName(hector, { mode: "original", custom: {} })).toBe("Hadrian");
    expect(unitDisplayName(getUnitById("bram")!)).toBe("Oswin"); // recruits and warlords have a preset too
    expect(unitDisplayName(getUnitById("warlord-vaelen")!, { mode: "original", custom: {} })).toBe("Vaelen");
  });

  it("lets a custom name win in either mode and cleans it", () => {
    const names = parseChannelNames({ mode: "official", custom: { "lord-hadrian": "  Big — Axe  ", bram: "nope", "lord-x": "no" } });
    expect(names.custom).toEqual({ "lord-hadrian": "Big - Axe", bram: "nope" });
    expect(unitDisplayName(hector, names)).toBe("Big - Axe");
    expect(withChannelName(hector, names).name).toBe("Big - Axe");
    expect(withChannelName(hector, names).id).toBe("lord-hadrian");
  });

  it("covers every lord in the preset and resolves lookups by any name", () => {
    const names = lordDisplayNames();
    expect(Object.keys(names)).toHaveLength(LORDS.length);
    expect(new Set(Object.values(names)).size).toBe(LORDS.length);
    expect(findLord("Lyn", names)?.id).toBe("lord-wren");
    expect(findLord("wren")?.id).toBe("lord-wren");
    expect(findLord("lord-wren")?.id).toBe("lord-wren");
    expect(findLord("nobody", names)).toBeUndefined();
  });

  it("has a preset name for every unit and no duplicates in either mode", () => {
    const ids = NAMEABLE_UNITS.map((u) => u.id);
    expect(ids.every((id) => OFFICIAL_NAMES[id])).toBe(true);
    expect(new Set(Object.values(OFFICIAL_NAMES)).size).toBe(ids.length);
    expect(new Set(NAMEABLE_UNITS.map((u) => u.name)).size).toBe(ids.length);
  });

  it("tolerates junk settings", () => {
    expect(parseChannelNames(null)).toEqual({ mode: "official", custom: {} });
    expect(parseChannelNames({ mode: "weird", custom: "x" })).toEqual({ mode: "official", custom: {} });
  });
});
