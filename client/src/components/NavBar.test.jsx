import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { NavBar } from "./NavBar";

function renderNavBar(props) {
  return render(
    <MemoryRouter>
      <NavBar {...props} />
    </MemoryRouter>,
  );
}

describe("NavBar", () => {
  it("shows a login link and hides cart count for a guest", () => {
    renderNavBar({ state: "guest", cartCount: 5 });
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows the account button and real cart count when authenticated", () => {
    renderNavBar({ state: "authenticated", userName: "Alex", cartCount: 3 });
    expect(screen.getByRole("button", { name: "Alex" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My orders" })).toBeInTheDocument();
  });

  it("shows an Admin link only for the admin state", () => {
    renderNavBar({ state: "admin" });
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My orders" })).not.toBeInTheDocument();
  });

  it("falls back to 'Account' when authenticated with no userName", () => {
    renderNavBar({ state: "authenticated" });
    expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
  });

  it("calls onLogout when the account button is clicked", async () => {
    const onLogout = vi.fn();
    renderNavBar({ state: "authenticated", userName: "Alex", onLogout });

    await userEvent.click(screen.getByRole("button", { name: "Alex" }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("calls onSearchSubmit with the query on search submit", async () => {
    const onSearchSubmit = vi.fn();
    renderNavBar({ onSearchSubmit });

    const input = screen.getByPlaceholderText("Search games…");
    await userEvent.type(input, "Catan");
    await userEvent.keyboard("{Enter}");

    expect(onSearchSubmit).toHaveBeenCalledWith("Catan");
  });
});
