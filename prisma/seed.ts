/**
 * Données de démonstration Anach Car.
 *
 * Objectif : permettre de tester immédiatement l'ensemble du système
 * (recherche, disponibilité, réservations, locations, maintenance, alertes)
 * avec un jeu de données réaliste pour une agence d'Agadir.
 *
 * TOUTES les données créées ici sont fictives et marquées comme telles
 * (voir DEMO_TAG). Lancer : npm run db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const DEMO_TAG = "[DÉMO] Donnée de démonstration — à supprimer avant mise en production.";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DAY = 24 * 60 * 60 * 1000;
const at = (dayOffset: number, hour = 10) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Date(date.getTime() + dayOffset * DAY);
};
const dateOnly = (dayOffset: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return new Date(date.getTime() + dayOffset * DAY);
};
/** 250 DH -> 25000 centimes */
const dh = (amount: number) => amount * 100;

/**
 * Le seed crée des comptes dont le mot de passe est écrit dans ce fichier et
 * dans le README. Le lancer sur la base de l'agence effacerait ses données et
 * rouvrirait un accès administrateur public : on refuse dès que la base n'est
 * manifestement pas locale, sans se fier au seul NODE_ENV, qui n'est pas
 * toujours positionné selon la façon dont la commande est lancée.
 */
function looksRemote(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return !["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(
      host,
    );
  } catch {
    return false;
  }
}

