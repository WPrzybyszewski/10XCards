import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import LoginForm from "./LoginForm";

describe("LoginForm", () => {
  it("renderuje pola email i hasło wraz z przyciskiem logowania", () => {
    render(<LoginForm />);

    expect(
      screen.getByRole("heading", { name: /zaloguj się/i }),
    ).toBeVisible();
    expect(screen.getByLabelText(/adres e-mail/i)).toBeVisible();
    expect(screen.getByLabelText(/hasło/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /zaloguj się/i })).toBeVisible();
  });

  it("pokazuje błędy walidacji przy próbie wysłania pustego formularza", async () => {
    render(<LoginForm />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /zaloguj się/i }));

    expect(await screen.findByText(/podaj adres e-mail/i)).toBeVisible();
    expect(await screen.findByText(/hasło nie może być puste/i)).toBeVisible();
    expect(
      screen.getByText(/popraw pola oznaczone na czerwono/i),
    ).toBeVisible();
  });
});

