export function EmptyState({ title = "Nothing here yet.", message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      {message && (
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
      )}
    </div>
  );
}
