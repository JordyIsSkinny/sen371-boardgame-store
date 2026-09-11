import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client.js";

// S1 Home (issue #67), built against the real Figma frame (node 123:231).
//
// Two deliberate deviations from the mockup, both to avoid showing
// something that isn't true:
// - "Browse by category" uses the real categories from GET /categories
//   (Card Games, Cooperative, Family, Party, Strategy) rather than Figma's
//   six example tiles — two of those ("Deck-building", "Two-player") aren't
//   real category rows. Tile colours cycle through real design tokens
//   instead of the arbitrary one-off hex Figma used per tile for visual
//   variety (only some of which were real tokens to begin with).
// - Figma's second product row is "Top rated", but neither GET /products
//   nor GET /products/:id returns an aggregate rating — same gap as
//   Catalogue's Sort dropdown, tracked in #111. Omitted rather than
//   showing an arbitrary set of products under a rating claim nothing
//   backs; "New arrivals" (real: sorted by createdAt) stands alone.
//
// Category tiles link to /catalogue rather than a pre-filtered view —
// Catalogue's filters are local-only state until #75 wires them to query
// params, so there's nothing to deep-link into yet.

const TILE_COLORS = ["bg-primary-500", "bg-success", "bg-warning", "bg-primary-700", "bg-primary-900"];

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

function formatStats(product) {
  const players =
    product.minPlayers === product.maxPlayers
      ? `${product.minPlayers}`
      : `${product.minPlayers}-${product.maxPlayers}`;
  return `${players} · ${product.playTimeMinutes}m · ${product.minAge}+ · ${Number(product.complexityRating).toFixed(1)}`;
}

function ProductTile({ product }) {
  const inStock = (product.inventory?.quantityOnHand ?? 0) > 0;
  return (
    <Link
      to={`/products/${product.id}`}
      className="flex flex-col overflow-hidden rounded-modal border border-neutral-200 bg-white transition hover:border-primary-300 hover:shadow-lg"
    >
      <div className="aspect-square w-full bg-primary-300">
        {product.imageUrl && (
          <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-4 pb-4 pt-3.5">
        <h3 className="font-heading text-body-lg font-medium text-neutral-900">{product.title}</h3>
        {product.categories?.[0] && (
          <p className="text-small text-neutral-500">{product.categories[0].name}</p>
        )}
        <p className="text-caption text-neutral-700">{formatStats(product)}</p>
        <div className="flex items-center justify-between pt-1.5">
          <span className="font-heading text-h4 font-semibold text-neutral-900">
            {currency.format(Number(product.price))}
          </span>
          <span
            className={`rounded-pill px-2.5 py-0.5 text-xs font-medium ${
              inStock ? "bg-success-tint text-success" : "bg-neutral-tint text-neutral-700"
            }`}
          >
            {inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Home() {
  const [categories, setCategories] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          apiClient.get("/categories"),
          apiClient.get("/products?pageSize=4"),
        ]);
        if (cancelled) return;
        setCategories(categoriesRes.data);
        setNewArrivals(productsRes.data);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="-mt-4 overflow-x-hidden">
      {/* Full-bleed hero: Layout wraps every page in a max-w-6xl container,
          but Figma's hero spans the full width behind it. mx-[calc(50%-50vw)]
          breaks out of that constraint without touching Layout.jsx (which
          every other page also depends on). overflow-x-hidden on this
          wrapper clips the few px of sub-pixel bleed the `vw` unit produces
          when a vertical scrollbar is present (vw includes scrollbar width,
          the flex layout it's measured against doesn't) — scoped to this
          page only, not a global fix.

          The inner content div needs its own px-4, matching the sibling
          `max-w-6xl px-4 py-10` wrapper below (for Browse by category /
          New arrivals) — without it, this div's content sits flush with
          its own max-w-6xl box edge rather than inset like every other
          section on the page, which lands it 16px to the left of this
          wrapper's overflow-x-hidden clip boundary (that boundary tracks
          Layout's padded <main>, not the true viewport edge) and gets
          silently clipped: nearly invisible on the bold H1, but enough to
          eat a full character or two off the smaller paragraph text below
          it (e.g. "Strategy" rendering as "rategy"). */}
      <section className="relative mx-[calc(50%-50vw)] bg-primary-900 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="font-heading text-display font-semibold leading-tight text-white">
            Games worth
            <br />
            clearing the table for
          </h1>
          <p className="mt-4 max-w-xl text-body-lg text-primary-300">
            Strategy, family and co-operative board games — filtered by player count, playtime and
            complexity, so you find the right one first time.
          </p>
          <Link
            to="/catalogue"
            className="mt-8 inline-flex h-[52px] items-center justify-center rounded-card bg-accent px-7 text-small font-medium text-primary-900 transition hover:opacity-90"
          >
            Browse the catalogue
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {status === "error" && (
          <p className="text-red-600">Couldn&rsquo;t load the catalogue. Try refreshing the page.</p>
        )}

        {status !== "error" && (
          <>
            <section>
              <h2 className="font-heading text-h3 text-primary-900">Browse by category</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {categories.map((category, i) => (
                  <Link
                    key={category.id}
                    to="/catalogue"
                    className={`flex h-[140px] items-end overflow-hidden rounded-modal p-4 text-body-lg font-medium text-white transition hover:opacity-90 ${TILE_COLORS[i % TILE_COLORS.length]}`}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </section>

            <section className="mt-12">
              <div className="flex items-baseline justify-between">
                <h2 className="font-heading text-h3 text-primary-900">New arrivals</h2>
                <Link to="/catalogue" className="text-small text-primary-500 hover:underline">
                  View all &rsaquo;
                </Link>
              </div>

              {status === "loading" && <p className="mt-6 text-neutral-500">Loading games&hellip;</p>}

              {status === "ready" && newArrivals.length === 0 && (
                <p className="mt-6 text-neutral-500">No games in the catalogue yet.</p>
              )}

              {status === "ready" && newArrivals.length > 0 && (
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {newArrivals.map((product) => (
                    <ProductTile key={product.id} product={product} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
