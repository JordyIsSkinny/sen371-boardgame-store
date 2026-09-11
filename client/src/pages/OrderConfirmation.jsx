import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { ErrorState } from "../components/ErrorState.jsx";

// S7 Order Confirmation (issue #77). Fetches GET /orders/:id and shows the
// real order — status, items, and total. Matches Figma node 137:459 per
// Masindi's review on PR #121: success icon, "Order placed" heading,
// confirmation-email line, delivery estimate, item thumbnails, correct
// button copy/emphasis.

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

const STATUS_LABELS = {
  pending: "Pending payment",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function OrderConfirmation() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function loadOrder() {
    setStatus("loading");
    try {
      const res = await apiClient.get(`/orders/${orderId}`);
      setOrder(res.data);
      setStatus("ready");
    } catch (err) {
      console.error("Order fetch failed:", err);
      setStatus("error");
    }
  }

  if (status === "loading") {
    return <LoadingState message="Loading your order..." />;
  }

  if (status === "error") {
    return <ErrorState message="Couldn't find that order." onRetry={loadOrder} />;
  }

  return (
    <section>
      <nav className="text-sm text-neutral-500">
        <span>Home</span> / <span className="text-neutral-700">Order confirmation</span>
      </nav>

      <div className="mt-6 flex flex-col items-center text-center">
               <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-tint text-success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <h1 className="mt-4 font-heading text-h2 text-primary-900">Order placed</h1>
        <p className="mt-2 text-neutral-600">
          Order #{order.id} &middot; {STATUS_LABELS[order.status] ?? order.status}
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          We've sent a confirmation to your email.
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Estimated delivery: 5&ndash;7 business days.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-lg rounded-card border border-neutral-200 bg-white p-4">
        <h2 className="text-h4 font-heading text-primary-900">Order items</h2>

        <div className="mt-4 flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-12 w-12 flex-shrink-0 rounded-input object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="h-12 w-12 flex-shrink-0 rounded-input bg-neutral-100"
                />
              )}
              <div className="flex flex-1 items-center justify-between text-sm text-neutral-700">
                <span>
                  {item.productTitle} &times; {item.quantity}
                </span>
                <span>{currency.format(Number(item.unitPrice) * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-1 border-t border-neutral-200 pt-4 text-sm">
          <div className="flex justify-between text-neutral-700">
            <span>Subtotal</span>
            <span>{currency.format(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-700">
            <span>Shipping</span>
            <span>{currency.format(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between font-semibold text-primary-900">
            <span>Total</span>
            <span>{currency.format(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link to="/orders">
          <Button style="primary">View my orders</Button>
        </Link>
        <Link to="/catalogue">
          <Button style="secondary">Continue shopping</Button>
        </Link>
      </div>
    </section>
  );
}