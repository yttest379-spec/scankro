import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { slugify, isReservedSlug } from "./utils";
import { nanoid } from "nanoid";

async function ensureUniqueSlug(base: string) {
  let slug = slugify(base) || `restaurant-${nanoid(6).toLowerCase()}`;
  if (isReservedSlug(slug)) {
    slug = `${slug}-${nanoid(4).toLowerCase()}`;
  }
  let candidate = slug;
  let i = 0;
  while (await prisma.branch.findUnique({ where: { slug: candidate } })) {
    i += 1;
    candidate = `${slug}-${i}`;
  }
  return candidate;
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {},
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const orgName = user.name ? `${user.name}'s Restaurant` : "My Restaurant";
          const slug = await ensureUniqueSlug(user.name || "my-restaurant");
          await prisma.organization.create({
            data: {
              name: orgName,
              plan: "free",
              members: {
                create: {
                  userId: user.id,
                  role: "owner",
                },
              },
              branches: {
                create: {
                  name: orgName,
                  slug,
                  theme: {
                    primaryColor: "#0F766E",
                    accentColor: "#F59E0B",
                    font: "geist",
                  },
                  hours: {
                    mon: { open: "10:00", close: "22:00", closed: false },
                    tue: { open: "10:00", close: "22:00", closed: false },
                    wed: { open: "10:00", close: "22:00", closed: false },
                    thu: { open: "10:00", close: "22:00", closed: false },
                    fri: { open: "10:00", close: "23:00", closed: false },
                    sat: { open: "10:00", close: "23:00", closed: false },
                    sun: { open: "10:00", close: "22:00", closed: false },
                  },
                  socials: {},
                  locales: ["en"],
                },
              },
            },
          });
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
