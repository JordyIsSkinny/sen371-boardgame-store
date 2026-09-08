import { useParams } from "react-router-dom";

// S3 Product Detail (issue #69) — placeholder shell.
export function ProductDetail() {
  const { productId } = useParams();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Product {productId}</h1>
      <p className="text-slate-600">S3 — placeholder page.</p>
    </section>
  );
}
