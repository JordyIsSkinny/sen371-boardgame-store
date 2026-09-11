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
  return count != null ? `In stock · ${count} available` : "In stock";
}

// StockBadge (Figma 66:27). status: in-stock | low-stock | out-of-stock.
// `count` is opt-in, not automatic, because Figma uses it differently in
// different contexts: Product Detail's page-level badge shows "In stock ·
// 12 available" (S3, node 84:142), but the same badge embedded in a
// ProductCard grid tile just says "In stock" with no count (S2/S1's
// ProductCard instances). Pass `count` where the richer text is wanted
// (Product Detail's own badge) and omit it inside ProductCard usage —
// ProductCard itself never passes its `stockCount` prop through for this
// reason, see its own comment.
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
