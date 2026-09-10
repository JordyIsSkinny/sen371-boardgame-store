import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    try {
      await login(email, password);
      navigate(location.state?.from?.pathname ?? "/", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="mx-auto flex max-w-md justify-center py-12">
      <div className="w-full overflow-hidden rounded-card border border-neutral-200 bg-white">
        <div className="grid grid-cols-2 border-b border-neutral-200">
          <Link
            to="/login"
            className="bg-primary-100 px-6 py-4 text-center font-body text-body font-medium text-primary-900"
          >
            Log In
          </Link>

          <Link
            to="/register"
            className="px-6 py-4 text-center font-body text-body font-medium text-neutral-600 transition hover:bg-neutral-100"
          >
            Register
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-8">
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block font-body text-small font-medium text-neutral-800"
            >
              Email
            </label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-input border border-neutral-200 bg-neutral-100 px-3 py-3 font-body text-body text-neutral-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block font-body text-small font-medium text-neutral-800"
            >
              Password
            </label>

            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-input border border-neutral-200 bg-neutral-100 px-3 py-3 font-body text-body text-neutral-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          {error && (
            <p className="font-body text-small text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mx-auto rounded-input bg-primary-900 px-8 py-3 font-body text-body font-medium text-white transition hover:bg-primary-800"
          >
            Log in
          </button>

          <Link
            to="/forgot-password"
            className="text-center font-body text-small text-primary-600 underline underline-offset-2 hover:text-primary-900"
          >
            Forgot password?
          </Link>
          <p className="text-center font-body text-small text-neutral-600">
             No account?{" "}
              <Link
              to="/register"
              className="font-medium text-primary-600 underline underline-offset-2 hover:text-primary-900"
               >
                Register
                </Link>
                </p>
        </form>
      </div>
    </section>
  );
}