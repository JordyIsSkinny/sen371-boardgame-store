export function LoadingState({ message = "Loading..." }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center py-12"
    >
      <p className="text-sm text-neutral-600">{message}</p>
    </div>
  );
}
