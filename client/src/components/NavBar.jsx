import { Link, NavLink } from "react-router-dom";
import { Input } from "./Input.jsx";

// NavBar (Figma 72:47). state: guest | authenticated | admin.
// Presentational — reads auth/cart state from props rather than reaching
// into AuthContext itself, same pattern as the rest of this library. Wiring
// it into Layout.jsx to replace the hand-rolled header there is deferred to
// issue #108 alongside the rest of the component-library re-skin, so this
// isn't used anywhere yet.
export function NavBar({
  state = "guest",
  userName,
  cartCount = 0,
  onLogout,
  onSearchSubmit,
  className = "",
}) {
  const isAdmin = state === "admin";
  const isAuthenticated = isAdmin || state === "authenticated";

  return (
    <header
      className={`flex h-[72px] w-full items-center justify-between border-b border-neutral-300 bg-white px-12 ${className}`}
    >
      <div className="flex items-center gap-8 whitespace-nowrap">
        <Link to="/" className="font-heading text-h4 font-semibold text-primary-900">
          Meeple &amp; Co.
        </Link>
        <NavLink to="/catalogue" className="text-small text-neutral-700">
          Catalogue
        </NavLink>
        <NavLink to="/categories" className="text-small text-neutral-700">
          Categories
        </NavLink>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit?.(new FormData(event.currentTarget).get("q"));
        }}
        className="w-[300px]"
      >
        <Input name="q" type="search" placeholder="Search games…" className="h-10" />
      </form>

      <div className="flex items-center gap-6">
        <Link to="/cart" className="flex items-center gap-2 text-small text-neutral-700">
          Cart
          <span className="rounded-pill bg-accent px-1.5 py-0.5 text-caption font-medium text-primary-900">
            {isAuthenticated ? cartCount : 0}
          </span>
        </Link>

        {isAdmin && (
          <NavLink to="/admin" className="text-small text-primary-700">
            Admin
          </NavLink>
        )}
        {isAuthenticated && !isAdmin && (
          <NavLink to="/orders" className="text-small text-neutral-700">
            My orders
          </NavLink>
        )}
        {!isAuthenticated && (
          <NavLink to="/login" className="text-small text-neutral-700">
            Log in
          </NavLink>
        )}

        {isAuthenticated ? (
          <button type="button" onClick={onLogout} className="text-small text-neutral-700">
            {userName ?? "Account"}
          </button>
        ) : (
          <NavLink to="/register" className="text-small font-medium text-primary-700">
            Register
          </NavLink>
        )}
      </div>
    </header>
  );
}
