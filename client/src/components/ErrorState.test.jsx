import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("uses default title and message when none are given", () => {
    render(<ErrorState />);
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(screen.getByText("Please try again later.")).toBeInTheDocument();
  });

  it("renders custom title and message", () => {
    render(<ErrorState title="Failed to load products" message="Check your connection." />);
    expect(screen.getByText("Failed to load products")).toBeInTheDocument();
    expect(screen.getByText("Check your connection.")).toBeInTheDocument();
  });

  it("does not render a retry button when onRetry is not given", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a retry button and calls onRetry when clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
