import type { JSX } from "solid-js";
import styles from "./badge.module.css";

type BadgeVariant = "cyan" | "amber" | "red" | "muted";

export function Badge(props: { variant: BadgeVariant; children: JSX.Element }) {
  return <span class={`${styles.badge} ${styles[props.variant]}`}>{props.children}</span>;
}
