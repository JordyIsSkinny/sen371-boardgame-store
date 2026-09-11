// Checkbox (Figma 66:14). checked: true | false.
// Figma's checked-state check mark is an exported SVG asset with a 7-day
// expiring URL; drawn inline here instead so it doesn't rot, and a real
// <input type="checkbox"> sits underneath (transparent, absolutely
// positioned) so this stays keyboard- and screen-reader-accessible rather
// than being the purely decorative div Figma's reference code produces.
export function Checkbox({ checked = false, onChange, className = "", ...props }) {
  return (
    <span
      className={`relative inline-flex size-5 shrink-0 items-center justify-center rounded-input border ${
        checked ? "border-primary-500 bg-primary-500" : "border-neutral-300 bg-white"
      } ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        {...props}
      />
      {checked && (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="pointer-events-none size-full">
          <path
            d="M5 10.5l3 3 7-7"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}
