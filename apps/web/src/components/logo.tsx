import { Show } from "solid-js";

export function Logo(props: { size?: number; detail?: boolean }) {
  const size = () => props.size ?? 20;
  return (
    <svg width={size()} height={size()} viewBox="0 0 32 32" fill="none" class="text-cyan">
      <path
        d="M16 2L30 9V23L16 30L2 23V9L16 2Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <Show when={props.detail}>
        <path
          d="M16 2V16M30 9L16 16M2 9L16 16M16 30V16M30 23L16 16M2 23L16 16"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
          opacity="0.4"
        />
      </Show>
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}
