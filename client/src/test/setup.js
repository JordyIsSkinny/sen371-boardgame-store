import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// No `globals: true` in vite.config.js (server tests import explicitly too),
// so RTL's automatic afterEach-cleanup never registers on its own.
afterEach(cleanup);
