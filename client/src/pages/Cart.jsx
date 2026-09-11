import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorState } from "../components/ErrorState.jsx";

// S4 Cart (issue #74). Fetches the authenticated user's cart from
// GET /cart ({ data: { items, subtotal } }, per cart.model.js) and lets
// the user update quantities or remove items, both against the real API.
// Line-item state is optimistic-free on purpose: every change re-reads the
// server's response rather than computing a new lineTotal/subtotal
// client-side, since price and stock are the server's source of truth.

const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

export function Cart() {
  const [cart, setCart] = useState(null);
  const [status, setStatus] = useState("loading");
  const [pendingItemId, setPendingItemId] = useState(null);

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
      console.error("Cart fetch failed:", err);
      setStatus("error");
    }
  }

  async function updateQuantity(itemId, quantity) {
    if (quantity < 1) return;
    setPendingItemId(itemId);
    try {
      await apiClient.patch(`/cart/items/${itemId}`, { quantity });
      await loadCart();
    } catch (err) {
      console.error("Cart update failed:", err);
    } finally {
      setPendingItemId(null);
    }
  }

  async function removeItem(itemId) {
    setPendingItemId(itemId);
    try {
      await apiClient.delete(`/cart/items/${itemId}`);
      await loadCart();
    } catch (err) {
      console.error("Cart remove failed:", err);
    } finally {
      setPendingItemId(null);
    }
  }

  if (status === "loading") {
    return <LoadingState message="Loading your cart..." />;
  }

  if (status === "error") {
    return <ErrorState message="Couldn't load your cart." onRetry={loadCart} />;
  }

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center">
        <EmptyState title="Your cart is empty." message="Add a few games to get started." />
        <Link to="/catalogue">
          <Button>Browse games</Button>
        </Link>
      </div>
    );
  }

  return (
    <section>
      <nav className="text-sm text-neutral-500">
        <span>Home</span> / <span className="text-neutral-700">Cart</span>
      </nav>

      <h1 className="mt-2 font-heading text-h2 text-primary-900">Your cart</h1>

      <div className="mt-6 flex flex-col gap-4">
        {cart.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-card border border-neutral-200 bg-white p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-heading text-h4 text-primary-900">{item.product.title}</p>
              <p className="text-small text-neutral-600">{currency.format(item.product.price)} each</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={pendingItemId === item.id || item.quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-9 w-9 items-center justify-center rounded-input border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
              >
                &minus;
              </button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                disabled={pendingItemId === item.id}
                aria-label="Increase quantity"
                className="flex h-9 w-9 items-center justify-center rounded-input border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
              >
                &#43;
              </button>
            </div>

            <p className="w-24 text-right font-semibold text-primary-900">
              {currency.format(item.lineTotal)}
            </p>

            <Button
              style="ghost"
              state={pendingItemId === item.id ? "disabled" : "default"}
              onClick={() => removeItem(item.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <div className="w-full max-w-xs rounded-card border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-neutral-700">Subtotal</span>
            <span className="font-semibold text-primary-900">{currency.format(cart.subtotal)}</span>
          </div>
          <Link to="/checkout" className="mt-4 block">
            <Button className="w-full">Checkout</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}