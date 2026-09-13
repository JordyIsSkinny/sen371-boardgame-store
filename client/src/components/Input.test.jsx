import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("renders a text input by default", () => {
    render(<Input placeholder="Search games…" />);
    expect(screen.getByPlaceholderText("Search games…")).toHaveAttribute("type", "text");
  });

  it("accepts typed input", async () => {
    render(<Input placeholder="Search games…" onChange={() => {}} />);
    const input = screen.getByPlaceholderText("Search games…");

    await userEvent.type(input, "Catan");

    expect(input).toHaveValue("Catan");
  });

  it("is disabled when state is disabled", () => {
    render(<Input state="disabled" placeholder="Search games…" />);
    expect(screen.getByPlaceholderText("Search games…")).toBeDisabled();
  });

  it("applies the error border style when state is error", () => {
    render(<Input state="error" placeholder="Search games…" />);
    expect(screen.getByPlaceholderText("Search games…").className).toContain("border-error");
  });

  it("passes through arbitrary props like type", () => {
    render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email");
  });
});
