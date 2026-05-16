import { Show, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import styles from "./input.module.css";

type InputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ["label", "error"]);

  return (
    <div class="flex flex-col gap-1.5">
      <label class={styles.label}>{local.label}</label>
      <input {...rest} class={styles.field} />
      <Show when={local.error}>
        <p class="text-xs text-red-400">{local.error}</p>
      </Show>
    </div>
  );
}
