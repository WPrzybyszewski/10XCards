import { z } from "zod";

export const loginCommandSchema = z.object({
  email: z
    .string({
      required_error: "Email is required",
    })
    .trim()
    .min(1, "Email is required")
    .email("Email must be a valid email address"),
  password: z
    .string({
      required_error: "Password is required",
    })
    .min(1, "Password is required"),
});

export const registerCommandSchema = z.object({
  email: z
    .string({
      required_error: "Email is required",
    })
    .trim()
    .min(1, "Email is required")
    .email("Email must be a valid email address"),
  password: z
    .string({
      required_error: "Password is required",
    })
    .min(8, "Password must be at least 8 characters long"),
});

export type LoginCommandInput = z.infer<typeof loginCommandSchema>;
export type RegisterCommandInput = z.infer<typeof registerCommandSchema>;


