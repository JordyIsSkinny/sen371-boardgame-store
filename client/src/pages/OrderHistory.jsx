import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client.js";
import { LoadingState } from "../components/LoadingState.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorState } from "../components/ErrorState.jsx";

// S8 Order History (issue #78). Rebuilt against the real Figma frame
// (node 138:474) — this screen was originally built before that frame
// existed, the same situation S2/S3/S6 were in before their rebuilds.
//
// Status colours: Figma confirms pending->warning ("Pending payment") and
// shipped->info ("Shipped") and delivered->success ("Delivered"), but has
// no example for "paid" or "cancelled". Grouped paid with shipped (info —
// still "in progress", not a final state) and cancelled with the neutral
// tint StockBadge uses for out-of-stock (not a fault state, just an ended
// one) — a reasoned inference, not a confirmed Figma value, flagged here
// rather than asserted as fact.
//
// Item thumbnails are solid colour swatches, not fetched images, matching
// Figma's own reference (literal colour squares, not real product photos)
// and ProductCard's existing precedent for the same situation.
//
// "Write a review" only renders for delivered orders now, matching Figma
// (node 138:530, shown only on the one delivered example) — it isn't
// wired to anything yet (no review-composer route exists from this
// screen), same as "View details" isn't wired to an order-detail route
// either. Both are visual-only until those routes exist.

const statusLabels = {
  pending: "Pending payment",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusStyles = {
  pending: "bg-warning-tint text-warning",
  paid: "bg-info-tint text-info",
  shipped: "bg-info-tint text-info",
  delivered: "bg-success-tint text-success",
  cancelled: "bg-neutral-tint text-neutral-700",
};

const swatchColors = ["bg-primary-500", "bg-warning", "bg-info", "bg-success", "bg-primary-300"];

const statusOptions = ["all", ...Object.keys(statusLabels)];

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

export function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadOrders() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get("/orders");
      setOrders(response.data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (selectedStatus === "all") {
      return orders;
    }

    return orders.filter((order) => order.status === selectedStatus);
  }, [orders, selectedStatus]);

  if (isLoading) {
    return <LoadingState message="Loading your orders..." />;
  }

  if (error) {
    return <ErrorState message="Unable to load your orders." onRetry={loadOrders} />;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="font-body text-small text-neutral-500">Home / My orders</p>
        <h1 className="font-heading text-h2 text-primary-900">My orders</h1>
      </div>

      <div>
        <label htmlFor="order-status" className="sr-only">
          Filter orders by status
        </label>

        <select
          id="order-status"
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
          className="rounded-input border border-neutral-200 bg-white px-4 py-3 font-body text-small text-neutral-800 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : statusLabels[status]}
            </option>
          ))}
        </select>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title={orders.length === 0 ? "You have no orders yet." : "No orders match this status."}
          message={
            orders.length === 0
              ? "Your completed orders will appear here."
              : "Try selecting a different status."
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <article key={order.id} className="rounded-modal border border-neutral-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-h4 text-neutral-900">Order #{order.id}</h2>
                  <p className="mt-1 font-body text-small text-neutral-500">
                    Placed {formatDate(order.createdAt)}
                  </p>
                </div>

                <span
                  className={`rounded-pill px-3 py-1 font-body text-caption font-medium ${
                    statusStyles[order.status] ?? "bg-neutral-tint text-neutral-700"
                  }`}
                >
                  {statusLabels[order.status] ?? order.status}
                </span>
              </div>

              {/* Swatches+count could easily out-width a phone screen on
                  their own (a 3-item order is already ~184px of fixed-size
                  swatches), so this splits into an info row and an actions
                  row that stack below sm rather than fighting for space in
                  one line, same pattern as Cart.jsx's line items. */}
              <div className="mt-4 flex flex-col gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-3 sm:flex-1">
                  <div className="flex shrink-0 gap-2">
                    {order.items.map((item, i) => (
                      <div
                        key={item.id}
                        aria-hidden="true"
                        className={`size-14 rounded-input ${swatchColors[i % swatchColors.length]}`}
                      />
                    ))}
                  </div>

                  <p className="font-body text-small text-neutral-700">
                    {order.items.length} {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <p className="font-heading text-h4 font-semibold text-neutral-900">
                    {currency.format(Number(order.total))}
                  </p>

                  {order.status === "delivered" && (
                    <p className="hidden font-body text-small text-primary-500 sm:block">Write a review</p>
                  )}

                  <button
                    type="button"
                    className="rounded-input border border-primary-500 bg-white px-5 py-2.5 font-body text-small font-medium text-primary-700 transition hover:bg-primary-100"
                  >
                    View details
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
