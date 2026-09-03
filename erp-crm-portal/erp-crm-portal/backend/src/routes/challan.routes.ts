import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { authenticate, authorize } from "../middleware/auth";
import { ChallanStatus, MovementType } from "@prisma/client";

const router = Router();
router.use(authenticate);

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive("Quantity must be positive"),
});

const createChallanSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(itemSchema).min(1, "At least one product is required"),
  status: z.enum(["DRAFT", "CONFIRMED"]).default("DRAFT"),
});

async function generateChallanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.challan.count({
    where: { challanNumber: { startsWith: `CH-${year}-` } },
  });
  const next = String(count + 1).padStart(4, "0");
  return `CH-${year}-${next}`;
}

// GET /challans?status=&customerId=&page=&limit=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as ChallanStatus | undefined;
    const customerId = req.query.customerId as string | undefined;

    const where: any = { ...(status ? { status } : {}), ...(customerId ? { customerId } : {}) };

    const [total, challans] = await Promise.all([
      prisma.challan.count({ where }),
      prisma.challan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { customer: { select: { name: true, mobile: true } }, items: true },
      }),
    ]);

    res.json({ success: true, data: challans, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  })
);

// GET /challans/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const challan = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: { include: { product: { select: { name: true, sku: true } } } }, createdBy: { select: { name: true } } },
    });
    if (!challan) throw new ApiError(404, "Challan not found");
    res.json({ success: true, data: challan });
  })
);

// POST /challans - create as Draft or Confirmed
// If Confirmed: stock is validated & deducted atomically; product snapshot is stored.
router.post(
  "/",
  authorize("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const data = createChallanSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const products = await prisma.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) } } });
    if (products.length !== data.items.length) {
      throw new ApiError(400, "One or more products were not found");
    }

    const totalQuantity = data.items.reduce((sum, i) => sum + i.quantity, 0);
    const challanNumber = await generateChallanNumber();

    const challan = await prisma.$transaction(async (tx) => {
      // If confirming immediately, validate & deduct stock for every line item first.
      if (data.status === "CONFIRMED") {
        for (const item of data.items) {
          const product = products.find((p) => p.id === item.productId)!;
          if (product.stock < item.quantity) {
            throw new ApiError(
              400,
              `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${product.stock}, requested: ${item.quantity}.`
            );
          }
        }
      }

      const created = await tx.challan.create({
        data: {
          challanNumber,
          customerId: data.customerId,
          totalQuantity,
          status: data.status,
          createdById: req.user!.userId,
          items: {
            create: data.items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: product.id,
                productNameSnapshot: product.name,
                productSkuSnapshot: product.sku,
                unitPriceSnapshot: product.unitPrice,
                quantity: item.quantity,
              };
            }),
          },
        },
        include: { items: true, customer: true },
      });

      if (data.status === "CONFIRMED") {
        for (const item of data.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: MovementType.OUT,
              reason: `Sales challan ${challanNumber} confirmed`,
              createdById: req.user!.userId,
            },
          });
        }
      }

      return created;
    });

    res.status(201).json({ success: true, data: challan });
  })
);

// PUT /challans/:id/confirm - confirm a Draft challan (deducts stock now)
router.put(
  "/:id/confirm",
  authorize("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const challan = await prisma.$transaction(async (tx) => {
      const existing = await tx.challan.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!existing) throw new ApiError(404, "Challan not found");
      if (existing.status !== "DRAFT") {
        throw new ApiError(400, `Only Draft challans can be confirmed. Current status: ${existing.status}`);
      }

      for (const item of existing.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new ApiError(404, `Product ${item.productSkuSnapshot} no longer exists`);
        if (product.stock < item.quantity) {
          throw new ApiError(
            400,
            `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${product.stock}, requested: ${item.quantity}.`
          );
        }
      }

      for (const item of existing.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: MovementType.OUT,
            reason: `Sales challan ${existing.challanNumber} confirmed`,
            createdById: req.user!.userId,
          },
        });
      }

      return tx.challan.update({ where: { id: req.params.id }, data: { status: "CONFIRMED" }, include: { items: true, customer: true } });
    });

    res.json({ success: true, data: challan });
  })
);

// PUT /challans/:id/cancel - cancel a Draft challan (no stock impact) or a Confirmed one (restocks items)
router.put(
  "/:id/cancel",
  authorize("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const challan = await prisma.$transaction(async (tx) => {
      const existing = await tx.challan.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!existing) throw new ApiError(404, "Challan not found");
      if (existing.status === "CANCELLED") {
        throw new ApiError(400, "Challan is already cancelled");
      }

      // Restock if it had been confirmed (stock was previously deducted).
      if (existing.status === "CONFIRMED") {
        for (const item of existing.items) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: MovementType.IN,
              reason: `Sales challan ${existing.challanNumber} cancelled - stock reversed`,
              createdById: req.user!.userId,
            },
          });
        }
      }

      return tx.challan.update({ where: { id: req.params.id }, data: { status: "CANCELLED" }, include: { items: true, customer: true } });
    });

    res.json({ success: true, data: challan });
  })
);

export default router;
