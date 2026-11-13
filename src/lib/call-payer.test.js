import { expect, test } from "bun:test";
import { callPayerOrder } from "./call-payer";
test("the participant with the most credits pays the call minute", () => {
  expect(callPayerOrder([{ user_id: "a", balance: 3 }, { user_id: "b", balance: 40 }, { user_id: "c", balance: 12 }])).toEqual(["b", "c", "a"]);
});
test("participants with no credits never pay", () => {
  expect(callPayerOrder([{ user_id: "a", balance: 0 }, { user_id: "b", balance: 1 }])).toEqual(["b"]);
});
