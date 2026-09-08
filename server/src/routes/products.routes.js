import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import {
  validate,
  productIdSchema,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from "../middleware/validate.js";

import {
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  filterProducts,
} from "../repositories/product.repository.js";
const router = Router();

router.get("/", validate({ query: productQuerySchema }), async (req, res, next) => {
  try {
    const {
      playerCount,
      categoryId,
      maxPlayTime,
      sortBy,
      sortDir,
      page = 1,
      pageSize = 20,
    } = req.query;

    const result = await filterProducts({
      playerCount,
      categoryId,
      maxPlayTime,
      sortBy,
      sortDir,
      page,
      pageSize,
    });

    const totalPages = Math.ceil(result.total / result.pageSize);

    res.json({
      data: result.items,
      meta: {
        page: result.page,
        limit: result.pageSize,
        total: result.total,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", validate({ params: productIdSchema }), async (req, res, next) => {
  try {
    const product = await getProductById(Number(req.params.id));
    if (!product) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Product not found" });
    }
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

router.post("/", authenticate, authorize("admin"), validate({ body: createProductSchema }), async (req, res, next) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authenticate, authorize("admin"), validate({ params: productIdSchema, body: updateProductSchema }), async (req, res, next) => {
  try {
    const product = await updateProduct(Number(req.params.id), req.body);
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authenticate, authorize("admin"), validate({ params: productIdSchema }), async (req, res, next) => {
  try {
    const product = await deleteProduct(Number(req.params.id));
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

export default router;