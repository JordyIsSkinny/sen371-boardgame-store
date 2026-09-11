import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { ErrorState } from "../components/ErrorState.jsx";

// S7 Order Confirmation (issue #77, stretch). Fetches GET /orders/:id and
// shows the real order the user just placed (or is looking back at) —
// status, items, and total, rather than a generic "thanks" message with no
// data behind it.

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
        <h1 className="font-heading text-h2 text-primary-900">Thank you for your order</h1>
        <p className="mt-2 text-neutral-600">
          Order #{order.id} &middot; {STATUS_LABELS[order.status] ?? order.status}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-lg rounded-card border border-neutral-200 bg-white p-4">
        <h2 className="text-h4 font-heading text-primary-900">Order items</h2>

        <div className="mt-4 flex flex-col gap-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm text-neutral-700">
              <span>
                {item.productTitle} &times; {item.quantity}
              </span>
              <span>{currency.format(Number(item.unitPrice) * item.quantity)}</span>
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
          <Button style="secondary">View order history</Button>
        </Link>
        <Link to="/catalogue">
          <Button>Continue shopping</Button>
        </Link>
      </div>
    </section>
  );
}