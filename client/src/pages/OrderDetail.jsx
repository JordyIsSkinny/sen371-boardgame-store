import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { ErrorState } from "../components/ErrorState.jsx";

// Order Detail (#204). OrderHistory.jsx's "View details" button used to be
// visual-only, since this route and page didn't exist yet — found during
// the #151 usability session, hit independently by two participants.
// GET /orders/:id already existed and is already used by
// OrderConfirmation.jsx, so this reuses the same fetch and most of the
// same layout, minus the "Order placed" success banner (this isn't a
// just-placed order, it's a look-up of one from any point in the past)
// and plus the delivery address, which Confirmation doesn't show but a
// detail view should.

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

const statusLabels = {
  pending: "Pending payment",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function OrderDetail() {
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
    return <LoadingState message="Loading order details..." />;
  }

  if (status === "error") {
    return <ErrorState message="Couldn't find that order." onRetry={loadOrder} />;
  }

  return (
    <section>
      <p className="font-body text-small text-neutral-500">
        <Link to="/orders" className="hover:underline">
          My orders
        </Link>{" "}
        / Order #{order.id}
      </p>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="font-heading text-h2 text-primary-900">Order #{order.id}</h1>
        <span className="rounded-pill bg-neutral-tint px-3 py-1 font-body text-caption font-medium text-neutral-700">
          {statusLabels[order.status] ?? order.status}
        </span>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-card border border-neutral-200 bg-white p-4">
          <h2 className="text-h4 font-heading text-primary-900">Delivery address</h2>
          <p className="mt-2 text-sm text-neutral-700">
            {order.address.fullName}
            <br />
            {order.address.line1}
            {order.address.line2 && (
              <>
                <br />
                {order.address.line2}
              </>
            )}
            <br />
            {order.address.city}, {order.address.provinceState} {order.address.postalCode}
            <br />
            {order.address.country}
            <br />
            {order.address.phone}
          </p>
        </div>

        <div className="rounded-card border border-neutral-200 bg-white p-4">
          <h2 className="text-h4 font-heading text-primary-900">Order items</h2>

          <div className="mt-4 flex flex-col gap-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm text-neutral-700">
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
      </div>

      <div className="mt-8">
        <Link to="/orders">
          <Button style="secondary">Back to my orders</Button>
        </Link>
      </div>
    </section>
  );
}
