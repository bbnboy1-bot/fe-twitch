import { describe, expect, it } from "vitest";

import { getPublicTransferError } from "./errors";

describe("getPublicTransferError", () => {
  it("preserves supported business errors with unit wording", () => {
    expect(getPublicTransferError("Pokemon is reserved in an open trade")).toBe(
      "unit is reserved in an open trade",
    );
    expect(getPublicTransferError("A Pokemon cannot be traded for itself")).toBe(
      "A unit cannot be traded for itself",
    );
  });

  it("hides unexpected database details", () => {
    expect(
      getPublicTransferError(
        'duplicate key value violates unique constraint "trades_pkey"',
      ),
    ).toBe("The transfer could not be completed. Please try again.");
  });
});
