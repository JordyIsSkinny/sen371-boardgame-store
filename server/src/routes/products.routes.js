import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  filterProducts,
} from "../repositories/product.repository.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { playerCount, categoryId, maxPlayTime, sortBy, sortDir, page, pageSize } = req.query;

    const hasFilters = playerCount || categoryId || maxPlayTime || sortBy || sortDir || page || pageSize;

    if (hasFilters) {
      const result = await filterProducts({
        playerCount,
        categoryId,
        maxPlayTime,
        sortBy,
        sortDir,
        page,
        pageSize,
      });
      return res.json(result);
    }

    const products = await getAllProducts();
    res.json({ data: products });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
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

router.post("/", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const product = await updateProduct(Number(req.params.id), req.body);
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const product = await deleteProduct(Number(req.params.id));
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

export default router;