import { expect } from "@playwright/test";

import { BasePage } from "./BasePage";

export class AuthLoginPage extends BasePage {
  private readonly emailInput = this.page.getByLabel("Adres e-mail");
  private readonly passwordInput = this.page.getByLabel("Hasło");
  private readonly submitButton = this.page.getByRole("button", {
    name: /zaloguj się/i,
  });
  private readonly form = this.page.getByTestId("login-form");
  private readonly emailError = this.page.getByTestId("login-email-error");
  private readonly passwordError = this.page.getByTestId(
    "login-password-error",
  );
  private readonly statusMessage = this.page.getByTestId(
    "login-status-message",
  );

  async goto(): Promise<void> {
    await this.page.goto("/auth/login");
    await expect(this.form).toHaveAttribute("data-hydrated", "true");
  }

  async fillEmail(value: string): Promise<void> {
    await this.emailInput.fill(value);
  }

  async fillPassword(value: string): Promise<void> {
    await this.passwordInput.fill(value);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async expectValidationMessages(options: {
    email?: string;
    password?: string;
    status?: string;
  }): Promise<void> {
    if (options.email) {
      await expect(this.emailError).toHaveText(options.email);
    }

    if (options.password) {
      await expect(this.passwordError).toHaveText(options.password);
    }

    if (options.status) {
      await expect(this.statusMessage).toHaveText(options.status);
    }
  }
}

