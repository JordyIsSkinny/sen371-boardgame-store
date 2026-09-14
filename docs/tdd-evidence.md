# TDD Evidence

## 1. Purpose

This document compiles evidence from the repository's Git history demonstrating the use of test-driven development (TDD) and test-first practices.

The evidence is based on commit chronology, commit messages, and the files changed by the relevant commits. The report distinguishes between commits that explicitly demonstrate tests being written before implementation and commits where tests and implementation were developed together.

## 2. Evidence Classification

The Git history was reviewed using the following classifications:

* **Strong TDD evidence:** A test commit explicitly states that tests were written before the implementation, and the subsequent implementation commit can be identified.
* **Supporting evidence:** Tests and implementation were introduced together in the same commit, demonstrating that testing was part of the feature development process but not proving which was written first.
* **General testing evidence:** Dedicated test commits demonstrate systematic testing, but the available chronology does not establish a test-first sequence.

## 3. Strong TDD Evidence

### 3.1 `requireOwnershipOrAdmin` Middleware

**Test commit:**

```text
88cd917 | 2026-09-07
test(server): add tests for requireOwnershipOrAdmin middleware
```

The commit added **191 lines** to:

```text
server/src/middleware/require-ownership.test.js
```

The commit message explicitly states that the tests were **"Written ahead of the implementation."** It also identifies the behaviours being tested, including the admin bypass and the 404-not-403 rule for non-owned resources.

The subsequent implementation commit was:

```text
fe3ff00 | 2026-09-07
feat(server): add requireOwnershipOrAdmin middleware
```

This provides direct chronological evidence of a test-first workflow: the tests were committed before the corresponding middleware implementation.

**Classification: Strong TDD evidence**

---

### 3.2 `getProductById` Category and Inventory Data

**Test commit:**

```text
b742d12 | 2026-09-10
test(server): cover getProductById category/inventory inclusion
```

The commit added **50 lines** to:

```text
server/src/repositories/product.repository.test.js
```

The commit message explicitly states:

> "Red tests first per the TDD convention"

It also explains that `getProductById` did not yet return the required category and inventory fields when the tests were written.

The corresponding implementation commit was:

```text
c3f561d | 2026-09-10
feat(server): include category and inventory data on GET /products/:id
```

This provides both explicit TDD intent and chronological evidence of tests preceding the implementation.

**Classification: Strong TDD evidence**

---

### 3.3 CORS Origin Allowlist

**Test commit:**

```text
2e4d722 | 2026-09-08
test(server): assert CORS origin allowlist behaviour
```

The commit modified:

```text
server/src/app.test.js
```

with **40 insertions and 5 deletions**.

The commit message explicitly states that the tests fail against the existing single-origin configuration and describes the expected behaviour for multiple configured origins, disallowed origins, and requests without an `Origin` header.

A follow-up test refinement was made in:

```text
49b0164 | 2026-09-08
test(server): make CLIENT_ORIGIN setup order-independent in app.test.js
```

The corresponding implementation commit was:

```text
4f645da | 2026-09-08
feat(server): support a comma-separated CLIENT_ORIGIN allowlist
```

The implementation modified:

```text
.env.example
server/src/app.js
server/src/config/index.js
```

This sequence provides evidence that the expected CORS behaviour was specified and tested before the corresponding implementation change.

**Classification: Strong TDD evidence**

## 4. Supporting TDD Evidence

Several early repository commits introduced implementation and tests together.

### 4.1 `getProductById`

```text
4eb74de | 2026-09-02
feat(db): add getProductById repository with tests
```

The commit added both:

```text
server/src/repositories/product.repository.js
server/src/repositories/product.repository.test.js
```

with 48 total lines added.

### 4.2 `getAllProducts`

```text
f5659f2 | 2026-09-02
feat(db): add getAllProducts repository with tests
```

The commit introduced the repository functionality together with its corresponding tests.

### 4.3 Product Create, Update and Delete

```text
9a15e04 | 2026-09-02
feat(db): add createProduct, updateProduct, deleteProduct with tests
```

This commit similarly introduced multiple repository operations together with their tests.

These commits demonstrate that tests were treated as part of feature development from the beginning of the repository implementation work. However, because the tests and implementation were committed together, the Git history alone does not establish that the tests were written first.

**Classification: Supporting TDD evidence**

## 5. Additional Testing Evidence

The repository also contains dedicated testing work across the backend, client, and E2E layers.

Examples include:

```text
3a8e9bb | test(server): add route protection audit for RBAC coverage
2e4d722 | test(server): assert CORS origin allowlist behaviour
5dbce71 | test(server): add route protection audit
58cc819 | test(client): set up Vitest, React Testing Library and jsdom
444526f | test(client): add component tests for the ten shared UI components
0607f35 | test(e2e): journey 1 — browse and filter the catalogue
18a2d69 | test(e2e): journey 2 — register, log out, log back in
e6b44d0 | test(e2e): journey 3 — add to cart and check out, to the point it stops
3d3ccf9 | test(e2e): journey 4 — a customer sees the order they placed
742ab0c | test(e2e): journey 5 — admin sees controls a customer does not
```

These commits demonstrate that automated testing was incorporated across multiple application layers.

However, these examples are not automatically classified as TDD evidence because the available commit chronology does not always establish that the tests were written before the implementation they exercise.

## 6. Limitations of the Evidence

Git commit history can demonstrate test-first development when the chronology and commit content clearly support it, but it cannot prove the exact order in which individual lines of code were written within a commit.

For this reason, the strongest claims in this report are limited to commits where:

1. The test commit can be identified.
2. The corresponding implementation commit can be identified.
3. The test commit precedes the implementation commit.
4. The commit message provides explicit evidence of test-first or TDD intent where available.

The evidence therefore does not claim that every feature in the project was developed using strict TDD.

## 7. Conclusion

The repository history provides clear evidence of test-first development for several backend features.

The strongest examples are:

* `88cd917 → fe3ff00`: `requireOwnershipOrAdmin` middleware
* `b742d12 → c3f561d`: `getProductById` category and inventory behaviour
* `2e4d722 → 4f645da`: CORS origin allowlist behaviour

These examples are particularly strong because the test commits explicitly describe test-first intent, including the statements that the tests were written ahead of implementation and that red tests came first according to the project's TDD convention.

Additional commits show that tests were also developed alongside implementation for repository functionality and that automated testing was incorporated across backend, client, and E2E layers.

Overall, the Git history provides credible evidence of TDD practices within the project while avoiding the unsupported claim that every feature followed strict test-first development.
