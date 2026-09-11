import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client.js";

const statusLabels = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusStyles = {
  pending: "bg-neutral-100 text-neutral-700",
  paid: "bg-primary-100 text-primary-900",
  shipped: "bg-primary-100 text-primary-900",
  delivered: "bg-primary-100 text-primary-900",
  cancelled: "bg-neutral-100 text-neutral-700",
};

const statusOptions = ["all", ...Object.keys(statusLabels)];

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrice(value) {
  return `R${Number(value).toFixed(2)}`;
}

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
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center py-12"
      >
        <p className="font-body text-small text-neutral-600">
          Loading your orders...
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h2 className="font-body text-lg font-semibold text-neutral-900">
          Unable to load your orders.
        </h2>
        <p className="mt-2 font-body text-small text-neutral-600">
          {error.message}
        </p>
        <button
          type="button"
          onClick={loadOrders}
          className="mt-4 rounded-input bg-primary-900 px-4 py-2 font-body text-small font-medium text-white transition hover:bg-primary-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="font-body text-small text-neutral-500">
          Home / My Orders
        </p>
        <h1 className="font-heading text-3xl font-semibold text-primary-900">
          My Orders
        </h1>
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
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="font-body text-lg font-semibold text-neutral-900">
            {orders.length === 0
              ? "You have no orders yet."
              : "No orders match this status."}
          </h2>
          <p className="mt-2 font-body text-small text-neutral-600">
            {orders.length === 0
              ? "Your completed orders will appear here."
              : "Try selecting a different status."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <article
              key={order.id}
              className="overflow-hidden rounded-card border border-neutral-200 bg-white"
            >
              <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-6">
                <div className="space-y-1">
                  <h2 className="font-body text-body font-semibold text-neutral-900">
                    Order #{order.id}
                  </h2>
                  <p className="font-body text-small text-neutral-500">
                    {formatDate(order.createdAt)}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 font-body text-small font-medium ${
                    statusStyles[order.status] ??
                    "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  {statusLabels[order.status] ?? order.status}
                </span>
              </div>

              <div className="divide-y divide-neutral-200">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-6">
                    <div
                      aria-hidden="true"
                      className="h-20 w-20 shrink-0 rounded-input bg-neutral-200"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="font-body text-body font-medium text-neutral-900">
                        {item.productTitle}
                      </h3>
                      <p className="mt-1 font-body text-small text-neutral-500">
                        Quantity: {item.quantity}
                      </p>
                      <p className="mt-1 font-body text-small text-neutral-500">
                        {formatPrice(item.unitPrice)} each
                      </p>
                    </div>

                    <p className="hidden font-body text-small text-primary-900 sm:block">
                      Write a review
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 border-t border-neutral-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-body text-small text-neutral-500">
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                  <p className="font-body text-body font-semibold text-neutral-900">
                    Total: {formatPrice(order.total)}
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-input border border-primary-900 bg-white px-5 py-2.5 font-body text-small font-medium text-primary-900 transition hover:bg-primary-100"
                >
                  View Details
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
