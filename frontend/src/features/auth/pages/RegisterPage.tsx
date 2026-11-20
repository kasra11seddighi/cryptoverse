import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PATHS } from "@/app/router/paths";
import { normalizeEmail } from "@/utils/email";
import { AuthLayout } from "../components/AuthLayout";
import { EmailSuggestion } from "../components/EmailSuggestion";
import { FormAlert } from "../components/FormAlert";
import { PasswordField } from "../components/PasswordField";
import { useRegisterMutation } from "../hooks";
import { useAuthForm } from "../useAuthForm";
import { useEmailSuggestion } from "../useEmailSuggestion";
import { validateRegister } from "../validation";
import type { RegisterValues } from "../validation";

const INITIAL_VALUES: RegisterValues = { name: "", email: "", password: "", confirmPassword: "" };

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegisterMutation();
  const form = useAuthForm<RegisterValues>(INITIAL_VALUES, validateRegister);
  const emailHint = useEmailSuggestion(form.values.email, form.isFieldVisible("email"));
  const [blockedSubmits, setBlockedSubmits] = useState(0);

  const emailField = form.bind("email");
  const hintShown = emailHint.visible && emailField.error === undefined;

  const onSubmit = form.handleSubmit((values) => {
    // A likely typo must be resolved (use the suggestion or keep the original) before sending.
    if (emailHint.pending) {
      setBlockedSubmits((count) => count + 1);
      return;
    }

    const email = normalizeEmail(values.email);
    register.mutate(
      { name: values.name.trim(), email, password: values.password },
      {
        onSuccess: () =>
          navigate(PATHS.login, { replace: true, state: { registeredEmail: email } }),
      },
    );
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start exploring the market with a simulated portfolio."
      footer={
        <>
          Already have an account?{" "}
          <Link to={PATHS.login} className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {register.isError && <FormAlert tone="error">{register.error.message}</FormAlert>}

        <TextField label="Name" autoComplete="name" placeholder="Your name" {...form.bind("name")} />
        <div>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...emailField}
          />
          <EmailSuggestion
            suggestion={hintShown ? emailHint.pending : null}
            original={emailHint.original}
            onAccept={(suggestion) => form.setValue("email", suggestion)}
            onKeep={emailHint.keepOriginal}
            focusSignal={blockedSubmits}
          />
        </div>
        <PasswordField
          label="Password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          {...form.bind("password")}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          {...form.bind("confirmPassword")}
        />
        <Button type="submit" fullWidth loading={register.isPending}>
          {register.isPending ? "Creating account" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
