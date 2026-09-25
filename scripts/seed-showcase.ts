/**
 * Jeu de démonstration pour filmer le site : le vrai parc, de faux clients.
 *
 *   npm run db:seed-showcase
 *
 * Reprend les six véhicules réellement publiés sur anachcar.com — mêmes
 * photos, mêmes prix, mêmes descriptions — mais avec des plaques inventées,
 * et entoure le tout de clients et de réservations fictifs.
 *
 * Objectif : une vidéo de portfolio qui montre le site tel qu'il est, sans
 * exposer un seul client réel ni les immatriculations du parc.
 *
 * Refuse de s'exécuter ailleurs qu'en local : il efface tout avant d'écrire.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function assertLocal(url: string | undefined): void {
  const host = url ? new URL(url).hostname : "";
  if (!["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host)) {
    throw new Error(
      "Ce script EFFACE toute la base : il ne s'exécute qu'en local.\n" +
        `DATABASE_URL pointe sur « ${host} ».`,
    );
  }
}

/** Le parc publié, avec des immatriculations inventées. */
const FLEET = [
  {
    slug: "dacia-logan-2026",
    brand: "Dacia",
    model: "Logan",
    plate: "10234-A-6",
    category: "ECONOMIQUE" as const,
    dailyRate: 30000,
    seats: 5,
    doors: 4,
    descriptionFr:
      "Économique, confortable et fiable, la Dacia Logan Diesel est idéale pour vos " +
      "déplacements en ville comme pour les longs trajets. Faible consommation, " +
      "intérieur spacieux et grand coffre.",
    images: [
      "3c8136e0-d497-4055-993e-37a1b05f91f8.jpeg",
      "3515bba8-86ae-49c8-b3b7-6f53968c4839.jpeg",
    ],
  },
  {
    slug: "dacia-sandero-2026",
    brand: "Dacia",
    model: "Sandero",
    plate: "20451-B-6",
    category: "ECONOMIQUE" as const,
    dailyRate: 25000,
    seats: 5,
    doors: 5,
    descriptionFr:
      "Compacte et maniable, la Dacia Sandero se faufile en ville et reste " +
      "économique sur la route. Le choix malin pour un séjour à Agadir.",
    images: [
      "db374fb7-5d1e-43a4-aee3-4affaeeb8061.jpeg",
      "e1dbc2f9-a832-4360-875d-53666c23ad26.jpeg",
    ],
  },
  {
    slug: "dacia-sandero-stepway-2026",
    brand: "Dacia",
    model: "Sandero Stepway",
    plate: "30678-C-6",
    category: "COMPACTE" as const,
    dailyRate: 30000,
    seats: 5,
    doors: 5,
    descriptionFr:
      "La Sandero Stepway ajoute une garde au sol surélevée et un style baroudeur. " +
      "Parfaite pour les routes de campagne et les escapades vers Paradise Valley.",
    images: ["ca7dc67b-5404-4f4b-82d0-30efc2f204ea.jpeg"],
  },
  {
    slug: "dacia-duster-2026",
    brand: "Dacia",
    model: "Duster",
    plate: "40892-D-6",
    category: "SUV" as const,
    dailyRate: 35000,
    seats: 5,
    doors: 5,
    descriptionFr:
      "SUV robuste et spacieux, le Duster affronte aussi bien les pistes que " +
      "l'autoroute. Idéal pour les familles et les excursions dans l'Atlas.",
    images: ["fb686c37-9522-4a30-b640-14dc47d13409.jpeg"],
  },
  {
    slug: "hyundai-accent-2026",
    brand: "Hyundai",
    model: "Accent",
    plate: "50127-E-6",
    category: "COMPACTE" as const,
    dailyRate: 35000,
    seats: 5,
    doors: 4,
    descriptionFr:
      "Berline confortable et bien équipée, la Hyundai Accent offre une conduite " +
      "souple et une climatisation efficace pour les trajets sous le soleil.",
    images: [
      "5319e5f3-385a-4ee3-adb7-263acfd65c98.jpeg",
      "e29bdc65-59d5-484a-8677-bcbcdcd1e57f.jpeg",
    ],
  },
  {
    slug: "renault-clio-5-2026",
    brand: "Renault",
    model: "Clio 5",
    plate: "60345-F-6",
    category: "COMPACTE" as const,
    dailyRate: 30000,
    seats: 5,
    doors: 5,
    descriptionFr:
      "Moderne et agréable à conduire, la Clio 5 allie confort, équipement et " +
      "faible consommation. Un excellent compromis pour tous les usages.",
    images: [
      "0401d675-cb3f-4aa4-a0fb-2805891666a3.jpeg",
      "84100756-b98f-45a4-979f-aab06f8f1cc1.jpeg",
    ],
  },
];

