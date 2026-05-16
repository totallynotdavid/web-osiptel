import type { JSX } from "solid-js";

export function EmptyState(props: { children: JSX.Element }) {
  return (
    <div class="bg-surface border border-gray-900 rounded-sm p-8 flex items-center justify-center">
      <p class="text-xs uppercase tracking-widest text-gray-600">{props.children}</p>
    </div>
  );
}
