import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { Input } from "../components/Input.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorState } from "../components/ErrorState.jsx";

// S5 Checkout (issue #76, stretch; wired to the real API in #175).
// Collects a delivery address and places a real order against it:
// POST /addresses (adding the address, #120) then POST /orders with the
// cart's items, then navigates to the order's confirmation screen.

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

export function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [status, setStatus] = useState("loading");
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    provinceState: "",
    postalCode: "",
    country: "South Africa",
  });
   const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // Set once an address is successfully created; skips re-creating it on a
  // retry after a failed POST /orders (e.g. stock hit zero between
  // add-to-cart and checkout) — otherwise every retry orphaned another
  // address row that no order ever ended up referencing. Cleared whenever
  // the form changes, so an edited address gets created fresh rather than
  // the order being placed against stale, already-submitted details.
  const [createdAddressId, setCreatedAddressId] = useState(null);

  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    setStatus("loading");
    try {
      const res = await apiClient.get("/cart");
      setCart(res.data);
      setStatus("ready");
    } catch (err) {
      console.error("Checkout cart fetch failed:", err);
      setStatus("error");
    }
  }

  function updateField(field, value) {
    setAddress((prev) => ({ ...prev, [field]: value }));
    setCreatedAddressId(null);
  }
  const hasRequiredAddressFields =
    address.line1.trim() !== "" &&
    address.city.trim() !== "" &&
    address.provinceState.trim() !== "" &&
    address.postalCode.trim() !== "" &&
    address.country.trim() !== "";

  const canSubmit =
    hasRequiredAddressFields && cart?.items.length > 0 && !submitting;

  async function placeOrder() {
    setSubmitError(null);
    setSubmitting(true);

     try {
      let addressId = createdAddressId;

      if (!addressId) {
        // userId is taken from the caller's token server-side, never from
        // this body — same rule as every other write in this app.
        const trimmedLine2 = address.line2.trim();
        const { data: createdAddress } = await apiClient.post("/addresses", {
          line1: address.line1,
          // .trim() first: a whitespace-only line2 (e.g. a single space)
          // is truthy, so a bare `|| undefined` wouldn't catch it and a
          // blank-looking value would get persisted as real content.
          line2: trimmedLine2 || undefined,
          city: address.city,
          provinceState: address.provinceState,
          postalCode: address.postalCode,
          country: address.country,
        });
        addressId = createdAddress.id;
        setCreatedAddressId(addressId);
      }

      const items = cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const { data: order } = await apiClient.post("/orders", {
        addressId,
        items,
      });

      navigate(`/orders/${order.id}/confirmation`);
    } catch (err) {
      console.error("Failed to place order:", err);
      setSubmitError(
        err.message || "Couldn't place your order. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return <LoadingState message="Loading checkout..." />;
  }

  if (status === "error") {
    return <ErrorState message="Couldn't load your cart." onRetry={loadCart} />;
  }

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center">
        <EmptyState
          title="Your cart is empty."
          message="Add a few games before checking out."
        />
        <Link to="/catalogue">
          <Button>Browse games</Button>
        </Link>
      </div>
    );
  }

  return (
    <section>
      <nav className="text-sm text-neutral-500">
        <span>Home</span> / <span>Cart</span> / <span className="text-neutral-700">Checkout</span>
      </nav>

      <h1 className="mt-2 font-heading text-h2 text-primary-900">Checkout</h1>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-1">
          <h2 className="text-h4 font-heading text-primary-900">Delivery address</h2>

          <div className="mt-4 flex flex-col gap-4">
            <Input
              placeholder="Address line 1"
              value={address.line1}
              onChange={(e) => updateField("line1", e.target.value)}
            />
            <Input
              placeholder="Address line 2 (optional)"
              value={address.line2}
              onChange={(e) => updateField("line2", e.target.value)}
            />
            <div className="flex gap-4">
              <Input
                placeholder="City"
                value={address.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
              <Input
                placeholder="Province"
                value={address.provinceState}
                onChange={(e) => updateField("provinceState", e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <Input
                placeholder="Postal code"
                value={address.postalCode}
                onChange={(e) => updateField("postalCode", e.target.value)}
              />
              <Input
                placeholder="Country"
                value={address.country}
                onChange={(e) => updateField("country", e.target.value)}
              />
            </div>
          </div>

          {submitError && (
            <p className="mt-4 text-sm text-error">{submitError}</p>
          )}
        </div>

        <div className="w-full max-w-xs rounded-card border border-neutral-200 bg-white p-4">
          <h2 className="text-h4 font-heading text-primary-900">Order summary</h2>

          <div className="mt-4 flex flex-col gap-2">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-neutral-700">
                <span>
                  {item.product.title} &times; {item.quantity}
                </span>
                <span>{currency.format(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
            <span className="text-neutral-700">Subtotal</span>
            <span className="font-semibold text-primary-900">{currency.format(cart.subtotal)}</span>
          </div>

          <Button
            state={canSubmit ? "default" : "disabled"}
            className="mt-4 w-full"
            onClick={placeOrder}
          >
            {submitting ? "Placing order..." : "Place order"}
          </Button>
        </div>
      </div>
    </section>
  );
}