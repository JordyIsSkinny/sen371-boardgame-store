# Test Report and Coverage Analysis

## 1. Test Execution

The backend automated test suite was executed using the coverage configuration introduced in Issue #139.

**Command:**

```bash
cd server
npm run test:coverage
```

**Test configuration:**

* Test runner: Vitest
* Coverage provider: V8
* Coverage reporters: text, HTML, JSON
* Test environment: `.env.test`

**Result:**

* Test files: **32 passed / 32 total**
* Tests: **337 passed / 337 total**
* Test failures: **0**
* Test duration: **20.30 seconds**

The full test suite completed successfully with no failing tests.

## 2. Coverage Results

| Metric     |   Coverage |
| ---------- | ---------: |
| Statements | **57.49%** |
| Branches   | **88.95%** |
| Functions  | **64.70%** |
| Lines      | **57.49%** |

The project's target is at least **80% automated code coverage for core application logic**.

The current aggregate statement and line coverage is therefore below the 80% target.

## 3. Coverage by Application Area

| Area         | Statements | Branches | Functions |
| ------------ | ---------: | -------: | --------: |
| `server/src` |     77.57% |   83.33% |    66.66% |
| Controllers  |     65.95% |   96.77% |    50.00% |
| Middleware   |     59.95% |   94.21% |    54.71% |
| Repositories |     75.55% |   93.10% |    58.00% |
| Routes       |     86.27% |   54.54% |    33.33% |
| Services     |     96.33% |   93.57% |    92.68% |
| Errors       |    100.00% |  100.00% |   100.00% |
| Models       |    100.00% |  100.00% |   100.00% |
| Library      |    100.00% |    0.00% |   100.00% |

The strongest coverage is concentrated in the service layer, error classes, models, and several individual controllers, repositories, and routes.

## 4. Coverage Analysis

### 4.1 Strengths

The test suite provides strong coverage of application decision paths, reflected by the **88.95% branch coverage**.

The service layer has particularly strong coverage at **96.33% statements**, **93.57% branches**, and **92.68% functions**. This indicates that most of the business-logic paths currently exercised by the suite are well tested.

The error classes and model layer both achieve **100% statement, branch, and function coverage**.

Several individual components also have complete coverage, including:

* `app.js`
* `inventory.controller.js`
* `payment.controller.js`
* `user.controller.js`
* authentication middleware
* authorization middleware
* error handling middleware
* request logging middleware
* ownership middleware
* response serialization middleware
* address repository
* category repository
* payment repository
* inventory service
* password service
* payment service
* user service

### 4.2 Coverage Gaps

The overall statement coverage is reduced by several areas with substantial untested code.

Notable gaps include:

* `address.controller.js`: 17.85% statements
* `auth.controller.js`: 33.96% statements
* `cart.controller.js`: 36.00% statements
* `validate.js`: 43.39% statements
* `cart.repository.js`: 44.00% statements
* `refresh-token.repository.js`: 43.83% statements
* `user-profile.repository.js`: 36.98% statements
* `user.repository.js`: 25.71% statements
* `address.service.js`: 55.55% statements
* `notFound.js`: 60.00% statements

The low function coverage in several of these areas also indicates that some functions have not yet been exercised by the current automated suite.

### 4.3 Non-application Code

The aggregate coverage figure also includes files that are not the primary focus of application-logic testing.

For example:

* `server/prisma/seed.js` has 0% coverage because seed-data execution is not part of the automated application test suite.
* `server.js` has 0% coverage because the tests exercise the Express application rather than the production process entry point.
* `prisma.config.ts` is also not exercised by the current test suite.

These files contribute to the overall coverage percentage but do not necessarily represent missing tests for core application behaviour.

## 5. Target Assessment

The current results demonstrate a fully passing automated backend test suite, but the **80% coverage target has not yet been reached**.

The current `server/src` statement coverage is **77.57%**, which is closer to the target than the overall 57.49% figure. The strongest area is the service layer at 96.33%, while the largest opportunities for improvement are currently concentrated in controllers, middleware, and several repositories.

The coverage report therefore identifies specific areas for additional tests rather than indicating a general failure of the test suite.

## 6. Recommended Follow-Up Testing

To move coverage toward the 80% target, additional tests should prioritise:

1. Authentication controller paths not currently exercised.
2. Address and cart controller behaviour.
3. User and user-profile repository operations.
4. Refresh-token repository operations.
5. Validation middleware paths.
6. Address service behaviour.
7. Remaining uncovered order, product, category, and route branches where appropriate.

Testing should prioritise meaningful application behaviour rather than adding tests solely to increase the numerical coverage percentage.

## 7. Reproducibility

The coverage tooling used for this report was introduced by Issue #139 and is available through the `test:coverage` script in `server/package.json`.

Coverage output is generated under:

```text
server/coverage/
```

The generated coverage directory is intentionally ignored by Git and is therefore not committed to the repository.

The report is based on the test run performed against commit:

```text
2c11e4d test: add coverage tooling
```

The generated HTML and JSON coverage reports can be reproduced locally by running:

```bash
cd server
npm run test:coverage
```

## 8. Conclusion

The backend suite currently provides a strong automated testing foundation, with **337/337 tests passing** and **88.95% branch coverage**.

However, the current **57.49% statement/line coverage overall and 77.57% statement coverage within `server/src` remain below the project's 80% target**.

The coverage report provides a clear basis for prioritising additional tests in the lower-covered controllers, middleware, repositories, and services. No failing tests were identified during this coverage run.
