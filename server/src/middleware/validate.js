import ValidationError from "../errors/validation-error.js";
import {
  validate,
  productIdSchema,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from "../middleware/validate.js";

export function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    if (schema.body) {
      errors.push(...schema.body(req.body ?? {}, "body"));
    }

    if (schema.params) {
      errors.push(...schema.params(req.params ?? {}, "params"));
    }

    if (schema.query) {
      errors.push(...schema.query(req.query ?? {}, "query"));
    }

    if (errors.length > 0) {
      return next(
        new ValidationError("Request validation failed.", errors),
      );
    }

    next();
  };
}

export function isPositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}
export function isRequired(value) {
  return value !== undefined && value !== null && value !== "";
}
export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
export function isNumberInRange(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}
export function isValidId(value) {
  return isPositiveInteger(value);
}
export function isValidStringLength(value, maxLength) {
  return typeof value === "string" && value.length <= maxLength;
}
export function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
export function isValidDecimal(value) {
  return Number.isFinite(Number(value));
}
export function isValidBoolean(value) {
  return value === true || value === false;
}
export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}
export function isValidArray(value) {
  return Array.isArray(value);
}
export function isInteger(value) {
  return Number.isInteger(Number(value));
}
export function isString(value) {
  return typeof value === "string";
}
export function isIntegerInRange(value, min, max) {
  return isInteger(value) && Number(value) >= min && Number(value) <= max;
}
export function isNonNegativeInteger(value) {
  return isInteger(value) && Number(value) >= 0;
}
export function isValidPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}
export function hasOnlyAllowedFields(object, allowedFields) {
  return Object.keys(object).every((field) => allowedFields.includes(field));
}
export function isValidEnum(value, allowedValues) {
  return allowedValues.includes(value);
}
export const productIdSchema = (params) => {
  const errors = [];

  if (!isValidId(params.id)) {
    errors.push({
      field: "id",
      message: "Product ID must be a positive integer.",
    });
  }

  return errors;
};
export const createProductSchema = (body) => {
  const errors = [];

  if (!isNonEmptyString(body.title)) {
    errors.push({
      field: "title",
      message: "Title is required and must be a non-empty string.",
    });
  } else if (!isValidStringLength(body.title, 255)) {
    errors.push({
      field: "title",
      message: "Title must not exceed 255 characters.",
    });
  }

  if (!isNonEmptyString(body.slug)) {
    errors.push({
      field: "slug",
      message: "Slug is required and must be a non-empty string.",
    });
  } else if (!isValidStringLength(body.slug, 255)) {
    errors.push({
      field: "slug",
      message: "Slug must not exceed 255 characters.",
    });
  }

  if (!isPositiveInteger(body.minPlayers)) {
    errors.push({
      field: "minPlayers",
      message: "Minimum players must be a positive integer.",
    });
  }

  if (!isPositiveInteger(body.maxPlayers)) {
    errors.push({
      field: "maxPlayers",
      message: "Maximum players must be a positive integer.",
    });
  }

  if (
    isPositiveInteger(body.minPlayers) &&
    isPositiveInteger(body.maxPlayers) &&
    Number(body.minPlayers) > Number(body.maxPlayers)
  ) {
    errors.push({
      field: "maxPlayers",
      message: "Maximum players must be greater than or equal to minimum players.",
    });
  }

  if (!isPositiveInteger(body.playTimeMinutes)) {
    errors.push({
      field: "playTimeMinutes",
      message: "Play time must be a positive integer.",
    });
  }

  if (!isNonNegativeInteger(body.minAge)) {
    errors.push({
      field: "minAge",
      message: "Minimum age must be a non-negative integer.",
    });
  }

  if (!isNumberInRange(body.complexityRating, 0, 5)) {
    errors.push({
      field: "complexityRating",
      message: "Complexity rating must be a number between 0 and 5.",
    });
  }

  if (!isValidPositiveNumber(body.price)) {
    errors.push({
      field: "price",
      message: "Price must be a positive number.",
    });
  }

  if (
    body.imageUrl !== undefined &&
    (!isString(body.imageUrl) || !isValidUrl(body.imageUrl))
  ) {
    errors.push({
      field: "imageUrl",
      message: "Image URL must be a valid URL.",
    });
  }

  return errors;
};
export const updateProductSchema = (body) => {
  const errors = [];

  if (body.title !== undefined) {
    if (!isNonEmptyString(body.title)) {
      errors.push({
        field: "title",
        message: "Title must be a non-empty string.",
      });
    } else if (!isValidStringLength(body.title, 255)) {
      errors.push({
        field: "title",
        message: "Title must not exceed 255 characters.",
      });
    }
  }

  if (body.slug !== undefined) {
    if (!isNonEmptyString(body.slug)) {
      errors.push({
        field: "slug",
        message: "Slug must be a non-empty string.",
      });
    } else if (!isValidStringLength(body.slug, 255)) {
      errors.push({
        field: "slug",
        message: "Slug must not exceed 255 characters.",
      });
    }
  }

  if (body.minPlayers !== undefined && !isPositiveInteger(body.minPlayers)) {
    errors.push({
      field: "minPlayers",
      message: "Minimum players must be a positive integer.",
    });
  }

  if (body.maxPlayers !== undefined && !isPositiveInteger(body.maxPlayers)) {
    errors.push({
      field: "maxPlayers",
      message: "Maximum players must be a positive integer.",
    });
  }

  if (
    body.minPlayers !== undefined &&
    body.maxPlayers !== undefined &&
    isPositiveInteger(body.minPlayers) &&
    isPositiveInteger(body.maxPlayers) &&
    Number(body.minPlayers) > Number(body.maxPlayers)
  ) {
    errors.push({
      field: "maxPlayers",
      message: "Maximum players must be greater than or equal to minimum players.",
    });
  }

  if (
    body.playTimeMinutes !== undefined &&
    !isPositiveInteger(body.playTimeMinutes)
  ) {
    errors.push({
      field: "playTimeMinutes",
      message: "Play time must be a positive integer.",
    });
  }

  if (body.minAge !== undefined && !isNonNegativeInteger(body.minAge)) {
    errors.push({
      field: "minAge",
      message: "Minimum age must be a non-negative integer.",
    });
  }

  if (
    body.complexityRating !== undefined &&
    !isNumberInRange(body.complexityRating, 0, 5)
  ) {
    errors.push({
      field: "complexityRating",
      message: "Complexity rating must be a number between 0 and 5.",
    });
  }

  if (
    body.price !== undefined &&
    !isValidPositiveNumber(body.price)
  ) {
    errors.push({
      field: "price",
      message: "Price must be a positive number.",
    });
  }

  if (body.imageUrl !== undefined) {
    if (!isString(body.imageUrl) || !isValidUrl(body.imageUrl)) {
      errors.push({
        field: "imageUrl",
        message: "Image URL must be a valid URL.",
      });
    }
  }

  return errors;
};
export const productQuerySchema = (query) => {
  const errors = [];

  if (
    query.playerCount !== undefined &&
    !isPositiveInteger(query.playerCount)
  ) {
    errors.push({
      field: "playerCount",
      message: "Player count must be a positive integer.",
    });
  }

  if (
    query.categoryId !== undefined &&
    !isPositiveInteger(query.categoryId)
  ) {
    errors.push({
      field: "categoryId",
      message: "Category ID must be a positive integer.",
    });
  }

  if (
    query.maxPlayTime !== undefined &&
    !isPositiveInteger(query.maxPlayTime)
  ) {
    errors.push({
      field: "maxPlayTime",
      message: "Maximum play time must be a positive integer.",
    });
  }

  if (
    query.sortBy !== undefined &&
    !isValidEnum(query.sortBy, [
      "price",
      "createdAt",
      "title",
      "complexityRating",
    ])
  ) {
    errors.push({
      field: "sortBy",
      message: "Invalid sort field.",
    });
  }

  if (
    query.sortDir !== undefined &&
    !isValidEnum(query.sortDir, ["asc", "desc"])
  ) {
    errors.push({
      field: "sortDir",
      message: "Sort direction must be either asc or desc.",
    });
  }

  if (query.page !== undefined && !isPositiveInteger(query.page)) {
    errors.push({
      field: "page",
      message: "Page must be a positive integer.",
    });
  }

  if (query.pageSize !== undefined && !isPositiveInteger(query.pageSize)) {
    errors.push({
      field: "pageSize",
      message: "Page size must be a positive integer.",
    });
  }

  return errors;
};
export const addCartItemSchema = (body) => {
  const errors = [];

  if (!isValidId(body.productId)) {
    errors.push({
      field: "productId",
      message: "Product ID must be a positive integer.",
    });
  }

  if (!isPositiveInteger(body.quantity)) {
    errors.push({
      field: "quantity",
      message: "Quantity must be a positive integer.",
    });
  }

  return errors;
};
export const updateCartItemSchema = (body) => {
  const errors = [];

  if (!isPositiveInteger(body.quantity)) {
    errors.push({
      field: "quantity",
      message: "Quantity must be a positive integer.",
    });
  }

  return errors;
};
export const cartItemIdSchema = (params) => {
  const errors = [];

  if (!isValidId(params.id)) {
    errors.push({
      field: "id",
      message: "Cart item ID must be a positive integer.",
    });
  }

  return errors;
};
export const createOrderSchema = (body) => {
  const errors = [];

  if (!isValidId(body.addressId)) {
    errors.push({
      field: "addressId",
      message: "Address ID must be a positive integer.",
    });
  }

  if (!isNonEmptyArray(body.items)) {
    errors.push({
      field: "items",
      message: "Order must contain at least one item.",
    });
  } else {
    body.items.forEach((item, index) => {
      if (!isValidId(item.productId)) {
        errors.push({
          field: `items[${index}].productId`,
          message: "Product ID must be a positive integer.",
        });
      }

      if (!isPositiveInteger(item.quantity)) {
        errors.push({
          field: `items[${index}].quantity`,
          message: "Quantity must be a positive integer.",
        });
      }
    });
  }

  return errors;
};
export const orderIdSchema = (params) => {
  const errors = [];

  if (!isValidId(params.id)) {
    errors.push({
      field: "id",
      message: "Order ID must be a positive integer.",
    });
  }

  return errors;
};