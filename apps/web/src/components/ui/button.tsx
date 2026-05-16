import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import styles from "./button.module.css";

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
  loading?: boolean;
};

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ["variant", "loading", "class", "children"]);

  const cls = () => {
    if (local.variant === "ghost") return styles.ghost;
    if (local.variant === "outline") return styles.outline;
    return styles.primary;
  };

  return (
    <button
      type="button"
      {...rest}
      class={`${cls()}${local.class ? ` ${local.class}` : ""}`}
      disabled={rest.disabled || !!local.loading}
    >
      {local.children}
    </button>
  );
}