/** Clients inventés — aucun ne correspond à une personne réelle. */
const CUSTOMERS = [
  { firstName: "Sofia", lastName: "Benali", phone: "+212 661 234 567", email: "sofia.benali@example.ma", country: "Maroc", city: "Casablanca" },
  { firstName: "Julien", lastName: "Moreau", phone: "+33 6 12 34 56 78", email: "julien.moreau@example.fr", country: "France", city: "Lyon" },
  { firstName: "Karim", lastName: "Tazi", phone: "+212 662 345 678", email: "karim.tazi@example.ma", country: "Maroc", city: "Agadir" },
  { firstName: "Anna", lastName: "Schmidt", phone: "+49 151 2345678", email: "anna.schmidt@example.de", country: "Allemagne", city: "Munich" },
  { firstName: "Nadia", lastName: "El Fassi", phone: "+212 663 456 789", email: "nadia.elfassi@example.ma", country: "Maroc", city: "Marrakech" },
  { firstName: "Thomas", lastName: "Dubois", phone: "+33 6 98 76 54 32", email: "thomas.dubois@example.fr", country: "France", city: "Nantes" },
];

const LOCATIONS = [
  { name: "Agence Dcheira (Inezgane)", nameEn: "Dcheira Branch", nameAr: "وكالة الدشيرة", extraFee: 0, position: 0 },
  { name: "Aéroport Agadir Al Massira", nameEn: "Agadir Al Massira Airport", nameAr: "مطار أكادير المسيرة", extraFee: 15000, position: 1 },
  { name: "Gare routière Inezgane", nameEn: "Inezgane Bus Station", nameAr: "محطة إنزكان", extraFee: 5000, position: 2 },
  { name: "Livraison hôtel (Agadir centre)", nameEn: "Hotel delivery (Agadir)", nameAr: "توصيل للفندق", extraFee: 10000, position: 3 },
];

