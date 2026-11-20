import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PATHS } from "@/app/router/paths";
import { normalizeEmail } from "@/utils/email";
import { AuthLayout } from "../components/AuthLayout";
import { FormAlert } from "../components/FormAlert";
import { PasswordField } from "../components/PasswordField";
import { useLoginMutation } from "../hooks";
import { readRegisteredEmail } from "../routeState";
import { useAuthForm } from "../useAuthForm";
import { validateLogin } from "../validation";
import type { LoginValues } from "../validation";

export function LoginPage() {
  const location = useLocation();
  const registeredEmail = readRegisteredEmail(location.state);
  const login = useLoginMutation();
  const form = useAuthForm<LoginValues>({ email: registeredEmail ?? "", password: "" }, validateLogin);

  // Redirect after success is handled by GuestOnly, which sends the user back to where they came from.
  const onSubmit = form.handleSubmit((values) =>
    login.mutate({ email: normalizeEmail(values.email), password: values.password }),
  );

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your CryptoVerse account."
      footer={
        <>
          New to CryptoVerse?{" "}
          <Link to={PATHS.register} className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {registeredEmail && (
          <FormAlert tone="success">Account created. Sign in to continue.</FormAlert>
        )}
        {login.isError && <FormAlert tone="error">{login.error.message}</FormAlert>}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...form.bind("email")}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          {...form.bind("password")}
        />
        <Button type="submit" fullWidth loading={login.isPending}>
          {login.isPending ? "Signing in" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
