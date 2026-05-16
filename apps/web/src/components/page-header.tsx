import { A } from "@solidjs/router";
import { Show } from "solid-js";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  backHref?: string;
  backLabel?: string;
};

export function PageHeader(props: PageHeaderProps) {
  return (
    <div class="mb-8">
      <Show when={props.backHref}>
        <A href={props.backHref!} class="link-accent mb-4 inline-block">
          ← {props.backLabel ?? "Back"}
        </A>
      </Show>
      <p class="eyebrow">{props.eyebrow}</p>
      <h1 class="page-title">{props.title}</h1>
    </div>
  );
}
