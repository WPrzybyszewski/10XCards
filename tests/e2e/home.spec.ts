import { test } from "@playwright/test";

import { HomePage } from "./page-objects";

test.describe("Strona główna", () => {
  test("wyświetla hero z nagłówkiem powitalnym", async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.expectHeroVisible();
  });
});

