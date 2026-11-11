import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Chat } from "@/routes/index";

describe("Chat screen", () => {
  it("does not populate a real conversation with example messages", () => {
    render(<Chat back={() => {}} />);
    expect(screen.queryByText("Hi! What did you do this weekend?")).toBeNull();
    expect(screen.queryByText("I didn't go out and you?")).toBeNull();
  });
});
