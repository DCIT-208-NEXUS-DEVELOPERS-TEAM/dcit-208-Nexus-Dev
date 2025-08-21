import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Regions
  const regionNames = [
    "Greater Accra",
    "Ashanti",
    "Central",
    "Western",
    "Western North",
    "Eastern",
    "Volta",
    "Oti",
    "Northern",
    "Savannah",
    "North East",
    "Upper East",
    "Upper West",
    "Bono",
    "Bono East",
    "Ahafo",
  ];

  const regions = await Promise.all(
    regionNames.map((name) =>
      prisma.region.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  // Users
  const saltRounds = 12;
  const adminPass = await bcrypt.hash("Admin@123", saltRounds);
  const natPass = await bcrypt.hash("National@123", saltRounds);
  const regPass = await bcrypt.hash("Regional@123", saltRounds);
  const repPass = await bcrypt.hash("Rep@123", saltRounds);

  const admin = await prisma.user.upsert({
    where: { email: "admin@abcecg.org" },
    update: {},
    create: {
      email: "admin@abcecg.org",
      username: "admin",
      passwordHash: adminPass,
      role: Role.ADMIN,
      firstName: "System",
      lastName: "Admin",
    },
  });

  const national = await prisma.user.upsert({
    where: { email: "national@abcecg.org" },
    update: {},
    create: {
      email: "national@abcecg.org",
      username: "national_secretary",
      passwordHash: natPass,
      role: Role.NATIONAL_SECRETARIAT,
      firstName: "National",
      lastName: "Secretariat",
    },
  });

  const ga = regions.find((r) => r.name === "Greater Accra")!;
  const regional = await prisma.user.upsert({
    where: { email: "regional.ga@abcecg.org" },
    update: {},
    create: {
      email: "regional.ga@abcecg.org",
      username: "regional_accra",
      passwordHash: regPass,
      role: Role.REGIONAL_SECRETARIAT,
      regionId: ga.id,
      firstName: "Regional",
      lastName: "Secretary",
    },
  });

  const companyRep = await prisma.user.upsert({
    where: { email: "rep@mapp-h.com" },
    update: {},
    create: {
      email: "rep@mapp-h.com",
      username: "company_rep",
      passwordHash: repPass,
      role: Role.COMPANY_REP,
      firstName: "MAPP-H",
      lastName: "Rep",
      phone: "0302343302",
    },
  });

  // Demo company - create or find existing
  let company = await prisma.company.findFirst({
    where: { name: "MAPP-H Limited" },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "MAPP-H Limited",
        email: "mapphltd1@gmail.com",
        phone: "0302343302",
        website: "https://example.com",
        address: "Gbawe, Accra",
        region: "Greater Accra",
        gradeDK: "D1K1",
        roadClass: "A3 B3",
        natureOfBusiness: ["General Building", "Civil Engineering", "Roads"],
        description: "ABCECG member company.",
        ownerUserId: companyRep.id,
      },
    });
  }

  // Draft application for demo flow
  await prisma.membershipApplication.create({
    data: {
      companyId: company.id,
      submittedById: companyRep.id,
      regionId: ga.id,
      form: {
        company: {
          name: company.name,
          address: company.address,
        },
        classification: {
          gradeDK: company.gradeDK,
          roadClass: company.roadClass,
        },
        proposer: { name: "Acme Co.", company: "Acme" },
        seconder: { name: "Beta Co.", company: "Beta" },
        region: "Greater Accra",
      },
    },
  });

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
