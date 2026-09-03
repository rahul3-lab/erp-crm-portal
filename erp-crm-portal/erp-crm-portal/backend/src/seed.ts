import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";
import { Role, CustomerType, CustomerStatus, MovementType } from "@prisma/client";

async function main() {
  console.log("Seeding database...");

  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const users = await Promise.all(
    [
      { name: "Admin User", email: "admin@erp.test", role: Role.ADMIN },
      { name: "Sales User", email: "sales@erp.test", role: Role.SALES },
      { name: "Warehouse User", email: "warehouse@erp.test", role: Role.WAREHOUSE },
      { name: "Accounts User", email: "accounts@erp.test", role: Role.ACCOUNTS },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash },
      })
    )
  );

  const [admin, sales, warehouse] = users;

  const customer = await prisma.customer.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ramesh Traders",
      mobile: "9876543210",
      email: "ramesh@traders.test",
      businessName: "Ramesh Traders Pvt Ltd",
      gstNumber: "21ABCDE1234F1Z5",
      customerType: CustomerType.WHOLESALE,
      address: "Bhubaneswar, Odisha",
      status: CustomerStatus.ACTIVE,
      notes: "Key wholesale account.",
      createdById: sales.id,
    },
  });

  const product1 = await prisma.product.upsert({
    where: { sku: "SKU-001" },
    update: {},
    create: {
      name: "Steel Pipe 1-inch",
      sku: "SKU-001",
      category: "Hardware",
      unitPrice: 250.0,
      stock: 500,
      minStock: 50,
      location: "Warehouse A - Rack 3",
      createdById: warehouse.id,
    },
  });

  const product2 = await prisma.product.upsert({
    where: { sku: "SKU-002" },
    update: {},
    create: {
      name: "PVC Elbow Joint",
      sku: "SKU-002",
      category: "Hardware",
      unitPrice: 40.0,
      stock: 20,
      minStock: 25,
      location: "Warehouse A - Rack 7",
      createdById: warehouse.id,
    },
  });

  await prisma.stockMovement.createMany({
    data: [
      { productId: product1.id, quantity: 500, movementType: MovementType.IN, reason: "Initial stock (seed)", createdById: warehouse.id },
      { productId: product2.id, quantity: 20, movementType: MovementType.IN, reason: "Initial stock (seed)", createdById: warehouse.id },
    ],
  });

  console.log("Seed complete.");
  console.log("Test login credentials (all use password: Password123!)");
  users.forEach((u) => console.log(`  ${u.role.padEnd(10)} -> ${u.email}`));
  console.log(`Sample customer: ${customer.name}`);
  console.log(`Sample products: ${product1.sku} (stock 500), ${product2.sku} (stock 20, below min stock 25)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
