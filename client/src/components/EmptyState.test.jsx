import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("uses the default title when none is given", () => {
    render(<EmptyState />);
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
  });

  it("renders a custom title", () => {
    render(<EmptyState title="No games match your filters." />);
    expect(screen.getByText("No games match your filters.")).toBeInTheDocument();
  });

  it("does not render a message paragraph when none is given", () => {
    const { container } = render(<EmptyState />);
    expect(container.querySelector("p")).not.toBeInTheDocument();
  });

  it("renders the message when given", () => {
    render(<EmptyState message="Try clearing your filters." />);
    expect(screen.getByText("Try clearing your filters.")).toBeInTheDocument();
  });
});
