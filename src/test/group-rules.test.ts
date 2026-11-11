import { describe, expect, it } from "vitest";
import { groupError } from "@/lib/group-rules";

describe("group creation", () => {
  it("requires a name", () => { expect(groupError("  ", ["A", "B"])).not.toBe(""); });
  it("requires at least 2 participants", () => { expect(groupError("Amici", ["A"])).not.toBe(""); });
  it("accepts a named group with 2 participants", () => { expect(groupError("Amici", ["A", "B"])).toBe(""); });
});
