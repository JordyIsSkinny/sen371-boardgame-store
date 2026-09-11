import { useEffect, useState } from "react";
import { apiClient } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { Input } from "../components/Input.jsx";
import { StockBadge } from "../components/StockBadge.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { ErrorState } from "../components/ErrorState.jsx";

// S9 Admin Dashboard (issue #79). Built from a screenshot of the real
// Figma frame shared directly in chat — the Figma MCP server (404 at
// mcp.figma.com) and the Claude in Chrome browser connection both failed
// to connect this session, so live node access wasn't available the way
// it was for every other screen. Matches the screenshot's layout and
// copy as closely as static reference allows.
//
// Every stat and every table row is real data, no fabricated numbers:
// - Total products / table rows: GET /products, paginated.
// - Low stock: a separate GET /products?pageSize=1000 call (no
//   dedicated aggregate endpoint exists), counting products at or below
//   their own inventory row's reorderThreshold. That's more accurate
//   than Catalogue.jsx/ProductDetail.jsx's hardcoded "<= 5" stockStatus
//   helper — an existing inconsistency in those files, not fixed here.
// - Total reviews: GET /reviews/count (#125, #134).
// - Orders this week: GET /orders/all (#56, #133), filtered client-side
//   to the last 7 days — no dedicated date-range endpoint exists either.
// The mockup's "Pending reviews" card is dropped per the #125 decision:
// no moderation concept exists in the schema, and the System Plan only
// ever specs admin delete-any-review, which is already built.
//
// The sidebar's Products/Orders/Reviews links are non-interactive in the
// mockup's sense that they don't route anywhere — this dashboard *is*
// the products management view the Figma frame shows; there's no
// separate Figma screen for a standalone Orders or Reviews admin page to
// route to, so inventing one would be guessing at a design that doesn't
// exist yet.

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });
const PAGE_SIZE = 10;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SWATCH_COLORS = ["bg-primary-900", "bg-primary-600", "bg-error", "bg-warning", "bg-primary-300"];

function stockStatus(inventory) {
  const quantity = inventory?.quantityOnHand ?? 0;
  const threshold = inventory?.reorderThreshold ?? 5;
  if (quantity <= 0) return "out-of-stock";
  if (quantity <= threshold) return "low-stock";
  return "in-stock";
}

