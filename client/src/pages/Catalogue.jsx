import { useEffect, useState } from "react";
import { apiClient } from "../api/client.js";
import { Checkbox } from "../components/Checkbox.jsx";
import { FilterChip } from "../components/FilterChip.jsx";
import { ProductCard } from "../components/ProductCard.jsx";

// S2 Catalogue (issue #68). Rebuilt against the real Figma frame (node
// 73:8) rather than the low-fi wireframe this was first built from — see
// PR #100 for the before/after — and re-skinned onto the shared component
// library (#110) per #108: Checkbox, FilterChip and ProductCard replace
// the hand-rolled versions that used to live in this file. One correction
// along the way, back when this was first rebuilt: a comment here used to
// claim a Mechanics filter group was "rendered because the design system
// calls for it." That wasn't true — the real S2 sidebar has exactly seven
// filter groups (Category, Player count, Playtime, Age rating, Complexity,
// Price, In stock only), no Mechanics group at all. Removed rather than
// kept as a guess. Product has no mechanics field either way, so it was
// never wireable regardless of the design question.
//
// Not everything in the sidebar has a shared component to re-skin onto —
// there's no Select/Range/Toggle component in the library (only the seven
// named in #108/#110), so Player count, Age rating, Sort, Complexity,
// Price and In-stock-only all keep their existing hand-styled markup.
// "Clear all" also stays plain text rather than becoming a Button — Figma
// renders it as plain text too (node 73:29), not a Button instance.
//
// The filter sidebar, sort control, and pagination below are fully
// interactive as local UI state — the currency, so to speak, changes hands
// in this component. What they don't do yet is trigger a new request:
// turning that local state into ?playerCount=2&categoryId=3 query params
// against GET /products (and the equivalent product/order data-fetching
// hooks) is issue #75, not this one. Every place that boundary applies is
// commented below.
//
// Two more gaps the real design has that this doesn't, tracked in #111:
// ProductCard omits the star-rating line Figma shows on every card (`★ 4.4
// (42)`) — GET /products doesn't return an aggregate rating, and faking one
// would be worse than not showing it. Sort also has no Rating option
// (Figma defaults to "Sort: Rating") for the same reason: nothing computes
// one server-side yet.

const PLAYTIME_BUCKETS = [
  { label: "Under 30 min", max: 30 },
  { label: "30-60 min", max: 60 },
  { label: "60-120 min", max: 120 },
  { label: "120+ min", max: Infinity },
];

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

function formatStats(product) {
  const players =
    product.minPlayers === product.maxPlayers
      ? `${product.minPlayers}`
      : `${product.minPlayers}-${product.maxPlayers}`;
  return `${players} · ${product.playTimeMinutes}m · ${product.minAge}+ · ${Number(product.complexityRating).toFixed(1)}`;
}

// Matches ProductDetail.jsx's own threshold — kept as a small page-local
// helper rather than a shared util, same call as formatStats above (this
// file and ProductDetail.jsx have duplicated that one for a while now).
function stockStatus(quantityOnHand) {
  if (quantityOnHand <= 0) return "out-of-stock";
  if (quantityOnHand <= 5) return "low-stock";
  return "in-stock";
}

