import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

// S3 Product Detail (issue #69).
//
// "Add to Cart" posts straight to POST /cart/items via apiClient, the same
// direct-call pattern Catalogue (S2) uses — there's no CartContext yet
// because cart state itself is #74 (S4), not this issue. What's here is
// scoped to making the button work, not to rendering a cart badge/count in
// the header, which is #74's to build.

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

function formatStats(product) {
  const players =
    product.minPlayers === product.maxPlayers
      ? `${product.minPlayers}`
      : `${product.minPlayers}-${product.maxPlayers}`;
  return `${players} players · ${product.playTimeMinutes} min · Ages ${product.minAge}+ · Complexity ${Number(product.complexityRating).toFixed(1)}`;
}

function Stars({ value }) {
  const rounded = Math.round(value);
  return (
    <span className="text-accent" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {"★".repeat(rounded)}
      <span className="text-neutral-300">{"★".repeat(5 - rounded)}</span>
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

export function ProductDetail() {
  const { productId } = useParams();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState("loading");
  const [quantity, setQuantity] = useState(1);
  const [cartStatus, setCartStatus] = useState("idle");
  const [cartError, setCartError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
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
        <Link to="/" className="hover:underline">Home</Link> /{" "}
        <Link to="/catalogue" className="hover:underline">Catalogue</Link>
        {product.categories[0] && (
          <>
            {" "}/ <span>{product.categories[0].name}</span>
          </>
        )}
        {" "}/ <span className="text-neutral-700">{product.title}</span>
      </nav>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="aspect-square w-full shrink-0 rounded-card bg-neutral-100 lg:w-96">
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
            <p className="text-sm text-neutral-500">{product.categories[0].name}</p>
          )}
          <h1 className="font-heading text-h1 text-primary-900">{product.title}</h1>
          <p className="mt-1 text-neutral-600">{formatStats(product)}</p>

          {averageRating !== null && (
            <div className="mt-2 flex items-center gap-2">
              <Stars value={averageRating} />
              <span className="text-sm text-neutral-500">
                {averageRating.toFixed(1)} ({reviews.length} review{reviews.length === 1 ? "" : "s"})
              </span>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <span className="text-h2 font-heading text-primary-900">{currency.format(Number(product.price))}</span>
            <span
              className={`rounded-pill px-2.5 py-0.5 text-xs font-medium ${
                inStock ? "bg-primary-100 text-primary-900" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {inStock ? "In Stock" : "Out of Stock"}
            </span>
          </div>

          {product.description && (
            <p className="mt-4 text-body text-neutral-700">{product.description}</p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-neutral-600 sm:max-w-sm">
            {product.publisher && (
              <>
                <dt className="text-neutral-500">Publisher</dt>
                <dd>{product.publisher}</dd>
              </>
            )}
            {product.designer && (
              <>
                <dt className="text-neutral-500">Designer</dt>
                <dd>{product.designer}</dd>
              </>
            )}
          </dl>

          <div className="mt-6 flex items-center gap-3">
            {user ? (
              <>
                <label className="flex items-center gap-2 text-sm text-neutral-700" htmlFor="quantity">
                  Qty
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    max={stock || 1}
                    value={quantity}
                    disabled={!inStock}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-16 rounded-input border border-neutral-200 px-2 py-1.5 text-sm text-neutral-800"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!inStock || cartStatus === "submitting"}
                  className="rounded-card bg-primary-900 px-5 py-2.5 text-sm font-medium text-neutral-100 disabled:opacity-60"
                >
                  {cartStatus === "added" ? "Added" : cartStatus === "submitting" ? "Adding…" : "Add to Cart"}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                state={{ from: { pathname: `/products/${productId}` } }}
                className="rounded-card bg-primary-900 px-5 py-2.5 text-sm font-medium text-neutral-100"
              >
                Log in to add to cart
              </Link>
            )}
          </div>
          {cartError && <p className="mt-2 text-sm text-red-600">{cartError}</p>}
        </div>
      </div>

      <div className="mt-12 border-t border-neutral-200 pt-8">
        <h2 className="text-h3 font-heading text-primary-900">Reviews</h2>

        {reviews.length === 0 && (
          <p className="mt-3 text-neutral-500">No reviews yet — be the first to play and review it.</p>
        )}

        <ul className="mt-4 flex flex-col gap-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-card border border-neutral-200 bg-white p-4">
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
    </section>
  );
}
