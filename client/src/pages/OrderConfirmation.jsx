import { useParams } from "react-router-dom";

// S7 Order Confirmation (issue #77, stretch) — placeholder shell.
export function OrderConfirmation() {
  const { orderId } = useParams();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Order {orderId} confirmed</h1>
      <p className="text-slate-600">S7 — placeholder page.</p>
    </section>
  );
}
