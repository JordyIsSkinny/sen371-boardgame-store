import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProductCard } from "./ProductCard";

function renderCard(props) {
  return render(
    <MemoryRouter>
      <ProductCard id="1" title="Catan" {...props} />
    </MemoryRouter>,
  );
}

describe("ProductCard", () => {
  it("links to the product's detail page", () => {
    renderCard({ id: "42" });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/42");
  });

  it("renders the title", () => {
    renderCard();
    expect(screen.getByText("Catan")).toBeInTheDocument();
  });

  it("formats the price as ZAR currency", () => {
    renderCard({ price: 549.99 });
    expect(screen.getByText(/^R\s?549,99$/)).toBeInTheDocument();
  });

  it("does not render a price when none is given", () => {
    const { container } = renderCard();
    expect(container.textContent).not.toMatch(/R\d/);
  });

  it("renders category and stats when given", () => {
    renderCard({ category: "Strategy", stats: "2-4 players · 60 min" });
    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(screen.getByText("2-4 players · 60 min")).toBeInTheDocument();
  });

  it("renders a plain in-stock badge with no count, never a richer one", () => {
    renderCard({ status: "in-stock" });
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  it("renders the out-of-stock badge and dims the card", () => {
    renderCard({ status: "out-of-stock" });
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByRole("link").className).toContain("opacity-60");
  });

  it("renders the rating with review count when given", () => {
    renderCard({ rating: 4.5, reviewCount: 128 });
    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    expect(screen.getByText(/\(128\)/)).toBeInTheDocument();
  });

  it("renders a string rating without crashing", () => {
    // averageRating is a Prisma Decimal, which serialises over JSON as a
    // string ("4.5"), not a number - Catalogue.jsx and ProductDetail.jsx's
    // related-products list both pass it straight through unconverted.
    // A raw number literal here would never catch a regression, since
    // (4.5).toFixed(1) already works fine; only a string does not.
    renderCard({ rating: "4.5", reviewCount: 2 });
    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
  });
});
