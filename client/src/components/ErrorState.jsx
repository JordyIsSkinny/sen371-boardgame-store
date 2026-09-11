export function ErrorState({
  title = "Something went wrong.",
  message = "Please try again later.",
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <p className="mt-2 text-sm text-neutral-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-input bg-primary-900 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}
