import { Link } from "react-router-dom";
import type { LinkProps } from "react-router-dom";
import { buttonClasses } from "./buttonStyles";
import type { ButtonSize, ButtonVariant } from "./buttonStyles";

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** A router link that looks like a button, for navigation actions. */
export function ButtonLink({ variant = "secondary", size = "md", children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size)} {...props}>
      {children}
    </Link>
  );
}
