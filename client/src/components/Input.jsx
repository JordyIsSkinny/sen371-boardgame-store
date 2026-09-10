// Input (Figma 66:10). state: default | focus | error | disabled — focus is
// real CSS (`focus:`), not a prop, for the same reason as Button's hover.
// Figma's frame was a fixed 320px wide; real form inputs here need to fill
// their container (see Login/Register), so width is `w-full` instead.
export function Input({ state = "default", type = "text", className = "", ...props }) {
  const disabled = state === "disabled";
  const error = state === "error";

  return (
    <input
      type={type}
      disabled={disabled}
      className={`h-11 w-full rounded-input border bg-white px-3 font-body text-small text-neutral-900 outline-none transition placeholder:text-neutral-500 focus:border-2 focus:border-primary-500 ${
        error ? "border-error" : "border-neutral-300"
      } ${disabled ? "opacity-50" : ""} ${className}`}
      {...props}
    />
  );
}
