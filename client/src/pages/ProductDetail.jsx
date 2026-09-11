import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Button } from "../components/Button.jsx";
import { StockBadge } from "../components/StockBadge.jsx";
import { ProductCard } from "../components/ProductCard.jsx";

// S3 Product Detail (issue #69). Rebuilt against the real Figma frame
// (node 84:117) rather than the low-fi wireframe it was first built from —
// see PR #107 for the before/after — and re-skinned onto the shared
// component library (#110) per #108: Button, StockBadge and ProductCard
// replace hand-rolled markup that used to live in this file (the
// RelatedCard helper and the inline "Add to Cart" button are both gone).
//
// No shared Tabs, Select, or Textarea component exists in the library, so
// the Description/Specifications/Reviews tabs, the quantity stepper, and
// the review form all keep their existing hand-styled markup.
//
// A few things the design shows that the schema can't back are
// deliberately left out rather than faked, tracked in #111: mechanics
// chips (Product has no mechanics field, same gap as Catalogue's filter),
// a Year attribute (no column for it), and the three image thumbnails
// under the main photo (Product has one imageUrl, not a gallery) — the
// main image is shown alone instead.
//
// "Add to Cart" posts straight to POST /cart/items via apiClient, the same
// direct-call pattern Catalogue (S2) uses — there's no CartContext yet
// because cart state itself is #74 (S4), not this issue. What's here is
// scoped to making the button work, not to rendering a cart badge/count in
// the header, which is #74's to build.
//
// Prices render with cents (Intl currency formatting) rather than Figma's
// rounded whole-number mockup values (`R 899`) — real prices aren't
// guaranteed to be round, and hiding the cents would misrepresent the
// actual charge.

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

function formatStats(product) {
  const players =
    product.minPlayers === product.maxPlayers
      ? `${product.minPlayers}`
      : `${product.minPlayers}-${product.maxPlayers}`;
  return `${players} players · ${product.playTimeMinutes} min · Ages ${product.minAge}+ · Complexity ${Number(product.complexityRating).toFixed(1)}`;
}

// Matches Catalogue.jsx's own threshold — see that file's comment.
function stockStatus(quantityOnHand) {
  if (quantityOnHand <= 0) return "out-of-stock";
  if (quantityOnHand <= 5) return "low-stock";
  return "in-stock";
}

function Stars({ value }) {
  const rounded = Math.round(value);
  return (
    <span className="tracking-wide text-accent" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {"★ ".repeat(rounded)}
      <span className="text-neutral-300">{"☆ ".repeat(5 - rounded)}</span>
    </span>
  );
}

