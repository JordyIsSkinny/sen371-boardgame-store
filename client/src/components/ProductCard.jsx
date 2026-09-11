import { Link } from "react-router-dom";
import { StockBadge } from "./StockBadge.jsx";

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

// ProductCard (Figma 68:38). state: default | hover | out-of-stock — hover
// is real CSS (`hover:`), not a prop, same reasoning as Button. `status` is
// passed straight through to StockBadge rather than re-deriving it, since
// Figma's own reference duplicated StockBadge's markup inline instead of
// reusing the component — reuse is more correct here. Deliberately never
// passes a count into StockBadge — every ProductCard instance in Figma
// (S1/S2's grids, S3's related-products row) shows a plain "In stock", not
// "In stock · N available"; that richer text is Product Detail's own
// page-level badge only. See StockBadge's own comment.
//
// Figma's cover art was a placeholder ellipse graphic, not a real asset;
// replaced with an `imageUrl` prop + solid-colour fallback so this renders
// real product photos. Corner radius follows Figma's literal 12px
// (`rounded-modal`) even though docs/design-system.md currently scopes
// that token to "modals" — worth a docs role tweak, not resolved here.
export function ProductCard({
  id,
  title,
  category,
  stats,
  price,
  imageUrl,
  rating,
  reviewCount,
  status = "in-stock",
  className = "",
}) {
  const outOfStock = status === "out-of-stock";

  return (
    <Link
      to={`/products/${id}`}
      className={`flex h-full flex-col overflow-hidden rounded-modal border bg-white transition ${
        outOfStock ? "border-neutral-300 opacity-60" : "border-neutral-300 hover:border-primary-300 hover:shadow-lg"
      } ${className}`}
    >
      <div className="aspect-square w-full bg-primary-300">
        {imageUrl && <img src={imageUrl} alt={title} className="h-full w-full object-cover" />}
      </div>

      <div className="flex flex-col gap-1.5 px-4 pb-4 pt-3.5">
        <h3 className="font-heading text-body-lg font-medium text-neutral-900">{title}</h3>
        {category && <p className="text-small text-neutral-500">{category}</p>}
        {stats && <p className="text-caption text-neutral-700">{stats}</p>}
        {rating != null && (
          <p className="text-small text-neutral-700">
            &#9733; {rating.toFixed(1)} {reviewCount != null && `(${reviewCount})`}
          </p>
        )}

        <div className="flex items-center justify-between pt-1.5">
          <span className="font-heading text-h4 font-semibold text-neutral-900">
            {price != null && currency.format(Number(price))}
          </span>
          <StockBadge status={status} />
        </div>
      </div>
    </Link>
  );
}
