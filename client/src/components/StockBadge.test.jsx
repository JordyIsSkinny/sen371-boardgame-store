import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StockBadge } from "./StockBadge";

describe("StockBadge", () => {
  it("shows plain 'In stock' when no count is given", () => {
    render(<StockBadge status="in-stock" />);
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  it("shows the count when given for in-stock", () => {
    render(<StockBadge status="in-stock" count={12} />);
    expect(screen.getByText("In stock · 12 available")).toBeInTheDocument();
  });

  it("shows a generic low-stock message with no count", () => {
    render(<StockBadge status="low-stock" />);
    expect(screen.getByText("Low stock")).toBeInTheDocument();
  });

  it("shows the remaining count for low-stock", () => {
    render(<StockBadge status="low-stock" count={2} />);
    expect(screen.getByText("Only 2 left")).toBeInTheDocument();
  });

  it("shows 'Out of stock' regardless of count", () => {
    render(<StockBadge status="out-of-stock" count={0} />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("does not use the error text token for out-of-stock", () => {
    render(<StockBadge status="out-of-stock" />);
    expect(screen.getByText("Out of stock").className).toContain("text-neutral-700");
  });

  it("falls back to in-stock styling for an unknown status", () => {
    render(<StockBadge status="not-a-real-status" />);
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });
});
