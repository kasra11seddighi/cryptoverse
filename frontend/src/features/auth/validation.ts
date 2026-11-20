import { isValidEmailSyntax } from "@/utils/email";

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export type LoginValues = {
  email: string;
  password: string;
};

export type RegisterValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

function validateEmail(email: string): string | undefined {
  if (email.trim() === "") return "Email is required.";
  if (!isValidEmailSyntax(email)) return "Enter a valid email address, like name@example.com.";
  return undefined;
}

export function validateLogin(values: LoginValues): FieldErrors<LoginValues> {
  const errors: FieldErrors<LoginValues> = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  if (values.password === "") errors.password = "Password is required.";
  return errors;
}

export function validateRegister(values: RegisterValues): FieldErrors<RegisterValues> {
  const errors: FieldErrors<RegisterValues> = {};

  const name = values.name.trim();
  if (name === "") errors.name = "Name is required.";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters.";

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  // Only the basics are checked here; the backend stays the source of truth for password rules.
  if (values.password === "") errors.password = "Password is required.";
  else if (values.password.length < 8) errors.password = "Use at least 8 characters.";

  if (values.confirmPassword === "") errors.confirmPassword = "Confirm your password.";
  else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}
