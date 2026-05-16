import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import styles from "./select.module.css";

type SelectProps = JSX.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: JSX.Element;
};

export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, ["label", "children"]);

  return (
    <div class="flex flex-col gap-1.5">
      <label class={styles.label}>{local.label}</label>
      <select {...rest} class={styles.select}>
        {local.children}
      </select>
    </div>
  );
}
