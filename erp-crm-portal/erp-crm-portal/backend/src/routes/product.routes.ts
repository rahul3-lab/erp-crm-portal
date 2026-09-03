import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { authenticate, authorize } from "../middleware/auth";
import { MovementType } from "@prisma/client";

const router = Router();
router.use(authenticate);

const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().optional(),
  unitPrice: z.number().nonnegative("Unit price must be >= 0"),
  stock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(0),
  location: z.string().optional(),
});

// GET /products?search=&lowStock=true&page=&limit=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = (req.query.search as string) || "";
    const lowStockOnly = req.query.lowStock === "true";

    const where: any = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, allMatching] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({ where, orderBy: { createdAt: "desc" } }),
    ]);

    let results = allMatching;
    if (lowStockOnly) {
      results = results.filter((p) => p.stock <= p.minStock);
    }
    const paged = results.slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      data: paged,
      pagination: { page, limit, total: lowStockOnly ? results.length : total, totalPages: Math.ceil((lowStockOnly ? results.length : total) / limit) },
    });
  })
);

// GET /products/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { movements: { orderBy: { createdAt: "desc" }, take: 50, include: { createdBy: { select: { name: true } } } } },
    });
    if (!product) throw new ApiError(404, "Product not found");
    res.json({ success: true, data: product });
  })
);

// POST /products
router.post(
  "/",
  authorize("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: { ...data, createdById: req.user!.userId },
    });

    if (data.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: data.stock,
          movementType: MovementType.IN,
          reason: "Initial stock on product creation",
          createdById: req.user!.userId,
        },
      });
    }

    res.status(201).json({ success: true, data: product });
  })
);

// PUT /products/:id (edits metadata only; stock changes go through /stock-movement)
router.put(
  "/:id",
  authorize("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const data = productSchema.omit({ stock: true }).partial().parse(req.body);
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Product not found");

    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: product });
  })
);

const stockMovementSchema = z.object({
  quantity: z.number().int().positive("Quantity must be positive"),
  movementType: z.nativeEnum(MovementType),
  reason: z.string().min(1, "Reason is required"),
});

// POST /products/:id/stock-movement
router.post(
  "/:id/stock-movement",
  authorize("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const { quantity, movementType, reason } = stockMovementSchema.parse(req.body);

    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new ApiError(404, "Product not found");

      const newStock = movementType === "IN" ? existing.stock + quantity : existing.stock - quantity;
      if (newStock < 0) {
        throw new ApiError(400, `Insufficient stock. Current stock is ${existing.stock}, cannot remove ${quantity}.`);
      }

      const updated = await tx.product.update({ where: { id: req.params.id }, data: { stock: newStock } });
      await tx.stockMovement.create({
        data: { productId: req.params.id, quantity, movementType, reason, createdById: req.user!.userId },
      });
      return updated;
    });

    res.status(201).json({ success: true, data: product });
  })
);

export default router;
