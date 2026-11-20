import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { FieldErrors } from "./validation";

/** Small form helper: errors appear after a field is blurred or after the first submit. */
export function useAuthForm<T extends Record<string, string>>(
  initialValues: T,
  validate: (values: T) => FieldErrors<T>,
) {
  const [values, setValues] = useState<T>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validate(values), [validate, values]);

  function bind(field: keyof T & string) {
    return {
      name: field,
      value: values[field],
      error: submitted || touched[field] ? errors[field] : undefined,
      onChange: (event: ChangeEvent<HTMLInputElement>) =>
        setValues((current) => ({ ...current, [field]: event.target.value })),
      onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
    };
  }

  function setValue(field: keyof T & string, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setTouched((current) => ({ ...current, [field]: true }));
  }

  /** True once the field was blurred or a submit was attempted. */
  function isFieldVisible(field: keyof T & string): boolean {
    return submitted || touched[field] === true;
  }

  function handleSubmit(onValid: (values: T) => void) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitted(true);
      if (Object.keys(errors).length === 0) onValid(values);
    };
  }

  return { values, bind, setValue, isFieldVisible, handleSubmit };
}
