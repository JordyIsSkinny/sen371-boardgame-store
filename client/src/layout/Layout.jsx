import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const navLinkClass = ({ isActive }) => (isActive ? "font-semibold text-slate-900" : "text-slate-600");

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <NavLink to="/" className="text-lg font-semibold">
            Board Game Store
          </NavLink>
          <div className="flex items-center gap-4 text-sm">
            <NavLink to="/catalogue" className={navLinkClass}>
              Catalogue
            </NavLink>
            {user && (
              <NavLink to="/cart" className={navLinkClass}>
                Cart
              </NavLink>
            )}
            {user && (
              <NavLink to="/orders" className={navLinkClass}>
                Orders
              </NavLink>
            )}
            {user?.role === "admin" && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            )}
            {user ? (
              <button type="button" onClick={logout} className="text-slate-600">
                Log out
              </button>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Log in
                </NavLink>
                <NavLink to="/register" className={navLinkClass}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 p-4 text-center text-sm text-slate-500">
        SEN371 Board Game Store
      </footer>
    </div>
  );
}