async function main() {
  const forced = process.env.SEED_FORCE === "1";
  if (!forced && process.env.NODE_ENV === "production") {
    throw new Error(
      "Seed bloqué en production. Relancez avec SEED_FORCE=1 si c'est volontaire.",
    );
  }
  if (!forced && looksRemote(process.env.DATABASE_URL)) {
    throw new Error(
      "Seed bloqué : DATABASE_URL ne pointe pas sur une base locale.\n" +
        "Ce script EFFACE toutes les données et recrée des comptes de\n" +
        "démonstration au mot de passe public. Si c'est vraiment voulu,\n" +
        "relancez avec SEED_FORCE=1.",
    );
  }

  console.info("Nettoyage des données existantes…");
  // Ordre imposé par les clés étrangères.
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

  // ------------------------------------------------------------------ Users
  console.info("Création des comptes agence…");
  const passwordHash = await bcrypt.hash("Admin@2026", 12);
  const admin = await db.user.create({
    data: {
      email: "admin@anachcar.ma",
      name: "Administrateur Anach Car",
      passwordHash,
      role: "ADMIN",
      phone: "+212 6 61 80 58 08",
    },
  });
  await db.user.create({
    data: {
      email: "agence@anachcar.ma",
      name: "Employé agence",
      passwordHash: await bcrypt.hash("Employe@2026", 12),
      role: "EMPLOYEE",
    },
  });

  // -------------------------------------------------------------- Locations
  console.info("Création des lieux de prise en charge…");
  // Seule l'agence sert de lieu par défaut pour les réservations de démo ;
  // les autres lieux existent pour être proposés dans le moteur de recherche.
  const [agence] = await Promise.all([
    db.location.create({
      data: {
        name: "Agence Dcheira (Inezgane)",
        nameEn: "Dcheira agency (Inezgane)",
        nameAr: "الوكالة بالدشيرة (إنزكان)",
        address: "N° 9 Rue N° 2302 Derbe ANACH, Dcheira - Inezgane",
        position: 0,
      },
    }),
    db.location.create({
      data: {
        name: "Aéroport Agadir Al Massira",
        nameEn: "Agadir Al Massira Airport",
        nameAr: "مطار أكادير المسيرة",
        address: "Aéroport Al Massira, Agadir",
        extraFee: dh(150),
        position: 1,
      },
    }),
    db.location.create({
      data: {
        name: "Gare routière Inezgane",
        nameEn: "Inezgane bus station",
        nameAr: "المحطة الطرقية إنزكان",
        extraFee: dh(50),
        position: 2,
      },
    }),
    db.location.create({
      data: {
        name: "Livraison hôtel (Agadir centre)",
        nameEn: "Hotel delivery (Agadir centre)",
        nameAr: "التوصيل إلى الفندق (وسط أكادير)",
        extraFee: dh(100),
        position: 3,
      },
    }),
  ]);

  // --------------------------------------------------------------- Vehicles
  console.info("Création de la flotte…");
  const fleet = [
    {
      brand: "Dacia", model: "Logan", year: 2023, plate: "12345-A-6",
      category: "BERLINE" as const, transmission: "MANUAL" as const, fuel: "DIESEL" as const,
      seats: 5, doors: 5, dailyRate: dh(250), rate3Days: dh(230), weeklyRate: dh(210), monthlyRate: dh(180),
      mileage: 68400, image: "berline", featured: true,
      oilInterval: 10000, lastOil: 60000,
      insurance: 120, inspection: 260,
      features: ["Climatisation", "Bluetooth", "USB", "Vitres électriques", "ABS"],
      descFr: "La référence des routes marocaines : robuste, économique et spacieuse. Idéale pour les familles et les longs trajets.",
      descEn: "The reference on Moroccan roads: sturdy, economical and roomy. Ideal for families and long trips.",
      descAr: "المرجع على الطرق المغربية: متينة واقتصادية وواسعة. مثالية للعائلات والرحلات الطويلة.",
    },
    {
      brand: "Renault", model: "Clio 5", year: 2023, plate: "23456-B-6",
      category: "COMPACTE" as const, transmission: "AUTOMATIC" as const, fuel: "DIESEL" as const,
      seats: 5, doors: 5, dailyRate: dh(320), rate3Days: dh(300), weeklyRate: dh(280), monthlyRate: dh(240),
      mileage: 49700, image: "citadine", featured: true,
      oilInterval: 10000, lastOil: 40000, // vidange à 50 000 -> alerte « 300 km »
      insurance: 45, inspection: 20,
      features: ["Climatisation automatique", "Écran tactile", "Caméra de recul", "Bluetooth", "Régulateur de vitesse"],
      descFr: "Boîte automatique, confort moderne et faible consommation : la citadine parfaite pour Agadir et ses environs.",
      descEn: "Automatic gearbox, modern comfort and low consumption: the perfect city car for Agadir and around.",
      descAr: "علبة سرعات أوتوماتيكية وراحة عصرية واستهلاك منخفض: السيارة المثالية لأكادير وضواحيها.",
    },
    {
      brand: "Dacia", model: "Sandero Stepway", year: 2022, plate: "34567-C-6",
      category: "COMPACTE" as const, transmission: "MANUAL" as const, fuel: "DIESEL" as const,
      seats: 5, doors: 5, dailyRate: dh(280), rate3Days: dh(260), weeklyRate: dh(240), monthlyRate: dh(200),
      mileage: 82300, image: "citadine", featured: false,
      oilInterval: 10000, lastOil: 80000,
      insurance: 200, inspection: 95,
      features: ["Climatisation", "Barres de toit", "Bluetooth", "Régulateur de vitesse"],
      descFr: "Garde au sol surélevée et coffre généreux : à l'aise en ville comme sur les pistes de l'arrière-pays.",
      descEn: "Raised ground clearance and generous boot: at ease in town and on backcountry tracks.",
      descAr: "ارتفاع أكبر عن الأرض وصندوق واسع: مريحة في المدينة وعلى مسالك الداخل.",
    },
    {
      brand: "Peugeot", model: "208", year: 2023, plate: "45678-D-6",
      category: "COMPACTE" as const, transmission: "AUTOMATIC" as const, fuel: "ESSENCE" as const,
      seats: 5, doors: 5, dailyRate: dh(340), rate3Days: dh(320), weeklyRate: dh(295), monthlyRate: dh(250),
      mileage: 38900, image: "citadine", featured: true,
      oilInterval: 15000, lastOil: 30000,
      insurance: 75, inspection: 150,
      features: ["Climatisation automatique", "i-Cockpit", "Apple CarPlay", "Caméra de recul", "Capteurs de stationnement"],
      descFr: "Finition soignée et conduite agréable. Un intérieur moderne qui séduit autant les touristes que les professionnels.",
      descEn: "Refined finish and pleasant drive. A modern interior that appeals to tourists and professionals alike.",
      descAr: "تشطيب متقن وقيادة ممتعة. مقصورة عصرية تجذب السياح والمهنيين على حد سواء.",
    },
    {
      brand: "Hyundai", model: "i10", year: 2022, plate: "56789-E-6",
      category: "ECONOMIQUE" as const, transmission: "MANUAL" as const, fuel: "ESSENCE" as const,
      seats: 4, doors: 5, dailyRate: dh(200), rate3Days: dh(185), weeklyRate: dh(170), monthlyRate: dh(150),
      mileage: 71200, image: "citadine", featured: true,
      oilInterval: 10000, lastOil: 71000,
      insurance: 30, inspection: 55,
      features: ["Climatisation", "Bluetooth", "USB", "Direction assistée"],
      descFr: "La plus économique de la flotte. Compacte, facile à garer, parfaite pour les déplacements urbains.",
      descEn: "The most economical car in the fleet. Compact, easy to park, perfect for city trips.",
      descAr: "الأكثر اقتصادا في الأسطول. صغيرة وسهلة الركن، مثالية للتنقلات داخل المدينة.",
    },
    {
      brand: "Dacia", model: "Duster", year: 2023, plate: "67890-F-6",
      category: "SUV" as const, transmission: "MANUAL" as const, fuel: "DIESEL" as const,
      seats: 5, doors: 5, dailyRate: dh(450), rate3Days: dh(420), weeklyRate: dh(390), monthlyRate: dh(340),
      mileage: 54600, image: "suv", featured: true,
      oilInterval: 10000, lastOil: 50000,
      insurance: 160, inspection: 300,
      features: ["Climatisation", "4x4", "Barres de toit", "Caméra de recul", "Bluetooth", "Régulateur de vitesse"],
      descFr: "Pour les excursions vers Taroudant, Paradise Valley ou le désert : confort et robustesse tout-terrain.",
      descEn: "For trips to Taroudant, Paradise Valley or the desert: comfort and off-road toughness.",
      descAr: "للرحلات نحو تارودانت أو باراديس فالي أو الصحراء: راحة ومتانة على كل المسالك.",
    },
    {
      brand: "Hyundai", model: "Accent", year: 2022, plate: "78901-G-6",
      category: "BERLINE" as const, transmission: "AUTOMATIC" as const, fuel: "DIESEL" as const,
      seats: 5, doors: 4, dailyRate: dh(360), rate3Days: dh(340), weeklyRate: dh(310), monthlyRate: dh(270),
      mileage: 63100, image: "berline", featured: false,
      oilInterval: 12000, lastOil: 60000,
      insurance: 240, inspection: 190,
      features: ["Climatisation automatique", "Sièges chauffants", "Bluetooth", "Régulateur de vitesse", "Caméra de recul"],
      descFr: "Berline automatique confortable, très appréciée pour les déplacements professionnels et les transferts aéroport.",
      descEn: "Comfortable automatic saloon, popular for business trips and airport transfers.",
      descAr: "سيارة أوتوماتيكية مريحة، مطلوبة كثيرا للتنقلات المهنية ونقل المطار.",
    },
    {
      brand: "Kia", model: "Picanto", year: 2021, plate: "89012-H-6",
      category: "ECONOMIQUE" as const, transmission: "MANUAL" as const, fuel: "ESSENCE" as const,
      seats: 4, doors: 5, dailyRate: dh(190), rate3Days: dh(180), weeklyRate: dh(165), monthlyRate: dh(140),
      mileage: 94800, image: "citadine", featured: false,
      oilInterval: 10000, lastOil: 90000,
      insurance: 12, inspection: 40, // assurance expire dans 12 jours -> alerte
      features: ["Climatisation", "Bluetooth", "USB"],
      descFr: "Petit budget, grande fiabilité. Le choix malin pour une location de quelques jours.",
      descEn: "Small budget, great reliability. The smart choice for a few days' rental.",
      descAr: "ميزانية صغيرة وموثوقية كبيرة. الاختيار الذكي لكراء بضعة أيام.",
    },
    {
      brand: "Volkswagen", model: "Polo", year: 2023, plate: "90123-J-6",
      category: "COMPACTE" as const, transmission: "AUTOMATIC" as const, fuel: "ESSENCE" as const,
      seats: 5, doors: 5, dailyRate: dh(390), rate3Days: dh(370), weeklyRate: dh(340), monthlyRate: dh(300),
      mileage: 27500, image: "citadine", featured: false,
      oilInterval: 15000, lastOil: 15000,
      insurance: 280, inspection: 330,
      features: ["Climatisation automatique", "Apple CarPlay", "Android Auto", "Capteurs de stationnement", "Régulateur adaptatif"],
      descFr: "Finition allemande, insonorisation soignée et boîte automatique douce. Le haut de gamme de notre flotte compacte.",
      descEn: "German finish, careful soundproofing and a smooth automatic gearbox. The top of our compact range.",
      descAr: "تشطيب ألماني وعزل صوتي متقن وعلبة سرعات أوتوماتيكية سلسة. قمة أسطولنا المدمج.",
    },
    {
      brand: "Renault", model: "Express Van", year: 2022, plate: "01234-K-6",
      category: "UTILITAIRE" as const, transmission: "MANUAL" as const, fuel: "DIESEL" as const,
      seats: 2, doors: 4, dailyRate: dh(300), rate3Days: dh(285), weeklyRate: dh(260), monthlyRate: dh(220),
      mileage: 88700, image: "utilitaire", featured: false,
      oilInterval: 10000, lastOil: 85000,
      insurance: 90, inspection: 25, // visite technique dans 25 jours -> alerte
      features: ["Climatisation", "Grand volume de chargement", "Bluetooth", "ABS"],
      descFr: "3,3 m³ de volume utile pour vos déménagements, livraisons et chantiers dans toute la région.",
      descEn: "3.3 m³ of load space for moves, deliveries and worksites across the region.",
      descAr: "3,3 م³ من الحجم المفيد للنقل والتوصيل والأوراش في كل الجهة.",
    },
  ];

  const vehicles = [];
  for (const [index, item] of fleet.entries()) {
    const code = `AC-V-${String(index + 1).padStart(3, "0")}`;
    const nextOil = item.lastOil + item.oilInterval;

    const vehicle = await db.vehicle.create({
      data: {
        internalCode: code,
        slug: `${item.brand}-${item.model}-${item.year}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        brand: item.brand,
        model: item.model,
        year: item.year,
        plate: item.plate,
        category: item.category,
        transmission: item.transmission,
        fuel: item.fuel,
        seats: item.seats,
        doors: item.doors,
        hasAirConditioning: true,
        mileage: item.mileage,
        dailyRate: item.dailyRate,
        rate3Days: item.rate3Days,
        weeklyRate: item.weeklyRate,
        monthlyRate: item.monthlyRate,
        isFeatured: item.featured,
        features: item.features,
        descriptionFr: item.descFr,
        descriptionEn: item.descEn,
        descriptionAr: item.descAr,
        purchaseDate: dateOnly(-700 - index * 30),
        insuranceProvider: "Wafa Assurance",
        insuranceExpiry: dateOnly(item.insurance),
        technicalInspectionExpiry: dateOnly(item.inspection),
        oilChangeIntervalKm: item.oilInterval,
        lastOilChangeMileage: item.lastOil,
        lastOilChangeDate: dateOnly(-120),
        nextOilChangeMileage: nextOil,
        internalNotes: DEMO_TAG,
        images: {
          create: [
            {
              url: `/images/vehicles/${item.image}.svg`,
              alt: `${item.brand} ${item.model}`,
              isPrimary: true,
              position: 0,
            },
          ],
        },
      },
    });
    vehicles.push(vehicle);
  }

  const [logan, clio, sandero, p208, i10, duster, accent, picanto, polo, express] = vehicles;

  // --------------------------------------------------------------- Clients
  console.info("Création des clients…");
  const customers = await Promise.all(
    [
      { firstName: "Ahmed", lastName: "Boukhris", phone: "+212 661 234 567", email: "ahmed.boukhris@example.ma", cin: "JB123456", city: "Agadir", country: "Maroc" },
      { firstName: "Sara", lastName: "El Amrani", phone: "+212 662 345 678", email: "sara.elamrani@example.ma", cin: "JC234567", city: "Inezgane", country: "Maroc" },
      { firstName: "Youssef", lastName: "Ait Baha", phone: "+212 663 456 789", email: "youssef.aitbaha@example.ma", cin: "JD345678", city: "Dcheira", country: "Maroc" },
      { firstName: "Marie", lastName: "Lefèvre", phone: "+33 6 12 34 56 78", email: "marie.lefevre@example.fr", cin: "18AB45678", city: "Lyon", country: "France" },
      { firstName: "Thomas", lastName: "Müller", phone: "+49 170 1234567", email: "thomas.mueller@example.de", cin: "L01X9C3H5", city: "Munich", country: "Allemagne" },
      { firstName: "Fatima", lastName: "Zahra Idrissi", phone: "+212 664 567 890", email: "fatima.idrissi@example.ma", cin: "JE456789", city: "Taroudant", country: "Maroc" },
    ].map((customer, index) =>
      db.customer.create({
        data: {
          ...customer,
          licenseNumber: `PC${100000 + index * 1111}`,
          licenseIssuedAt: dateOnly(-2000 - index * 100),
          address: `${10 + index} avenue Mohammed V`,
          internalNotes: DEMO_TAG,
        },
      }),
    ),
  );
  const [ahmed, saraC, youssef, marie, thomas, fatima] = customers;

  // ----------------------------------------------------------- Réservations
  console.info("Création des réservations…");

  const year = new Date().getFullYear();
  let sequence = 0;
  const nextRef = () => `AC-${year}-${String(++sequence).padStart(5, "0")}`;

  type ResSpec = {
    vehicle: (typeof vehicles)[number];
    customer: (typeof customers)[number];
    startOffset: number;
    endOffset: number;
    status: "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "REJECTED";
    paymentStatus?: "UNPAID" | "DEPOSIT_PAID" | "PARTIALLY_PAID" | "PAID";
    source?: "WEBSITE" | "PHONE" | "WHATSAPP" | "WALK_IN" | "ADMIN";
    comment?: string;
  };

  const specs: ResSpec[] = [
    // Demandes en attente de validation
    { vehicle: clio, customer: marie, startOffset: 6, endOffset: 11, status: "PENDING", source: "WEBSITE", comment: "Arrivée vol TO 3421 à 14 h 20, merci de prévoir la livraison à l'aéroport." },
    { vehicle: duster, customer: thomas, startOffset: 9, endOffset: 16, status: "PENDING", source: "WEBSITE", comment: "Excursion vers Paradise Valley et Taroudant." },
    { vehicle: i10, customer: youssef, startOffset: 4, endOffset: 6, status: "PENDING", source: "WHATSAPP" },
    // Confirmées à venir
    { vehicle: p208, customer: saraC, startOffset: 2, endOffset: 7, status: "CONFIRMED", paymentStatus: "DEPOSIT_PAID", source: "PHONE" },
    { vehicle: logan, customer: fatima, startOffset: 1, endOffset: 5, status: "CONFIRMED", paymentStatus: "UNPAID", source: "WEBSITE" },
    { vehicle: polo, customer: marie, startOffset: 14, endOffset: 21, status: "CONFIRMED", paymentStatus: "DEPOSIT_PAID", source: "WEBSITE" },
    // Locations en cours
    { vehicle: sandero, customer: ahmed, startOffset: -3, endOffset: 2, status: "ACTIVE", paymentStatus: "PARTIALLY_PAID", source: "WALK_IN" },
    { vehicle: accent, customer: thomas, startOffset: -5, endOffset: 1, status: "ACTIVE", paymentStatus: "PAID", source: "WEBSITE" },
    // Historique
    { vehicle: logan, customer: ahmed, startOffset: -30, endOffset: -24, status: "COMPLETED", paymentStatus: "PAID", source: "WALK_IN" },
    { vehicle: clio, customer: saraC, startOffset: -22, endOffset: -18, status: "COMPLETED", paymentStatus: "PAID", source: "WEBSITE" },
    { vehicle: duster, customer: marie, startOffset: -45, endOffset: -38, status: "COMPLETED", paymentStatus: "PAID", source: "WEBSITE" },
    { vehicle: picanto, customer: youssef, startOffset: -15, endOffset: -12, status: "COMPLETED", paymentStatus: "PAID", source: "PHONE" },
    { vehicle: express, customer: fatima, startOffset: -10, endOffset: -8, status: "COMPLETED", paymentStatus: "PAID", source: "WALK_IN" },
    // Annulée / refusée
    { vehicle: p208, customer: thomas, startOffset: -8, endOffset: -4, status: "CANCELLED", source: "WEBSITE" },
    { vehicle: polo, customer: youssef, startOffset: -6, endOffset: -2, status: "REJECTED", source: "WEBSITE" },
  ];

  const created = [];
  for (const spec of specs) {
    const startAt = at(spec.startOffset, 10);
    const endAt = at(spec.endOffset, 10);
    const days = Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime()) / DAY));

    // Tarif dégressif, identique à la logique de src/lib/pricing.ts
    const rate =
      days >= 30 ? spec.vehicle.monthlyRate! :
      days >= 7 ? spec.vehicle.weeklyRate! :
      days >= 3 ? spec.vehicle.rate3Days! :
      spec.vehicle.dailyRate;

    const subtotal = rate * days;
    const reservation = await db.reservation.create({
      data: {
        reference: nextRef(),
        vehicleId: spec.vehicle.id,
        customerId: spec.customer.id,
        startAt,
        endAt,
        pickupLocationId: agence.id,
        dropoffLocationId: agence.id,
        pickupLocationLabel: agence.name,
        dropoffLocationLabel: agence.name,
        days,
        dailyRate: rate,
        subtotal,
        totalAmount: subtotal,
        status: spec.status,
        paymentStatus: spec.paymentStatus ?? "UNPAID",
        source: spec.source ?? "WEBSITE",
        customerComment: spec.comment,
        confirmedAt: ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(spec.status)
          ? at(spec.startOffset - 1)
          : null,
        confirmedById: ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(spec.status)
          ? admin.id
          : null,
        cancelledAt: ["CANCELLED", "REJECTED"].includes(spec.status) ? at(spec.startOffset - 2) : null,
        cancellationReason:
          spec.status === "REJECTED"
            ? "Véhicule immobilisé pour entretien sur la période demandée."
            : spec.status === "CANCELLED"
              ? "Annulation à la demande du client."
              : null,
        internalNotes: DEMO_TAG,
        priceBreakdown: [
          { label: "Tarif journalier", detail: `${days} jour(s)`, amount: subtotal, kind: "base" },
        ],
      },
    });
    created.push({ reservation, spec, days, subtotal });
  }

  // -------------------------------------------------------------- Locations
  console.info("Création des locations et des paiements…");
  for (const { reservation, spec, subtotal } of created) {
    if (spec.status !== "ACTIVE" && spec.status !== "COMPLETED") continue;

    const isDone = spec.status === "COMPLETED";
    const startMileage = spec.vehicle.mileage - (isDone ? 900 : 300);

    await db.rental.create({
      data: {
        reservationId: reservation.id,
        vehicleId: spec.vehicle.id,
        customerId: spec.customer.id,
        startedAt: reservation.startAt,
        startMileage,
        startFuel: "FULL",
        startConditionNotes: "Véhicule remis propre, pneus et carrosserie contrôlés.",
        checkedOutById: admin.id,
        ...(isDone
          ? {
              endedAt: reservation.endAt,
              endMileage: startMileage + 620,
              endFuel: "FULL" as const,
              checkedInById: admin.id,
              finalAmount: subtotal,
            }
          : {}),
      },
    });

    if (spec.status === "ACTIVE") {
      await db.vehicle.update({
        where: { id: spec.vehicle.id },
        data: { status: "RENTED" },
      });
    }
  }

  for (const { reservation, spec, subtotal } of created) {
    if (spec.paymentStatus === "PAID") {
      await db.payment.create({
        data: {
          reservationId: reservation.id,
          customerId: spec.customer.id,
          amount: subtotal,
          type: "BALANCE",
          method: "CASH",
          paidAt: reservation.startAt,
          recordedById: admin.id,
          note: DEMO_TAG,
        },
      });
    } else if (spec.paymentStatus === "DEPOSIT_PAID" || spec.paymentStatus === "PARTIALLY_PAID") {
      await db.payment.create({
        data: {
          reservationId: reservation.id,
          customerId: spec.customer.id,
          amount: Math.round(subtotal * 0.3),
          type: "DEPOSIT",
          method: "BANK_TRANSFER",
          paidAt: reservation.createdAt,
          recordedById: admin.id,
          note: DEMO_TAG,
        },
      });
    }
  }

  // ------------------------------------------------------------ Maintenance
  console.info("Création des entretiens…");
  // Immobilisation garage à venir : bloque la disponibilité du Picanto.
  await db.maintenance.create({
    data: {
      vehicleId: picanto.id,
      type: "REVISION",
      status: "PLANNED",
      startAt: at(3, 8),
      endAt: at(5, 18),
      description: "Révision des 95 000 km + remplacement des plaquettes avant",
      garage: "Garage Al Massira, Inezgane",
      estimatedCost: dh(1800),
    },
  });
  // Immobilisation en cours : l'Express est au garage aujourd'hui.
  await db.maintenance.create({
    data: {
      vehicleId: express.id,
      type: "REPAIR",
      status: "IN_PROGRESS",
      startAt: at(-1, 8),
      endAt: at(1, 18),
      description: "Remplacement de l'embrayage",
      garage: "Garage Souss Auto, Dcheira",
      estimatedCost: dh(4200),
    },
  });
  await db.vehicle.update({
    where: { id: express.id },
    data: { status: "MAINTENANCE" },
  });

  const historyByVehicle: [string, { type: "OIL_CHANGE" | "TIRES" | "BRAKES" | "REVISION" | "BATTERY"; days: number; mileage: number; cost: number; note: string }[]][] = [
    [logan.id, [
      { type: "OIL_CHANGE", days: -120, mileage: 60000, cost: dh(450), note: "Vidange + filtre à huile" },
      { type: "TIRES", days: -240, mileage: 52000, cost: dh(2400), note: "4 pneus Michelin" },
    ]],
    [clio.id, [
      { type: "OIL_CHANGE", days: -95, mileage: 40000, cost: dh(520), note: "Vidange + filtres" },
      { type: "BRAKES", days: -200, mileage: 33000, cost: dh(1200), note: "Plaquettes avant et arrière" },
    ]],
    [duster.id, [
      { type: "REVISION", days: -60, mileage: 50000, cost: dh(1900), note: "Révision constructeur 50 000 km" },
    ]],
    [picanto.id, [
      { type: "OIL_CHANGE", days: -150, mileage: 90000, cost: dh(400), note: "Vidange" },
      { type: "BATTERY", days: -80, mileage: 92500, cost: dh(900), note: "Batterie 60 Ah" },
    ]],
    [accent.id, [
      { type: "OIL_CHANGE", days: -110, mileage: 60000, cost: dh(560), note: "Vidange + filtre à gasoil" },
    ]],
  ];

  for (const [vehicleId, records] of historyByVehicle) {
    for (const record of records) {
      await db.maintenanceRecord.create({
        data: {
          vehicleId,
          type: record.type,
          performedAt: dateOnly(record.days),
          mileage: record.mileage,
          cost: record.cost,
          garage: "Garage Souss Auto, Dcheira",
          notes: record.note,
          createdById: admin.id,
        },
      });
    }
  }

  // --------------------------------------------------------- Règles de prix
  console.info("Création des règles tarifaires…");
  await db.pricingRule.createMany({
    data: [
      {
        name: "Haute saison (juillet - août)",
        type: "SEASON",
        startDate: new Date(`${year}-07-01`),
        endDate: new Date(`${year}-08-31`),
        multiplier: 1.2,
        priority: 10,
        isActive: true,
      },
      {
        name: "Remise longue durée (15 jours et +)",
        type: "LONG_DURATION",
        minDays: 15,
        discountPercent: 10,
        priority: 5,
        isActive: true,
      },
    ],
  });

  // ----------------------------------------------------------- Paramètres
  await db.setting.create({
    data: {
      key: "app",
      value: {
        reservation: { minAdvanceHours: 2 },
        maintenance: { oilChangeAlertKm: 500, insuranceAlertDays: 30, inspectionAlertDays: 30 },
      },
    },
  });

  /*
   * Alignement des compteurs sur les données créées ci-dessus.
   * Sans cela, la première réservation envoyée depuis le site repartirait de
   * AC-2026-00001 — déjà pris — et échouerait sur la contrainte d'unicité.
   */
  await db.counter.createMany({
    data: [
      { key: `reservation:${year}`, value: sequence },
      { key: "vehicle", value: vehicles.length },
    ],
  });

  await db.auditLog.create({
    data: {
      userId: admin.id,
      userLabel: "Système",
      action: "seed.run",
      summary: "Jeu de données de démonstration installé",
      metadata: { vehicles: vehicles.length, reservations: created.length },
    },
  });

  console.info(`
Données de démonstration installées.

  Véhicules      : ${vehicles.length}
  Clients        : ${customers.length}
  Réservations   : ${created.length}
  Lieux          : 4

  Connexion au dashboard  ->  /admin/login
    Administrateur : admin@anachcar.ma   / Admin@2026
    Employé        : agence@anachcar.ma  / Employe@2026

  Ces données sont FICTIVES. Videz la base avant la mise en production réelle.
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