const day = (offset: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

async function main() {
  assertLocal(process.env.DATABASE_URL);

  console.info("Nettoyage…");
  // L'ordre suit les clés étrangères : les enfants avant les parents.
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.document.deleteMany();
  await db.payment.deleteMany();
  await db.rental.deleteMany();
  await db.reservation.deleteMany();
  await db.maintenanceRecord.deleteMany();
  await db.maintenance.deleteMany();
  await db.pricingRule.deleteMany();
  await db.vehicleImage.deleteMany();
  await db.vehicle.deleteMany();
  await db.customer.deleteMany();
  await db.location.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
  await db.counter.deleteMany();

  console.info("Comptes…");
  const admin = await db.user.create({
    data: {
      email: "admin@anachcar.ma",
      name: "Taoufik Aanach",
      passwordHash: await bcrypt.hash("Admin@2026", 12),
      role: "ADMIN",
      phone: "+212 6 61 80 58 08",
    },
  });
  await db.user.create({
    data: {
      email: "agence@anachcar.ma",
      name: "Fatima Zahra",
      passwordHash: await bcrypt.hash("Employe@2026", 12),
      role: "EMPLOYEE",
    },
  });

  console.info("Lieux…");
  const locations = [];
  for (const l of LOCATIONS) locations.push(await db.location.create({ data: l }));

  console.info("Véhicules…");
  const vehicles = [];
  for (const [index, v] of FLEET.entries()) {
    const vehicle = await db.vehicle.create({
      data: {
        internalCode: `AC-${String(index + 1).padStart(3, "0")}`,
        slug: v.slug,
        brand: v.brand,
        model: v.model,
        year: 2026,
        plate: v.plate,
        color: "Blanc",
        category: v.category,
        transmission: "MANUAL",
        fuel: "DIESEL",
        seats: v.seats,
        doors: v.doors,
        hasAirConditioning: true,
        mileage: 15000 + index * 4200,
        dailyRate: v.dailyRate,
        weeklyRate: Math.round(v.dailyRate * 6.2),
        monthlyRate: Math.round(v.dailyRate * 24),
        minRentalDays: 1,
        status: "AVAILABLE",
        isFeatured: index < 3,
        descriptionFr: v.descriptionFr,
        features: ["Climatisation", "Bluetooth", "Kilométrage illimité", "Assurance tous risques"],
        insuranceProvider: "Wafa Assurance",
        insuranceExpiry: day(240),
        technicalInspectionExpiry: day(180),
        nextOilChangeMileage: 20000 + index * 4200,
      },
    });
    for (const [position, file] of v.images.entries()) {
      await db.vehicleImage.create({
        data: {
          vehicleId: vehicle.id,
          url: `/api/media/vehicles/${file}`,
          position,
          isPrimary: position === 0,
        },
      });
    }
    vehicles.push(vehicle);
  }

  console.info("Clients…");
  const customers = [];
  for (const c of CUSTOMERS) customers.push(await db.customer.create({ data: c }));

  console.info("Réservations…");
  /*
   * Un échantillon de chaque statut : le tableau de bord, le calendrier et
   * les listes doivent être remplis à l'écran, pas vides.
   */
  const plan = [
    { v: 0, c: 0, from: -3, to: 2, status: "ACTIVE" as const, paid: "PAID" as const },
    { v: 1, c: 1, from: 1, to: 5, status: "CONFIRMED" as const, paid: "DEPOSIT_PAID" as const },
    { v: 2, c: 2, from: 0, to: 4, status: "ACTIVE" as const, paid: "PAID" as const },
    { v: 3, c: 3, from: 3, to: 10, status: "CONFIRMED" as const, paid: "UNPAID" as const },
    { v: 4, c: 4, from: 2, to: 6, status: "PENDING" as const, paid: "UNPAID" as const },
    { v: 5, c: 5, from: 6, to: 9, status: "PENDING" as const, paid: "UNPAID" as const },
    { v: 0, c: 2, from: -20, to: -15, status: "COMPLETED" as const, paid: "PAID" as const },
    { v: 1, c: 3, from: -14, to: -9, status: "COMPLETED" as const, paid: "PAID" as const },
    { v: 3, c: 0, from: -9, to: -5, status: "COMPLETED" as const, paid: "PAID" as const },
    { v: 5, c: 1, from: -6, to: -2, status: "COMPLETED" as const, paid: "PAID" as const },
  ];

  const year = new Date().getFullYear();
  let sequence = 0;
  for (const p of plan) {
    const vehicle = vehicles[p.v];
    const start = day(p.from);
    const end = day(p.to);
    const days = Math.max(1, Math.round((+end - +start) / 86400000));
    const subtotal = days * vehicle.dailyRate;
    const pickup = locations[p.v % locations.length];
    const extraFees = pickup.extraFee;
    sequence += 1;

    const reservation = await db.reservation.create({
      data: {
        reference: `AC-${year}-${String(sequence).padStart(5, "0")}`,
        vehicleId: vehicle.id,
        customerId: customers[p.c].id,
        pickupLocationId: pickup.id,
        dropoffLocationId: locations[0].id,
        startAt: start,
        endAt: end,
        days,
        dailyRate: vehicle.dailyRate,
        subtotal,
        extraFees,
        discount: 0,
        totalAmount: subtotal + extraFees,
        status: p.status,
        paymentStatus: p.paid,
        source: sequence % 3 === 0 ? "WALK_IN" : "WEBSITE",
        confirmedAt: p.status === "PENDING" ? null : day(p.from - 1),
        confirmedById: p.status === "PENDING" ? null : admin.id,
      },
    });

    if (p.paid !== "UNPAID") {
      await db.payment.create({
        data: {
          reservationId: reservation.id,
          customerId: customers[p.c].id,
          amount: p.paid === "PAID" ? subtotal + extraFees : Math.round(subtotal * 0.3),
          type: p.paid === "PAID" ? "BALANCE" : "DEPOSIT",
          method: sequence % 2 === 0 ? "CASH" : "BANK_TRANSFER",
          paidAt: day(p.from),
          recordedById: admin.id,
        },
      });
    }

    if (p.status === "PENDING") {
      await db.notification.create({
        data: {
          type: "NEW_RESERVATION",
          severity: "INFO",
          title: `Nouvelle demande ${reservation.reference} — ${vehicle.brand} ${vehicle.model}`,
          message: `${customers[p.c].firstName} ${customers[p.c].lastName} · ${days} jour(s)`,
          link: `/admin/reservations/${reservation.id}`,
          entityType: "Reservation",
          entityId: reservation.id,
          isRead: false,
        },
      });
    }
  }

  console.info("Entretiens et tarifs…");
  await db.maintenance.create({
    data: {
      vehicleId: vehicles[2].id,
      type: "OIL_CHANGE",
      status: "PLANNED",
      startAt: day(8),
      endAt: day(8, 18),
      // L'entretien immobilise la voiture : elle disparaît des disponibilités.
      blocksAvailability: true,
      description: "Vidange et filtre à huile",
      estimatedCost: 45000,
    },
  });
  await db.pricingRule.createMany({
    data: [
      { name: "Haute saison (été)", type: "SEASON", startDate: day(60), endDate: day(120), multiplier: 1.15, priority: 10, isActive: true },
      { name: "Longue durée (15 jours et plus)", type: "LONG_DURATION", minDays: 15, discountPercent: 10, priority: 5, isActive: true },
    ],
  });

  await db.setting.upsert({
    where: { key: "app" },
    create: { key: "app", value: { reservation: { minAdvanceHours: 2 } } },
    update: { value: { reservation: { minAdvanceHours: 2 } } },
  });

  await db.counter.createMany({
    data: [
      { key: `reservation:${year}`, value: sequence },
      { key: "vehicle", value: vehicles.length },
    ],
  });

  console.info(`
Parc de démonstration installé.

  Véhicules    : ${vehicles.length}  (le parc publié, plaques fictives)
  Clients      : ${customers.length}  (inventés)
  Réservations : ${sequence}

  Espace agence -> /admin/login
    Administrateur : admin@anachcar.ma   / Admin@2026
    Employé        : agence@anachcar.ma  / Employe@2026

  Aucune donnée client réelle : le site peut être filmé tel quel.
`);
}

main()
  .catch((error) => {
    console.error(`\nErreur : ${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
