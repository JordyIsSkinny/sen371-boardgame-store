import { describe, it, expect } from "vitest";
import {
  validate,
  productIdSchema,
  createProductSchema,
  productQuerySchema,
  userQuerySchema,
  isValidPhone,
} from "./validate.js";

describe("validate middleware", () => {
  it("calls next with a validation error when request data is invalid", () => {
    const req = {
      body: {},
      params: { id: "abc" },
      query: {},
    };

    const res = {};

    let receivedError;

    const next = (error) => {
      receivedError = error;
    };

    validate({ params: productIdSchema })(req, res, next);

    expect(receivedError).toBeDefined();
    expect(receivedError.status).toBe(422);
    expect(receivedError.error).toBe("VALIDATION_ERROR");
    expect(receivedError.message).toBe("Request validation failed.");
  });
    it("calls next without an error when request data is valid", () => {
    const req = {
      body: {},
      params: { id: "5" },
      query: {},
    };

    const res = {};

    let receivedError = "not-called";

    const next = (error) => {
      receivedError = error;
    };

    validate({ params: productIdSchema })(req, res, next);

    expect(receivedError).toBeUndefined();
  });
    it("rejects an invalid product ID", () => {
    const errors = productIdSchema({ id: "abc" });

    expect(errors).toEqual([
      {
        field: "id",
        message: "Product ID must be a positive integer.",
      },
    ]);
  });
    it("rejects an invalid categoryId and quantityOnHand on product creation", () => {
    const errors = createProductSchema({
      title: "Azul",
      slug: `azul-${Date.now()}`,
      minPlayers: 2,
      maxPlayers: 4,
      playTimeMinutes: 45,
      minAge: 8,
      complexityRating: 1.8,
      price: 550,
      categoryId: "abc",
      quantityOnHand: -5,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        { field: "categoryId", message: "Category ID must be a positive integer." },
        { field: "quantityOnHand", message: "Quantity on hand must be a non-negative integer." },
      ])
    );
  });
    it("accepts product creation data with no categoryId or quantityOnHand", () => {
    const errors = createProductSchema({
      title: "Azul",
      slug: `azul-${Date.now()}`,
      minPlayers: 2,
      maxPlayers: 4,
      playTimeMinutes: 45,
      minAge: 8,
      complexityRating: 1.8,
      price: 550,
    });

    expect(errors).toEqual([]);
  });
    it("rejects invalid product creation data", () => {
    const errors = createProductSchema({
      title: "",
      slug: "",
      minPlayers: 0,
      maxPlayers: 2,
      playTimeMinutes: 0,
      minAge: -1,
      complexityRating: 6,
      price: -10,
      imageUrl: "not-a-url",
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors).toEqual(
      expect.arrayContaining([
        {
          field: "title",
          message: "Title is required and must be a non-empty string.",
        },
        {
          field: "slug",
          message: "Slug is required and must be a non-empty string.",
        },
        {
          field: "minPlayers",
          message: "Minimum players must be a positive integer.",
        },
        {
          field: "playTimeMinutes",
          message: "Play time must be a positive integer.",
        },
        {
          field: "minAge",
          message: "Minimum age must be a non-negative integer.",
        },
        {
          field: "complexityRating",
          message: "Complexity rating must be a number between 0 and 5.",
        },
        {
          field: "price",
          message: "Price must be a positive number.",
        },
        {
          field: "imageUrl",
          message: "Image URL must be a valid URL.",
        },
      ]),
    );
  });
    it("rejects invalid product query parameters", () => {
    const errors = productQuerySchema({
      playerCount: "abc",
      categoryId: "0",
      maxPlayTime: "-10",
      sortBy: "invalid",
      sortDir: "sideways",
      page: "0",
      pageSize: "-5",
    });

    expect(errors.length).toBe(7);

    expect(errors).toEqual(
      expect.arrayContaining([
        {
          field: "playerCount",
          message: "Player count must be a positive integer.",
        },
        {
          field: "categoryId",
          message: "Category ID must be a positive integer.",
        },
        {
          field: "maxPlayTime",
          message: "Maximum play time must be a positive integer.",
        },
        {
          field: "sortBy",
          message: "Invalid sort field.",
        },
        {
          field: "sortDir",
          message: "Sort direction must be either asc or desc.",
        },
        {
          field: "page",
          message: "Page must be a positive integer.",
        },
        {
          field: "pageSize",
          message: "Page size must be a positive integer.",
        },
      ]),
    );
  });
    it("rejects invalid user query parameters", () => {
    const errors = userQuerySchema({ page: "0", pageSize: "-5" });

    expect(errors).toEqual(
      expect.arrayContaining([
        {
          field: "page",
          message: "Page must be a positive integer.",
        },
        {
          field: "pageSize",
          message: "Page size must be a positive integer.",
        },
      ]),
    );
  });
    it("accepts a request with no page/pageSize supplied", () => {
    const errors = userQuerySchema({});

    expect(errors).toEqual([]);
  });

  describe("isValidPhone", () => {
    it("accepts an ordinary local number", () => {
      expect(isValidPhone("0821234567")).toBe(true);
    });

    it("accepts international format with a leading +", () => {
      expect(isValidPhone("+27821234567")).toBe(true);
    });

    it("accepts a number with spaces or dashes", () => {
      expect(isValidPhone("082 123 4567")).toBe(true);
      expect(isValidPhone("082-123-4567")).toBe(true);
    });

    it("rejects a string with no digits at all", () => {
      // Previously matched: [\d\s-] also matches whitespace and dashes
      // alone, so seven dashes passed as a "valid phone number".
      expect(isValidPhone("-------")).toBe(false);
      expect(isValidPhone("       ")).toBe(false);
    });

    it("rejects a string one character over the addresses.phone VARCHAR(20) limit", () => {
      // Previously the regex allowed a leading + PLUS up to 20 more
      // characters (21 total), passing validation and then failing at
      // the database as an unmapped truncation error.
      expect(isValidPhone("+27123456789012345678")).toBe(false); // 21 chars
      expect(isValidPhone("+2712345678901234567")).toBe(true); // 20 chars, the real limit
    });

    it("rejects a string shorter than 7 characters", () => {
      expect(isValidPhone("123")).toBe(false);
    });

    it("rejects non-string input", () => {
      expect(isValidPhone(1234567890)).toBe(false);
      expect(isValidPhone(null)).toBe(false);
      expect(isValidPhone(undefined)).toBe(false);
    });
  });

});