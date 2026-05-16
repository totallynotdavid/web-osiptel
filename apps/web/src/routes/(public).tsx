import { type JSX } from "solid-js";

export default function PublicLayout(props: { children: JSX.Element }) {
  return <>{props.children}</>;
}