export function Catalogue() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState("loading");

  // Filter sidebar state — local only, see the note at the top of the file.
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [playerCount, setPlayerCount] = useState("");
  const [selectedPlaytime, setSelectedPlaytime] = useState([]);
  const [ageRating, setAgeRating] = useState("");
  const [complexity, setComplexity] = useState(5);
  const [price, setPrice] = useState(1500);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("rating");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          apiClient.get("/products"),
          apiClient.get("/categories"),
        ]);
        if (cancelled) return;
        setProducts(productsRes.data);
        setMeta(productsRes.meta ?? null);
        setCategories(categoriesRes.data);
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

  function toggleCategory(name) {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }
  function togglePlaytime(label) {
    setSelectedPlaytime((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label]
    );
  }
  function clearAll() {
    setSelectedCategories([]);
    setPlayerCount("");
    setSelectedPlaytime([]);
    setAgeRating("");
    setComplexity(5);
    setPrice(1500);
    setInStockOnly(false);
  }

  const activeChips = [
    ...selectedCategories.map((c) => ({ key: `cat-${c}`, label: c, onRemove: () => toggleCategory(c) })),
    ...(playerCount ? [{ key: "players", label: `${playerCount} players`, onRemove: () => setPlayerCount("") }] : []),
    ...selectedPlaytime.map((p) => ({ key: `time-${p}`, label: p, onRemove: () => togglePlaytime(p) })),
    ...(ageRating ? [{ key: "age", label: `${ageRating}+`, onRemove: () => setAgeRating("") }] : []),
    ...(inStockOnly ? [{ key: "stock", label: "In stock", onRemove: () => setInStockOnly(false) }] : []),
  ];

  return (
    <section>
      <nav className="text-sm text-neutral-500">
        <span>Home</span> / <span className="text-neutral-700">Catalogue</span>
      </nav>

      <div className="mt-2 flex items-baseline gap-3">
        <h1 className="font-heading text-h2 text-primary-900">Board games</h1>
        {meta && <span className="text-neutral-500">{meta.total} games</span>}
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-64">
          <div className="flex items-center justify-between">
            <h2 className="text-h4 font-heading text-primary-900">Filters</h2>
            <button type="button" onClick={clearAll} className="text-sm text-primary-500 hover:underline">
              Clear All
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-6">
            <fieldset>
              <legend className="text-sm font-semibold text-neutral-800">Category</legend>
              <div className="mt-2 flex flex-col gap-1.5">
                {categories.map((category) => (
                  <label key={category.id} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                    <Checkbox
                      checked={selectedCategories.includes(category.name)}
                      onChange={() => toggleCategory(category.name)}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="text-sm font-semibold text-neutral-800" htmlFor="player-count">
                Player count
              </label>
              <select
                id="player-count"
                value={playerCount}
                onChange={(e) => setPlayerCount(e.target.value)}
                className="mt-2 w-full rounded-input border border-neutral-200 px-3 py-2 text-sm text-neutral-800"
              >
                <option value="">Any</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} player{n === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-neutral-800">Playtime</legend>
              <div className="mt-2 flex flex-col gap-1.5">
                {PLAYTIME_BUCKETS.map((bucket) => (
                  <label key={bucket.label} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                    <Checkbox
                      checked={selectedPlaytime.includes(bucket.label)}
                      onChange={() => togglePlaytime(bucket.label)}
                    />
                    {bucket.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="text-sm font-semibold text-neutral-800" htmlFor="age-rating">
                Age Rating
              </label>
              <select
                id="age-rating"
                value={ageRating}
                onChange={(e) => setAgeRating(e.target.value)}
                className="mt-2 w-full rounded-input border border-neutral-200 px-3 py-2 text-sm text-neutral-800"
              >
                <option value="">Any</option>
                {[3, 6, 8, 10, 12, 14, 18].map((age) => (
                  <option key={age} value={age}>
                    {age}+
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-neutral-800" htmlFor="complexity">
                Complexity <span className="font-normal text-neutral-500">up to {complexity.toFixed(1)}</span>
              </label>
              <input
                id="complexity"
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={complexity}
                onChange={(e) => setComplexity(Number(e.target.value))}
                className="mt-2 w-full accent-primary-600"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-neutral-800" htmlFor="price">
                Price <span className="font-normal text-neutral-500">up to {currency.format(price)}</span>
              </label>
              <input
                id="price"
                type="range"
                min="200"
                max="1500"
                step="50"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-2 w-full accent-primary-600"
              />
            </div>

            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-800">In stock only</span>
              <button
                type="button"
                role="switch"
                aria-checked={inStockOnly}
                onClick={() => setInStockOnly((v) => !v)}
                className={`relative h-6 w-11 rounded-pill transition-colors ${inStockOnly ? "bg-primary-600" : "bg-neutral-200"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${inStockOnly ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </label>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <FilterChip key={chip.key} onRemove={chip.onRemove}>
                  {chip.label}
                </FilterChip>
              ))}
              {activeChips.length === 0 && (
                <span className="text-sm text-neutral-500">No filters applied</span>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              Sort:
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-input border border-neutral-200 px-2 py-1.5 text-sm"
              >
                {/* "Rating" matches Figma's default, but nothing computes an
                    aggregate rating server-side yet (#111) — selecting it
                    is a no-op until #75 wires sorting up regardless. */}
                <option value="rating">Rating</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="title">Title</option>
              </select>
            </label>
          </div>

          {status === "loading" && (
            <p className="mt-8 text-neutral-500">Loading games&hellip;</p>
          )}
          {status === "error" && (
            <p className="mt-8 text-red-600">
              Couldn&rsquo;t load the catalogue. Try refreshing the page.
            </p>
          )}
          {status === "ready" && products.length === 0 && (
            <p className="mt-8 text-neutral-500">No games in the catalogue yet.</p>
          )}

          {status === "ready" && products.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  category={product.categories[0]?.name}
                  stats={formatStats(product)}
                  price={product.price}
                  imageUrl={product.imageUrl}
                  status={stockStatus(product.inventory?.quantityOnHand ?? 0)}
                />
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <span
                  key={pageNum}
                  className={`flex h-9 w-9 items-center justify-center rounded-input text-sm ${
                    pageNum === meta.page
                      ? "bg-primary-900 text-neutral-100"
                      : "border border-neutral-200 text-neutral-700"
                  }`}
                >
                  {pageNum}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
