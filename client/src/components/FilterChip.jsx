// FilterChip (Figma 66:20). removable: true | false.
export function FilterChip({ children, removable = true, onRemove, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill bg-primary-100 py-1.5 pl-3 pr-2.5 font-body text-small font-medium text-primary-700 ${className}`}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${children} filter`}
          className="text-primary-700 hover:text-primary-900"
        >
          &times;
        </button>
      )}
    </span>
  );
}
