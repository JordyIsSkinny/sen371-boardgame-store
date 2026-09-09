import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-slate-600">
        <Link to="/" className="underline">
          Back to home
        </Link>
      </p>
    </section>
  );
}