function ReviewForm({ productId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const { data } = await apiClient.post(`/products/${productId}/reviews`, { rating, comment });
      setComment("");
      setStatus("idle");
      onSubmitted(data);
    } catch (err) {
      setStatus("idle");
      setError(err.message ?? "Couldn't submit your review. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 rounded-card border border-neutral-200 bg-white p-4">
      <h3 className="text-h4 font-heading text-primary-900">Write a review</h3>
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        Rating
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="rounded-input border border-neutral-200 px-2 py-1.5 text-sm"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What did you think?"
        rows={3}
        className="w-full rounded-input border border-neutral-200 px-3 py-2 text-sm text-neutral-800"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="self-start rounded-card bg-primary-900 px-4 py-2 text-sm font-medium text-neutral-100 disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}

const TABS = ["Description", "Specifications", "Reviews"];

export function ProductDetail() {
  const { productId } = useParams();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState("loading");
  const [quantity, setQuantity] = useState(1);
  const [cartStatus, setCartStatus] = useState("idle");
  const [cartError, setCartError] = useState(null);
  const [activeTab, setActiveTab] = useState("Description");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setActiveTab("Description");
      try {
        const [productRes, reviewsRes] = await Promise.all([
          apiClient.get(`/products/${productId}`),
          apiClient.get(`/products/${productId}/reviews`),
        ]);
        if (cancelled) return;
        setProduct(productRes.data);
        setReviews(reviewsRes.data);
        setQuantity(1);
        setStatus("ready");

        // "You might also like" (S3, node 84:179) — same category, current
        // product excluded client-side since GET /products has no
        // exclude-id param.
        const categoryId = productRes.data.categories?.[0]?.id;
        if (categoryId) {
          const relatedRes = await apiClient.get(`/products?categoryId=${categoryId}&pageSize=5`);
          if (cancelled) return;
          setRelated(relatedRes.data.filter((p) => p.id !== productRes.data.id).slice(0, 4));
        }
      } catch (err) {
        if (cancelled) return;
        setStatus(err.status === 404 ? "not-found" : "error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function handleAddToCart() {
    setCartStatus("submitting");
    setCartError(null);
    try {
      await apiClient.post("/cart/items", { productId: Number(productId), quantity });
      setCartStatus("added");
    } catch (err) {
      setCartStatus("idle");
      setCartError(err.message ?? "Couldn't add this to your cart. Try again.");
    }
  }

  if (status === "loading") {
    return <p className="mt-8 text-neutral-500">Loading game&hellip;</p>;
  }
  if (status === "not-found") {
    return (
      <div className="mt-8">
        <p className="text-neutral-700">This game isn&rsquo;t in the catalogue.</p>
        <Link to="/catalogue" className="text-primary-600 hover:underline">
          Back to the catalogue
        </Link>
      </div>
    );
  }
  if (status === "error") {
    return (
      <p className="mt-8 text-red-600">
        Couldn&rsquo;t load this game. Try refreshing the page.
      </p>
    );
  }

  const stock = product.inventory?.quantityOnHand ?? 0;
  const inStock = stock > 0;
  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return (
    <section>
      <nav className="text-sm text-neutral-500">
        <Link to="/" className="hover:underline">Home</Link>
        {"  /  "}
        <Link to="/catalogue" className="hover:underline">Catalogue</Link>
        {"  /  "}
        <span className="text-neutral-700">{product.title}</span>
      </nav>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="aspect-square w-full shrink-0 rounded-card bg-neutral-100 lg:w-[35rem]">
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="h-full w-full rounded-card object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {product.categories[0] && (
            <p className="text-body text-primary-500">{product.categories[0].name}</p>
          )}
          <h1 className="font-heading text-h1 text-primary-900">{product.title}</h1>

          {averageRating !== null && (
            <div className="mt-2 flex items-center gap-2 text-small text-neutral-700">
              <Stars value={averageRating} />
              <span>
                {averageRating.toFixed(1)} out of 5 · {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </span>
            </div>
          )}

          <p className="mt-4 font-heading text-h2 text-neutral-900">{currency.format(Number(product.price))}</p>

          <div className="mt-2">
            <StockBadge status={stockStatus(stock)} count={stock} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 rounded-modal border border-neutral-200 bg-white p-4 text-small sm:grid-cols-4">
            <div>
              <dt className="text-caption text-neutral-500">Players</dt>
              <dd className="mt-1 font-medium text-neutral-900">
                {product.minPlayers === product.maxPlayers
                  ? product.minPlayers
                  : `${product.minPlayers}–${product.maxPlayers}`}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-neutral-500">Playtime</dt>
              <dd className="mt-1 font-medium text-neutral-900">{product.playTimeMinutes} min</dd>
            </div>
            <div>
              <dt className="text-caption text-neutral-500">Age</dt>
              <dd className="mt-1 font-medium text-neutral-900">{product.minAge}+</dd>
            </div>
            <div>
              <dt className="text-caption text-neutral-500">Complexity</dt>
              <dd className="mt-1 font-medium text-neutral-900">{Number(product.complexityRating).toFixed(1)} / 5</dd>
            </div>
            {product.designer && (
              <div>
                <dt className="text-caption text-neutral-500">Designer</dt>
                <dd className="mt-1 font-medium text-neutral-900">{product.designer}</dd>
              </div>
            )}
            {product.publisher && (
              <div>
                <dt className="text-caption text-neutral-500">Publisher</dt>
                <dd className="mt-1 font-medium text-neutral-900">{product.publisher}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex items-center gap-3">
            {user ? (
              <>
                <div className="flex h-12 w-28 items-center justify-between rounded-card border border-neutral-200 bg-white px-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={!inStock}
                    aria-label="Decrease quantity"
                    className="text-lg text-neutral-700 disabled:opacity-40"
                  >
                    &minus;
                  </button>
                  <span className="font-medium text-neutral-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(stock || 1, q + 1))}
                    disabled={!inStock}
                    aria-label="Increase quantity"
                    className="text-lg text-neutral-700 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <Button
                  onClick={handleAddToCart}
                  state={!inStock || cartStatus === "submitting" ? "disabled" : "default"}
                  className="flex-1 sm:max-w-[280px]"
                >
                  {cartStatus === "added" ? "Added" : cartStatus === "submitting" ? "Adding…" : "Add to cart"}
                </Button>
              </>
            ) : (
              <Link
                to="/login"
                state={{ from: { pathname: `/products/${productId}` } }}
                className="h-12 rounded-card bg-primary-500 px-5 py-3 text-small font-medium text-white transition hover:bg-primary-700"
              >
                Log in to add to cart
              </Link>
            )}
          </div>
          {cartError && <p className="mt-2 text-sm text-red-600">{cartError}</p>}
        </div>
      </div>

      <div className="mt-12">
        <div className="flex border-b border-neutral-200">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`h-12 w-48 text-small font-medium ${
                activeTab === tab
                  ? "border-b-2 border-primary-500 text-primary-700"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {tab === "Reviews" ? `Reviews (${reviews.length})` : tab}
            </button>
          ))}
        </div>

        <div className="rounded-b-modal border border-t-0 border-neutral-200 bg-white p-6">
          {activeTab === "Description" && (
            <p className="whitespace-pre-line text-small leading-relaxed text-neutral-700">
              {product.description || "No description yet."}
            </p>
          )}

          {activeTab === "Specifications" && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-small sm:grid-cols-3">
              <div>
                <dt className="text-caption text-neutral-500">Players</dt>
                <dd className="mt-1 text-neutral-900">
                  {product.minPlayers === product.maxPlayers
                    ? product.minPlayers
                    : `${product.minPlayers}–${product.maxPlayers}`}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-neutral-500">Playtime</dt>
                <dd className="mt-1 text-neutral-900">{product.playTimeMinutes} min</dd>
              </div>
              <div>
                <dt className="text-caption text-neutral-500">Minimum age</dt>
                <dd className="mt-1 text-neutral-900">{product.minAge}+</dd>
              </div>
              <div>
                <dt className="text-caption text-neutral-500">Complexity</dt>
                <dd className="mt-1 text-neutral-900">{Number(product.complexityRating).toFixed(1)} / 5</dd>
              </div>
              {product.designer && (
                <div>
                  <dt className="text-caption text-neutral-500">Designer</dt>
                  <dd className="mt-1 text-neutral-900">{product.designer}</dd>
                </div>
              )}
              {product.publisher && (
                <div>
                  <dt className="text-caption text-neutral-500">Publisher</dt>
                  <dd className="mt-1 text-neutral-900">{product.publisher}</dd>
                </div>
              )}
            </dl>
          )}

          {activeTab === "Reviews" && (
            <div>
              {reviews.length === 0 && (
                <p className="text-neutral-500">No reviews yet — be the first to play and review it.</p>
              )}

              <ul className="flex flex-col gap-4">
                {reviews.map((review) => (
                  <li key={review.id} className="rounded-card border border-neutral-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary-900">
                        {review.user.firstName} {review.user.lastName}
                      </span>
                      <Stars value={review.rating} />
                    </div>
                    {review.comment && <p className="mt-2 text-sm text-neutral-700">{review.comment}</p>}
                  </li>
                ))}
              </ul>

              {user && (
                <ReviewForm
                  productId={productId}
                  // POST /reviews doesn't join the user relation (createReview
                  // just inserts), so the response has no `user` field to render
                  // — fill it in from the logged-in user instead of refetching.
                  // AuthContext's `user` is snake_case (first_name/last_name)
                  // fresh from login/register but camelCase from the /users/me
                  // silent refresh — an existing inconsistency in the auth
                  // endpoints, so read both until that's unified.
                  onSubmitted={(review) =>
                    setReviews((prev) => [
                      {
                        ...review,
                        user: {
                          firstName: user.firstName ?? user.first_name,
                          lastName: user.lastName ?? user.last_name,
                        },
                      },
                      ...prev,
                    ])
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="font-heading text-h3 text-primary-900">You might also like</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                title={p.title}
                category={p.categories?.[0]?.name}
                stats={formatStats(p)}
                price={p.price}
                imageUrl={p.imageUrl}
                status={stockStatus(p.inventory?.quantityOnHand ?? 0)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
