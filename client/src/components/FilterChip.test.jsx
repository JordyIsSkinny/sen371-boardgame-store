import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChip } from "./FilterChip";

describe("FilterChip", () => {
  it("renders its label", () => {
    render(<FilterChip>2-4 players</FilterChip>);
    expect(screen.getByText("2-4 players")).toBeInTheDocument();
  });

  it("shows a remove button by default", () => {
    render(<FilterChip>2-4 players</FilterChip>);
    expect(screen.getByRole("button", { name: "Remove 2-4 players filter" })).toBeInTheDocument();
  });

  it("hides the remove button when removable is false", () => {
    render(<FilterChip removable={false}>2-4 players</FilterChip>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onRemove when the remove button is clicked", async () => {
    const onRemove = vi.fn();
    render(<FilterChip onRemove={onRemove}>2-4 players</FilterChip>);

    await userEvent.click(screen.getByRole("button"));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
