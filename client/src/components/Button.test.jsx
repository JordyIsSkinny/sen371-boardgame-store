import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Add to cart</Button>);
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Add to cart</Button>);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button state="disabled" onClick={onClick}>
        Add to cart
      </Button>,
    );

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("falls back to the primary style for an unknown style prop", () => {
    render(<Button style="not-a-real-style">Add to cart</Button>);
    expect(screen.getByRole("button").className).toContain("bg-primary-500");
  });
});
