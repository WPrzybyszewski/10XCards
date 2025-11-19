import { test } from "@playwright/test";

import { AuthLoginPage } from "./page-objects";

test.describe("Logowanie", () => {
  test("pokazuje błędy walidacji przy pustym formularzu", async ({ page }) => {
    const loginPage = new AuthLoginPage(page);

    await loginPage.goto();
    await loginPage.submit();
    await loginPage.expectValidationMessages({
      email: "Podaj adres e-mail.",
      password: "Hasło nie może być puste.",
      status: "Popraw pola oznaczone na czerwono.",
    });
  });
});

