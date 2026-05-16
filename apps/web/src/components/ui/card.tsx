import type { JSX } from "solid-js";
import styles from "./card.module.css";

export function Card(props: { class?: string; children: JSX.Element }) {
  return (
    <div class={`${styles.card}${props.class ? ` ${props.class}` : ""}`}>{props.children}</div>
  );
}
