import { PrismaClient, type Plan } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Scankro demo…");

  const email = "demo@scankro.com";
  const password = "demo12345";

  await prisma.analyticsEvent.deleteMany();
  await prisma.analyticsDaily.deleteMany();
  await prisma.menuItemTranslation.deleteMany();
  await prisma.categoryTranslation.deleteMany();
  await prisma.seasonalMenuItem.deleteMany();
  await prisma.seasonalMenuCategory.deleteMany();
  await prisma.seasonalMenu.deleteMany();
  await prisma.dailySpecial.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.tableQr.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.member.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany({ where: { email } });

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: "Cafe Royal",
      email,
      emailVerified: true,
      accounts: {
        create: {
          accountId: email,
          providerId: "credential",
          password: hashed,
        },
      },
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: "Cafe Royal",
      plan: "pro" as Plan,
      subscriptionStatus: "active",
      members: {
        create: { userId: user.id, role: "owner" },
      },
      branches: {
        create: {
          name: "Cafe Royal",
          slug: "cafe-royal",
          address: "MG Road, Bengaluru",
          phone: "+91 98765 43210",
          timezone: "Asia/Kolkata",
          locales: ["en", "hi"],
          theme: {
            primaryColor: "#0F766E",
            accentColor: "#F59E0B",
            font: "geist",
          },
          hours: {
            mon: { open: "10:00", close: "22:00" },
            tue: { open: "10:00", close: "22:00" },
            wed: { open: "10:00", close: "22:00" },
            thu: { open: "10:00", close: "22:00" },
            fri: { open: "10:00", close: "23:00" },
            sat: { open: "10:00", close: "23:00" },
            sun: { open: "10:00", close: "22:00" },
          },
          socials: { instagram: "https://instagram.com" },
        },
      },
    },
    include: { branches: true },
  });

  const branch = org.branches[0];

  const starters = await prisma.category.create({
    data: { name: "Starters", sortOrder: 0, branchId: branch.id },
  });
  const mains = await prisma.category.create({
    data: { name: "Main Course", sortOrder: 1, branchId: branch.id },
  });
  const drinks = await prisma.category.create({
    data: { name: "Drinks", sortOrder: 2, branchId: branch.id },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        name: "Paneer Tikka",
        description: "Charcoal-grilled cottage cheese with spices",
        price: 29900,
        isVeg: true,
        isPopular: true,
        spicyLevel: 2,
        prepMinutes: 20,
        categoryId: starters.id,
        branchId: branch.id,
        sortOrder: 0,
      },
      {
        name: "Chicken Seekh",
        description: "Minced chicken skewers",
        price: 34900,
        isVeg: false,
        spicyLevel: 2,
        prepMinutes: 25,
        categoryId: starters.id,
        branchId: branch.id,
        sortOrder: 1,
      },
      {
        name: "Chicken Biryani",
        description: "Fragrant basmati with slow-cooked chicken",
        price: 19900,
        isVeg: false,
        isPopular: true,
        spicyLevel: 2,
        prepMinutes: 35,
        categoryId: mains.id,
        branchId: branch.id,
        sortOrder: 0,
      },
      {
        name: "Dal Makhani",
        description: "Creamy black lentils",
        price: 24900,
        isVeg: true,
        spicyLevel: 1,
        categoryId: mains.id,
        branchId: branch.id,
        sortOrder: 1,
      },
      {
        name: "Masala Chai",
        description: "Spiced Indian tea",
        price: 4900,
        isVeg: true,
        categoryId: drinks.id,
        branchId: branch.id,
        sortOrder: 0,
      },
      {
        name: "Fresh Lime Soda",
        price: 7900,
        isVeg: true,
        isAvailable: false,
        categoryId: drinks.id,
        branchId: branch.id,
        sortOrder: 1,
      },
    ],
  });

  const paneer = await prisma.menuItem.findFirst({
    where: { branchId: branch.id, name: "Paneer Tikka" },
  });

  if (paneer) {
    await prisma.menuItemTranslation.create({
      data: {
        menuItemId: paneer.id,
        branchId: branch.id,
        locale: "hi",
        name: "पनीर टिक्का",
        description: "मसालेदार पनीर टिक्का",
      },
    });
  }

  await prisma.categoryTranslation.create({
    data: {
      categoryId: starters.id,
      branchId: branch.id,
      locale: "hi",
      name: "स्टार्टर्स",
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const biryani = await prisma.menuItem.findFirst({
    where: { branchId: branch.id, name: "Chicken Biryani" },
  });
  if (biryani) {
    await prisma.dailySpecial.create({
      data: {
        branchId: branch.id,
        title: "Today's Special",
        menuItemId: biryani.id,
        customPrice: 19900,
        activeDate: today,
      },
    });
  }

  await prisma.promotion.create({
    data: {
      branchId: branch.id,
      type: "happy_hour",
      title: "Happy Hour",
      description: "Buy 1 Get 1 on select drinks",
      startTime: "16:00",
      endTime: "19:00",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  await prisma.tableQr.createMany({
    data: [
      { branchId: branch.id, tableNumber: 1, label: "Table 1" },
      { branchId: branch.id, tableNumber: 2, label: "Table 2" },
      { branchId: branch.id, tableNumber: 15, label: "Table 15" },
    ],
  });

  console.log("Demo ready:");
  console.log("  Email:    ", email);
  console.log("  Password: ", password);
  console.log("  Menu:     /cafe-royal");
  console.log("  Plan:     pro");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
