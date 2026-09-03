import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { authenticate, authorize } from "../middleware/auth";
import { CustomerStatus, CustomerType } from "@prisma/client";

const router = Router();
router.use(authenticate);

const customerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  mobile: z.string().min(7, "Valid mobile number is required"),
  email: z.string().email().optional().or(z.literal("")).transform((v) => v || undefined),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.nativeEnum(CustomerType).default(CustomerType.RETAIL),
  address: z.string().optional(),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
  followUpDate: z.string().datetime().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  notes: z.string().optional(),
});

// GET /customers?search=&status=&page=&limit=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = (req.query.search as string) || "";
    const status = req.query.status as CustomerStatus | undefined;

    const where: any = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { mobile: { contains: search, mode: "insensitive" } },
              { businessName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

// GET /customers/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        followUps: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
        challans: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!customer) throw new ApiError(404, "Customer not found");
    res.json({ success: true, data: customer });
  })
);

// POST /customers
router.post(
  "/",
  authorize("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const data = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: { ...data, followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined, createdById: req.user!.userId },
    });
    res.status(201).json({ success: true, data: customer });
  })
);

// PUT /customers/:id
router.put(
  "/:id",
  authorize("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const data = customerSchema.partial().parse(req.body);
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Customer not found");

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { ...data, followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined },
    });
    res.json({ success: true, data: customer });
  })
);

const followUpSchema = z.object({ note: z.string().min(1, "Note cannot be empty") });

// POST /customers/:id/follow-up
router.post(
  "/:id/follow-up",
  authorize("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const { note } = followUpSchema.parse(req.body);
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Customer not found");

    const followUp = await prisma.followUp.create({
      data: { customerId: req.params.id, note, createdById: req.user!.userId },
    });
    res.status(201).json({ success: true, data: followUp });
  })
);

export default router;
