globalThis.process ??= {}; globalThis.process.env ??= {};
import { o as objectType, k as stringType } from './astro/server_Df_JRoM_.mjs';

const loginCommandSchema = objectType({
  email: stringType({
    required_error: "Email is required"
  }).trim().min(1, "Email is required").email("Email must be a valid email address"),
  password: stringType({
    required_error: "Password is required"
  }).min(1, "Password is required")
});
const registerCommandSchema = objectType({
  email: stringType({
    required_error: "Email is required"
  }).trim().min(1, "Email is required").email("Email must be a valid email address"),
  password: stringType({
    required_error: "Password is required"
  }).min(8, "Password must be at least 8 characters long")
});

export { loginCommandSchema as l, registerCommandSchema as r };
