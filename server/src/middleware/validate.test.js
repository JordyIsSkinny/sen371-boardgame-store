import { describe, it, expect } from "vitest";
import {
  validate,
  productIdSchema,
  createProductSchema,
  productQuerySchema,
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
  

});