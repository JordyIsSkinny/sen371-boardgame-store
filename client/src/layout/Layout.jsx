import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const navLinkClass = ({ isActive }) => (isActive ? "font-semibold text-primary-900" : "text-neutral-600");

// Nav links as data so the desktop row (hidden md:flex) and the mobile
// dropdown panel (md:hidden) can render the exact same set without
// duplicating the conditional logic in two places.
function NavLinks({ user, logout, onNavigate, className }) {
  return (
    <div className={className}>
      <NavLink to="/catalogue" className={navLinkClass} onClick={onNavigate}>
        Catalogue
      </NavLink>
      {user && (
        <NavLink to="/cart" className={navLinkClass} onClick={onNavigate}>
          Cart
        </NavLink>
      )}
      {user && (
        <NavLink to="/orders" className={navLinkClass} onClick={onNavigate}>
          Orders
        </NavLink>
      )}
      {user?.role === "admin" && (
        <NavLink to="/admin" className={navLinkClass} onClick={onNavigate}>
          Admin
        </NavLink>
      )}
      {user ? (
        <button
          type="button"
          onClick={() => {
            logout();
            onNavigate?.();
          }}
          className="text-left text-neutral-600"
        >
          Log out
        </button>
      ) : (
        <>
          <NavLink to="/login" className={navLinkClass} onClick={onNavigate}>
            Log in
          </NavLink>
          <NavLink to="/register" className={navLinkClass} onClick={onNavigate}>
            Register
          </NavLink>
        </>
      )}
    </div>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-100 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <NavLink to="/" className="font-heading text-h4 text-primary-900" onClick={() => setMenuOpen(false)}>
            One More Game
          </NavLink>

          <NavLinks user={user} logout={logout} className="hidden items-center gap-4 text-sm md:flex" />

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 items-center justify-center rounded-input text-neutral-700 md:hidden"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </nav>

        {menuOpen && (
          <NavLinks
            user={user}
            logout={logout}
            onNavigate={() => setMenuOpen(false)}
            className="flex flex-col gap-3 border-t border-neutral-200 p-4 text-sm md:hidden"
          />
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-200 p-4 text-center text-sm text-neutral-500">
        SEN371 — One More Game
      </footer>
    </div>
  );
}
