import { useEffect, useState } from "react";
import { apiClient } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { Input } from "../components/Input.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { ErrorState } from "../components/ErrorState.jsx";

// S5 Checkout (issue #76, stretch). Collects a delivery address and shows
// the cart summary the order would be placed against.
//
// Known gap, not fixed here: POST /orders requires an addressId, but no
// endpoint exists anywhere in this API to create an address (confirmed via
// findstr across every route file — nothing handles POST /addresses).
// Building that properly (repository, route, validation, tests, matching
// the pattern every other M2/M3 endpoint follows) is real scope beyond
// #76's stretch-goal time budget tonight. Rather than fake a working
// checkout, the form collects real input and the cart summary is real
// data, but submission is disabled with an explicit message instead of
// silently failing or pretending to succeed.

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

export function Checkout() {
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
  }

  if (status === "loading") {
    return <LoadingState message="Loading checkout..." />;
  }

  if (status === "error") {
    return <ErrorState message="Couldn't load your cart." onRetry={loadCart} />;
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

          <p className="mt-4 text-sm text-neutral-500">
            Address saving isn't wired up to the API yet, so orders can't be placed from here yet — this
            screen shows the intended flow and real cart data.
          </p>
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

          <Button state="disabled" className="mt-4 w-full">
            Place order
          </Button>
        </div>
      </div>
    </section>
  );
}