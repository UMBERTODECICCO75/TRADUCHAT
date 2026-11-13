import { expect, test } from "bun:test";
import { passwordProblems } from "./password-rules";

test("rifiuta meno di 8 caratteri", () => expect(passwordProblems("Ab1!")).toContain("almeno 8 caratteri"));
test("richiede maiuscola", () => expect(passwordProblems("abcdef1!")).toContain("una lettera maiuscola"));
test("richiede numero", () => expect(passwordProblems("Abcdefg!")).toContain("un numero"));
test("richiede carattere speciale", () => expect(passwordProblems("Abcdefg1")).toContain("un carattere speciale"));
test("accetta password valida", () => expect(passwordProblems("Abcdefg1!")).toEqual([]));