function ProductSwatch({ product }) {
  if (product.imageUrl) {
    return (
      <img src={product.imageUrl} alt="" className="size-10 shrink-0 rounded-input object-cover" />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-10 shrink-0 rounded-input ${SWATCH_COLORS[product.id % SWATCH_COLORS.length]}`}
    />
  );
}

function StatCard({ label, value, tone = "default" }) {
  return (
    <div className="rounded-card border border-neutral-200 bg-white p-4">
      <p className="text-small text-neutral-500">{label}</p>
      <p className={`mt-1 font-heading text-h2 ${tone === "warning" ? "text-warning" : "text-primary-900"}`}>
        {value}
      </p>
    </div>
  );
}

const EMPTY_FORM = {
  title: "",
  slug: "",
  categoryId: "",
  minPlayers: "",
  maxPlayers: "",
  playTimeMinutes: "",
  minAge: "",
  complexityRating: "",
  price: "",
  quantityOnHand: "0",
  imageUrl: "",
};

export function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [categories, setCategories] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ordersThisWeek, setOrdersThisWeek] = useState(0);
  const [status, setStatus] = useState("loading");
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ price: "", quantityOnHand: "" });
  const [editError, setEditError] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addStatus, setAddStatus] = useState("idle");
  const [addError, setAddError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, [page]);

  async function loadDashboard() {
    setStatus("loading");
    try {
      const [productsRes, allProductsRes, categoriesRes, reviewCountRes, ordersRes] = await Promise.all([
        apiClient.get(`/products?page=${page}&pageSize=${PAGE_SIZE}`),
        apiClient.get("/products?pageSize=1000"),
        apiClient.get("/categories"),
        apiClient.get("/reviews/count"),
        apiClient.get("/orders/all"),
      ]);

      setProducts(productsRes.data);
      setMeta(productsRes.meta);
      setCategories(categoriesRes.data);
      setTotalReviews(reviewCountRes.data.total);

      const lowStock = allProductsRes.data.filter(
        (product) => stockStatus(product.inventory) !== "in-stock"
      ).length;
      setLowStockCount(lowStock);

      const weekAgo = Date.now() - SEVEN_DAYS_MS;
      const recentOrders = ordersRes.data.filter(
        (order) => new Date(order.createdAt).getTime() >= weekAgo
      ).length;
      setOrdersThisWeek(recentOrders);

      setStatus("ready");
    } catch (err) {
      console.error("Admin dashboard fetch failed:", err);
      setStatus("error");
    }
  }

  function startEdit(product) {
    setEditingId(product.id);
    setEditError(null);
    setEditValues({
      price: String(product.price),
      quantityOnHand: String(product.inventory?.quantityOnHand ?? ""),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(product) {
    setEditError(null);
    try {
      const calls = [apiClient.put(`/products/${product.id}`, { price: Number(editValues.price) })];
      if (product.inventory) {
        calls.push(
          apiClient.put(`/inventory/${product.id}`, {
            quantityOnHand: Number(editValues.quantityOnHand),
          })
        );
      }
      await Promise.all(calls);
      setEditingId(null);
      await loadDashboard();
    } catch (err) {
      setEditError(err.message ?? "Couldn't save changes.");
    }
  }

  async function handleDelete(product) {
    try {
      await apiClient.delete(`/products/${product.id}`);
      await loadDashboard();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  function updateAddField(field, value) {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddProduct(event) {
    event.preventDefault();
    setAddStatus("submitting");
    setAddError(null);
    try {
      await apiClient.post("/products", {
        title: addForm.title,
        slug: addForm.slug,
        categoryId: addForm.categoryId ? Number(addForm.categoryId) : undefined,
        minPlayers: Number(addForm.minPlayers),
        maxPlayers: Number(addForm.maxPlayers),
        playTimeMinutes: Number(addForm.playTimeMinutes),
        minAge: Number(addForm.minAge),
        complexityRating: Number(addForm.complexityRating),
        price: Number(addForm.price),
        quantityOnHand: Number(addForm.quantityOnHand || 0),
        imageUrl: addForm.imageUrl || undefined,
      });
      setAddForm(EMPTY_FORM);
      setShowAddForm(false);
      setAddStatus("idle");
      setPage(1);
      await loadDashboard();
    } catch (err) {
      setAddStatus("idle");
      setAddError(err.message ?? "Couldn't add this product.");
    }
  }

  if (status === "loading") {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (status === "error") {
    return <ErrorState message="Couldn't load the admin dashboard." onRetry={loadDashboard} />;
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-56">
        <p className="text-caption font-semibold uppercase tracking-wide text-neutral-500">Admin</p>
        <nav className="mt-3 flex flex-col gap-1 text-small">
          <span className="rounded-input bg-primary-100 px-3 py-2 font-medium text-primary-900">
            Dashboard
          </span>
          {/* Products/Orders/Reviews: visual only, matching the Figma frame.
              This page already is the products management view; there's no
              separate Figma screen for standalone Orders/Reviews admin
              pages to route these to. */}
          <span className="px-3 py-2 text-neutral-500">Products</span>
          <span className="px-3 py-2 text-neutral-500">Orders</span>
          <span className="px-3 py-2 text-neutral-500">Reviews</span>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <h1 className="font-heading text-h2 text-primary-900">Dashboard</h1>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total products" value={meta?.total ?? 0} />
          <StatCard label="Low stock" value={lowStockCount} tone={lowStockCount > 0 ? "warning" : "default"} />
          <StatCard label="Orders this week" value={ordersThisWeek} />
          <StatCard label="Total reviews" value={totalReviews} />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-heading text-h3 text-primary-900">Products</h2>
          <Button onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? "Cancel" : "+ Add product"}
          </Button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddProduct}
            className="mt-4 flex flex-col gap-4 rounded-card border border-neutral-200 bg-white p-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                placeholder="Title"
                value={addForm.title}
                onChange={(e) => updateAddField("title", e.target.value)}
                required
              />
              <Input
                placeholder="Slug"
                value={addForm.slug}
                onChange={(e) => updateAddField("slug", e.target.value)}
                required
              />
              <select
                value={addForm.categoryId}
                onChange={(e) => updateAddField("categoryId", e.target.value)}
                className="h-11 rounded-input border border-neutral-300 px-3 text-small text-neutral-900"
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min="1"
                placeholder="Min players"
                value={addForm.minPlayers}
                onChange={(e) => updateAddField("minPlayers", e.target.value)}
                required
              />
              <Input
                type="number"
                min="1"
                placeholder="Max players"
                value={addForm.maxPlayers}
                onChange={(e) => updateAddField("maxPlayers", e.target.value)}
                required
              />
              <Input
                type="number"
                min="1"
                placeholder="Play time (minutes)"
                value={addForm.playTimeMinutes}
                onChange={(e) => updateAddField("playTimeMinutes", e.target.value)}
                required
              />
              <Input
                type="number"
                min="0"
                placeholder="Minimum age"
                value={addForm.minAge}
                onChange={(e) => updateAddField("minAge", e.target.value)}
                required
              />
              <Input
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="Complexity (0-5)"
                value={addForm.complexityRating}
                onChange={(e) => updateAddField("complexityRating", e.target.value)}
                required
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={addForm.price}
                onChange={(e) => updateAddField("price", e.target.value)}
                required
              />
              <Input
                type="number"
                min="0"
                placeholder="Initial stock"
                value={addForm.quantityOnHand}
                onChange={(e) => updateAddField("quantityOnHand", e.target.value)}
              />
              <Input
                placeholder="Image URL (optional)"
                value={addForm.imageUrl}
                onChange={(e) => updateAddField("imageUrl", e.target.value)}
                className="sm:col-span-2"
              />
            </div>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <Button type="submit" state={addStatus === "submitting" ? "disabled" : "default"} className="self-start">
              {addStatus === "submitting" ? "Adding..." : "Add product"}
            </Button>
          </form>
        )}

        {editError && <p className="mt-4 text-sm text-red-600">{editError}</p>}

        <div className="mt-4 overflow-x-auto rounded-card border border-neutral-200 bg-white">
          <table className="w-full text-left text-small">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500">
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">Category</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Stock</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isEditing = editingId === product.id;
                return (
                  <tr key={product.id} className="border-b border-neutral-100 last:border-0">
                    <td className="flex items-center gap-3 p-3">
                      <ProductSwatch product={product} />
                      <span className="font-medium text-neutral-900">{product.title}</span>
                    </td>
                    <td className="p-3 text-neutral-700">{product.categories?.[0]?.name ?? "—"}</td>
                    <td className="p-3 text-neutral-700">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValues.price}
                          onChange={(e) => setEditValues((v) => ({ ...v, price: e.target.value }))}
                          className="h-9 w-24"
                        />
                      ) : (
                        currency.format(Number(product.price))
                      )}
                    </td>
                    <td className="p-3 text-neutral-700">
                      {isEditing ? (
                        product.inventory ? (
                          <Input
                            type="number"
                            min="0"
                            value={editValues.quantityOnHand}
                            onChange={(e) =>
                              setEditValues((v) => ({ ...v, quantityOnHand: e.target.value }))
                            }
                            className="h-9 w-20"
                          />
                        ) : (
                          <span className="text-neutral-500">No record</span>
                        )
                      ) : (
                        (product.inventory?.quantityOnHand ?? 0)
                      )}
                    </td>
                    <td className="p-3">
                      <StockBadge
                        status={stockStatus(product.inventory)}
                        count={product.inventory?.quantityOnHand}
                      />
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => saveEdit(product)}
                            className="font-medium text-primary-700 hover:underline"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-neutral-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            className="font-medium text-primary-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            className="font-medium text-error hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setPage(pageNum)}
                className={`flex h-9 w-9 items-center justify-center rounded-input text-sm ${
                  pageNum === meta.page
                    ? "bg-primary-900 text-white"
                    : "border border-neutral-200 text-neutral-700"
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
