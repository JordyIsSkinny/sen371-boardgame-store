import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function validatePassword(password) {
  const issues = [];

  if (password.length < 8) {
    issues.push("must be at least 8 characters");
  }

  if (!/[A-Z]/.test(password)) {
    issues.push("must contain an uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    issues.push("must contain a lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    issues.push("must contain a digit");
  }

  return issues;
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);

  const passwordRules = [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "Contains an uppercase letter",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "Contains a lowercase letter",
      valid: /[a-z]/.test(password),
    },
    {
      label: "Contains a digit",
      valid: /[0-9]/.test(password),
    },
  ];

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const passwordIssues = validatePassword(password);

    if (passwordIssues.length > 0) {
      setError(passwordIssues.join(", "));
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await register(firstName, lastName, email, password);
      navigate("/", { replace: true });
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
            className="px-6 py-4 text-center font-body text-body font-medium text-neutral-600 transition hover:bg-neutral-100"
          >
            Log In
          </Link>

          <Link
            to="/register"
            className="bg-primary-100 px-6 py-4 text-center font-body text-body font-medium text-primary-900"
          >
            Register
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="register-first-name"
                className="mb-2 block font-body text-small font-medium text-neutral-800"
              >
                First Name
              </label>

              <input
                id="register-first-name"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                required
                className="w-full rounded-input border border-neutral-200 bg-neutral-100 px-3 py-3 font-body text-body text-neutral-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div>
              <label
                htmlFor="register-last-name"
                className="mb-2 block font-body text-small font-medium text-neutral-800"
              >
                Last Name
              </label>

              <input
                id="register-last-name"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                required
                className="w-full rounded-input border border-neutral-200 bg-neutral-100 px-3 py-3 font-body text-body text-neutral-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="mb-2 block font-body text-small font-medium text-neutral-800"
            >
              Email
            </label>

            <input
              id="register-email"
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
              htmlFor="register-password"
              className="mb-2 block font-body text-small font-medium text-neutral-800"
            >
              Password
            </label>

            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-input border border-neutral-200 bg-neutral-100 px-3 py-3 font-body text-body text-neutral-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
            />
            <ul className="mt-2 flex flex-col gap-1">
              {passwordRules.map((rule) => (
                <li
                  key={rule.label}
                  className={`font-body text-small ${
                    rule.valid ? "text-green-600" : "text-neutral-500"
                  }`}
                >
                  {rule.valid ? "✓" : "○"} {rule.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label
              htmlFor="register-confirm-password"
              className="mb-2 block font-body text-small font-medium text-neutral-800"
            >
              Confirm Password
            </label>

            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
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
            Register
          </button>

          <p className="text-center font-body text-small text-neutral-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary-600 underline underline-offset-2 hover:text-primary-900"
            >
              Log in
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
