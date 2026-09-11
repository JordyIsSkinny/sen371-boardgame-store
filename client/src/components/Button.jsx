const STYLE_CLASSES = {
  primary: {
    base: "bg-primary-500 text-white hover:bg-primary-700",
    disabled: "bg-primary-500 text-white opacity-40",
  },
  secondary: {
    base: "border border-primary-500 text-primary-700 hover:bg-primary-100",
    disabled: "border border-primary-500 text-primary-700 opacity-40",
  },
  ghost: {
    base: "text-primary-700 hover:bg-primary-100",
    disabled: "text-primary-700 opacity-40",
  },
};

// Button (Figma 65:25). style: primary | secondary | ghost. state: default |
// disabled — hover is real CSS (`hover:`), not a prop: Figma's separate
// "hover" variant was a static example for the mockup, not something
// calling code should ever set itself. Figma's frame was a fixed 160px
// wide to fit "Add to cart"; real buttons here have varying label length
// (see Login/Register), so width is left to content + padding instead.
export function Button({
  children,
  style = "primary",
  state = "default",
  type = "button",
  onClick,
  className = "",
}) {
  const disabled = state === "disabled";
  const variant = STYLE_CLASSES[style] ?? STYLE_CLASSES.primary;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 items-center justify-center rounded-card px-5 font-body text-small font-medium transition ${
        disabled ? variant.disabled : variant.base
      } ${className}`}
    >
      {children}
    </button>
  );
}
