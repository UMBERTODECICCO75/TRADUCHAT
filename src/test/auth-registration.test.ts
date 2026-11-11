import { describe, expect, it } from "vitest";
import { registrationInput } from "@/lib/auth-registration";

describe("Username profile and email authentication", () => {
  it("keeps the email as the login identity and username as separate profile data", () => {
    expect(registrationInput(" Umberto ", " user@example.com ", "password123", "password123"))
      .toEqual({ email: "user@example.com", password: "password123", username: "Umberto" });
  });
  it("rejects mismatched confirmation without creating an account", () => {
    expect(() => registrationInput("Umberto", "user@example.com", "password123", "different"))
      .toThrow("Le password non coincidono");
  });
  it("normalizes the email to lowercase without spaces", () => {
    expect(registrationInput("Umberto", " User@Example.COM ", "password123", "password123").email)
      .toBe("user@example.com");
  });
  it("rejects an invalid email address", () => {
    expect(() => registrationInput("Umberto", "not-an-email", "password123", "password123"))
      .toThrow("Inserisci un indirizzo e-mail valido");
  });
  it("rejects a password shorter than 6 characters", () => {
    expect(() => registrationInput("Umberto", "user@example.com", "abc", "abc"))
      .toThrow("La password deve avere almeno 6 caratteri");
  });
});