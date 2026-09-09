import { useEffect, useState } from "react";
import { apiClient } from "../api/client.js";

// S2 Catalogue (issue #68). The filter sidebar, sort control, and pagination
// below are fully interactive as local UI state — the currency, so to
// speak, changes hands in this component. What they don't do yet is trigger
// a new request: turning that local state into ?playerCount=2&categoryId=3
// query params against GET /products (and the equivalent product/order
// data-fetching hooks) is issue #75, not this one. Every place that
// boundary applies is commented below.

const PLAYTIME_BUCKETS = [
  { label: "Under 30 min", max: 30 },
  { label: "30-60 min", max: 60 },
  { label: "60-120 min", max: 120 },
  { label: "120+ min", max: Infinity },
];

// Not in the schema at all — Product has no mechanics field, so this group
// can't be wired to the API without a schema change. Rendered because the
// design system calls for it; left as local-only state like everything else.
const MECHANICS = ["Worker Placement", "Drafting", "Area Control", "Deck-Building"];

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

function formatStats(product) {
  const players =
    product.minPlayers === product.maxPlayers
      ? `${product.minPlayers}`
      : `${product.minPlayers}-${product.maxPlayers}`;
  return `${players} · ${product.playTimeMinutes}m · ${product.minAge}+ · ${Number(product.complexityRating).toFixed(1)}`;
}

function Checkbox({ checked, onChange, children }) {
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-neutral-300 text-primary-600 accent-primary-600"
      />
      {children}
    </label>
  );
}

function Chip({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-900">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${children} filter`}
        className="text-primary-600 hover:text-primary-900"
      >
        &times;
      </button>
    </span>
  );
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
  const [selectedMechanics, setSelectedMechanics] = useState([]);
  const [price, setPrice] = useState(2000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("newest");

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
  function toggleMechanic(name) {
    setSelectedMechanics((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  }
  function clearAll() {
    setSelectedCategories([]);
    setPlayerCount("");
    setSelectedPlaytime([]);
    setAgeRating("");
    setComplexity(5);
    setSelectedMechanics([]);
    setPrice(2000);
    setInStockOnly(false);
  }

  const activeChips = [
    ...selectedCategories.map((c) => ({ key: `cat-${c}`, label: c, onRemove: () => toggleCategory(c) })),
    ...(playerCount ? [{ key: "players", label: `${playerCount} players`, onRemove: () => setPlayerCount("") }] : []),
    ...selectedPlaytime.map((p) => ({ key: `time-${p}`, label: p, onRemove: () => togglePlaytime(p) })),
    ...(ageRating ? [{ key: "age", label: `${ageRating}+`, onRemove: () => setAgeRating("") }] : []),
    ...selectedMechanics.map((m) => ({ key: `mech-${m}`, label: m, onRemove: () => toggleMechanic(m) })),
    ...(inStockOnly ? [{ key: "stock", label: "In stock", onRemove: () => setInStockOnly(false) }] : []),
  ];

  return (
    <section>
      <nav className="text-sm text-neutral-500">
        <span>Home</span> / <span className="text-neutral-700">Catalogue</span>
      </nav>

      <div className="mt-2 flex items-baseline gap-3">
        <h1 className="font-heading text-h1 text-primary-900">Board Games</h1>
        {meta && <span className="text-neutral-500">{meta.total} games</span>}
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-64">
          <div className="flex items-center justify-between">
            <h2 className="text-h4 font-heading text-primary-900">Filters</h2>
            <button type="button" onClick={clearAll} className="text-sm text-primary-600 hover:underline">
              Clear All
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-6">
            <fieldset>
              <legend className="text-sm font-semibold text-neutral-800">Category</legend>
              <div className="mt-2 flex flex-col gap-1.5">
                {categories.map((category) => (
                  <Checkbox
                    key={category.id}
                    checked={selectedCategories.includes(category.name)}
                    onChange={() => toggleCategory(category.name)}
                  >
                    {category.name}
                  </Checkbox>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="text-sm font-semibold text-neutral-800" htmlFor="player-count">
                Player Count
              </label>
              <input
                id="player-count"
                type="number"
                min="1"
                placeholder="Any"
                value={playerCount}
                onChange={(e) => setPlayerCount(e.target.value)}
                className="mt-2 w-full rounded-input border border-neutral-200 px-3 py-2 text-sm text-neutral-800"
              />
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-neutral-800">Playtime</legend>
              <div className="mt-2 flex flex-col gap-1.5">
                {PLAYTIME_BUCKETS.map((bucket) => (
                  <Checkbox
                    key={bucket.label}
                    checked={selectedPlaytime.includes(bucket.label)}
                    onChange={() => togglePlaytime(bucket.label)}
                  >
                    {bucket.label}
                  </Checkbox>
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

            <fieldset>
              <legend className="text-sm font-semibold text-neutral-800">Mechanics</legend>
              <div className="mt-2 flex flex-col gap-1.5">
                {MECHANICS.map((mechanic) => (
                  <Checkbox
                    key={mechanic}
                    checked={selectedMechanics.includes(mechanic)}
                    onChange={() => toggleMechanic(mechanic)}
                  >
                    {mechanic}
                  </Checkbox>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="text-sm font-semibold text-neutral-800" htmlFor="price">
                Price <span className="font-normal text-neutral-500">up to {currency.format(price)}</span>
              </label>
              <input
                id="price"
                type="range"
                min="0"
                max="2000"
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
                <Chip key={chip.key} onRemove={chip.onRemove}>
                  {chip.label}
                </Chip>
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
              {products.map((product) => {
                const inStock = (product.inventory?.quantityOnHand ?? 0) > 0;
                return (
                  <article
                    key={product.id}
                    className="flex flex-col overflow-hidden rounded-card border border-neutral-200 bg-white"
                  >
                    <div className="aspect-square w-full bg-neutral-100">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <h3 className="font-heading text-h4 text-primary-900">{product.title}</h3>
                      {product.categories[0] && (
                        <p className="text-sm text-neutral-500">{product.categories[0].name}</p>
                      )}
                      <p className="text-small text-neutral-600">{formatStats(product)}</p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="font-semibold text-primary-900">{currency.format(Number(product.price))}</span>
                        <span
                          className={`rounded-pill px-2.5 py-0.5 text-xs font-medium ${
                            inStock ? "bg-primary-100 text-primary-900" : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {inStock ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <span
                  key={pageNum}
                  className={`flex h-9 w-9 items-center justify-center rounded-input text-sm ${
                    pageNum === meta.page
                      ? "bg-primary-900 text-neutral-50"
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
