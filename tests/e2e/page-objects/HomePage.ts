import { expect } from "@playwright/test";

import { BasePage } from "./BasePage";

export class HomePage extends BasePage {
  private readonly heroHeading = this.page.getByRole("heading", {
    name: /witaj w 10xdevs astro starter/i,
  });

  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  async expectHeroVisible(): Promise<void> {
    await expect(this.heroHeading).toBeVisible();
  }
}

