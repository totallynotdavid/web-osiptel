export function ProgressBar(props: { value: number }) {
  return (
    <div class="w-full h-px bg-gray-800 rounded-full">
      <div
        class="h-px bg-cyan rounded-full transition-[width] duration-500 ease-in-out"
        style={{ width: `${props.value}%` }}
      />
    </div>
  );
}
