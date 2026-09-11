const STATUS_STYLES = {
  "in-stock": { tint: "bg-success-tint", text: "text-success" },
  "low-stock": { tint: "bg-warning-tint", text: "text-warning" },
  "out-of-stock": { tint: "bg-neutral-tint", text: "text-neutral-700" },
};

// Pure on purpose so the variant->label mapping is unit-testable later —
// client/package.json has no test runner configured yet (no vitest/RTL,
// only dev/build/preview scripts), so no test file is added here, but the
// logic is kept small and isolated rather than inlined into JSX.
function label(status, count) {
  if (status === "low-stock") return count != null ? `Only ${count} left` : "Low stock";
  if (status === "out-of-stock") return "Out of stock";
  return "In stock";
}

// StockBadge (Figma 66:27). status: in-stock | low-stock | out-of-stock.
// `count` only affects the low-stock label ("Only N left") — Figma's mockup
// hardcoded "Only 3 left", but real stock counts vary per product.
// Out-of-stock intentionally does not use the `error` token — it isn't a
// fault state in this design, it uses `neutral-700` (confirmed via
// get_variable_defs on this component in Figma).
export function StockBadge({ status = "in-stock", count, className = "" }) {
  const variant = STATUS_STYLES[status] ?? STATUS_STYLES["in-stock"];

  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-1 font-body text-caption font-medium ${variant.tint} ${variant.text} ${className}`}
    >
      {label(status, count)}
    </span>
  );
}
