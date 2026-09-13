import { API_BASE_URL, TEST_PASSWORD, uniqueEmail } from "./app.js";

/**
 * Setup that talks to the API directly rather than driving the UI.
 *
 * Used only to arrange state a journey needs but is not itself asserting —
 * creating the account an order-history test then reads through the browser,
 * for example. The behaviour under test always goes through the UI; using the
 * API for arrangement keeps a failure in one journey from being caused by a
 * different journey's screen.
 */

export async function registerCustomer(request, prefix = "customer") {
  const email = uniqueEmail(prefix);

  const response = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      first_name: "Ellie",
      last_name: "Tester",
      email,
      password: TEST_PASSWORD,
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Could not register ${email}: ${response.status()} ${await response.text()}`,
    );
  }

  const { data } = await response.json();
  return { email, password: TEST_PASSWORD, accessToken: data.accessToken, user: data.user };
}

export async function login(request, email, password = TEST_PASSWORD) {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(
      `Could not log in as ${email}: ${response.status()} ${await response.text()}`,
    );
  }

  const { data } = await response.json();
  return data.accessToken;
}

const authHeaders = (accessToken) => ({ Authorization: `Bearer ${accessToken}` });

export async function getFirstInStockProduct(request) {
  const response = await request.get(`${API_BASE_URL}/products?page=1`);

  if (!response.ok()) {
    throw new Error(`Could not list products: ${response.status()}`);
  }

  const { data } = await response.json();
  const product = data.find((item) => (item.inventory?.quantityOnHand ?? 0) > 0);

  if (!product) {
    throw new Error(
      "No product with stock on the first page of the catalogue. Has the database been seeded (server: npx prisma db seed)?",
    );
  }

  return product;
}

export async function addToCart(request, accessToken, productId, quantity = 1) {
  const response = await request.post(`${API_BASE_URL}/cart/items`, {
    headers: authHeaders(accessToken),
    data: { productId, quantity },
  });

  if (!response.ok()) {
    throw new Error(
      `Could not add product ${productId} to the cart: ${response.status()} ${await response.text()}`,
    );
  }

  return (await response.json()).data;
}

export async function createAddress(request, accessToken) {
  const response = await request.post(`${API_BASE_URL}/addresses`, {
    headers: authHeaders(accessToken),
    data: {
      line1: "12 Test Street",
      line2: "",
      city: "Pretoria",
      provinceState: "Gauteng",
      postalCode: "0181",
      country: "South Africa",
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Could not create an address: ${response.status()} ${await response.text()}`,
    );
  }

  return (await response.json()).data;
}

export async function placeOrder(request, accessToken, { addressId, items }) {
  const response = await request.post(`${API_BASE_URL}/orders`, {
    headers: authHeaders(accessToken),
    data: { addressId, items },
  });

  if (!response.ok()) {
    throw new Error(
      `Could not place an order: ${response.status()} ${await response.text()}`,
    );
  }

  return (await response.json()).data;
}

/**
 * Logs in through the browser rather than injecting a token.
 *
 * Injection is not an option here even for arrangement: the access token is
 * held in a module-scoped variable inside api/client.js and never in
 * localStorage (docs/auth-contracts.md), so there is nowhere for a test to
 * put it. Driving the real form is also what keeps the session cookie and the
 * in-memory token consistent with each other.
 */
export async function loginThroughUi(page, email, password = TEST_PASSWORD) {
  const { visit } = await import("./app.js");

  await visit(page, "login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  // The form navigates on success; waiting for the nav to change state is
  // more honest than waiting for a URL, because a failed login also stays on
  // a page that looks similar.
  await page.getByRole("button", { name: "Log out" }).waitFor();
}
