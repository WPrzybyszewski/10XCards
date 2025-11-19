import { describe, expect, it } from "vitest";

import { loginCommandSchema, registerCommandSchema } from "./auth";

describe("auth validation schemas", () => {
  it("poprawnie parsuje komendę logowania i przycina e-mail", () => {
    const result = loginCommandSchema.parse({
      email: " user@example.com ",
      password: "secret",
    });

    expect(result).toEqual({
      email: "user@example.com",
      password: "secret",
    });
  });

  it("odrzuca komendę rejestracji z błędnym e-mailem i za krótkim hasłem", () => {
    const { success, error } = registerCommandSchema.safeParse({
      email: "invalid-email",
      password: "short",
    });

    expect(success).toBe(false);
    expect(error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Email must be a valid email address",
          path: ["email"],
        }),
        expect.objectContaining({
          message: "Password must be at least 8 characters long",
          path: ["password"],
        }),
      ]),
    );
  });
});

