import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs"; // Import bcrypt for password hashing

const prisma = new PrismaClient();

async function upsertUsers(usersData) {
  for (const userData of usersData) {
    try {
      // Hash the password before storing it
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Upsert the common User record
      await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          username: userData.username,
          password: hashedPassword,
          role: userData.role,
        },
        create: {
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
        },
      });

      // Use switch case to handle different roles
      if (userData.role !== "user") {
        switch (userData.role) {
          case "seller":
            await prisma.seller.upsert({
              where: { email: userData.email }, // Assuming unique email
              update: {
                shopName: userData.shopName,
                address: userData.address,
                user: {
                  connect: { email: userData.email },
                },
              },
              create: {
                email: userData.email,
                shopName: userData.shopName,
                address: userData.address,
                user: {
                  connect: { email: userData.email },
                },
              },
            });
            break;

          case "buyer":
            await prisma.buyer.upsert({
              where: { email: userData.email },
              update: {
                address: userData.address,
                user: {
                  connect: { email: userData.email },
                },
              },
              create: {
                email: userData.email,

                address: userData.address,
                user: {
                  connect: { email: userData.email },
                },
              },
            });
            break;

          case "deliverer":
            await prisma.deliverer.upsert({
              where: { email: userData.email },
              update: {
                vehicle: userData.vehicle,
                user: {
                  connect: { email: userData.email },
                },
              },
              create: {
                email: userData.email,
                vehicle: userData.vehicle,
                user: {
                  connect: { email: userData.email },
                },
              },
            });
            break;

          case "admin":
            await prisma.admin.upsert({
              where: { email: userData.email },
              update: {
                user: {
                  connect: { email: userData.email },
                },
              },
              create: {
                email: userData.email,

                user: {
                  connect: { email: userData.email },
                },
              },
            });
            break;

          default:
            console.error(
              `Unknown role ${userData.role} for email ${userData.email}`
            );
            break;
        }
      }
    } catch (error) {
      console.error(
        `Error upserting ${userData.role} ${userData.email}:`,
        error
      );
    }
  }
}

const usersData = [
  {
    username: "seller1",
    email: "seller1@example.com",
    password: "password1",
    shopName: "seller1shop",
    address: "seller1address",
    role: "seller",
  },
  {
    username: "buyer1",
    email: "buyer1@example.com",
    password: "password2",
    address: "buyer1address",
    role: "buyer",
  },
  {
    username: "deliverer1",
    email: "deliverer1@example.com",
    password: "password3",
    vehicle: "vehicle1",
    role: "deliverer",
  },
  {
    username: "admin1",
    email: "admin1@example.com",
    password: "password4",
    role: "admin",
  },
  //Add more users as needed
];

async function addUsers(params = usersData) {//uses usersData by default if params not given
  await upsertUsers(params);
  console.log("Users upserted successfully.");
}

addUsers()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
