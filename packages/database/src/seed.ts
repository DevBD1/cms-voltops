/**
 * Seed script: populates the VoltOps database with realistic test data.
 * Run with: pnpm --filter @voltops/database db:seed
 *
 * Credentials (all passwords are "voltops123"):
 *  - admin@voltops.com      → ADMIN
 *  - operator@voltops.com   → OPERATOR
 *  - mehmet@voltops.com     → TECHNICIAN
 *  - ahmet@example.com      → CUSTOMER
 *  - canan@example.com      → CUSTOMER
 */

import * as dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import bcrypt from 'bcryptjs';
import * as schema from './schema';

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const client = postgres(url);
const db = drizzle(client, { schema });

const HASH = bcrypt.hashSync('voltops123', 10);

async function seed() {
  console.log('🌱 Seeding database...');

  // ── Users ──────────────────────────────────────────────────────────────────
  const [admin, operator, technician, customer1, customer2] = await db
    .insert(schema.users)
    .values([
      {
        firstName: 'Admin',
        lastName: 'Kullanıcı',
        email: 'admin@voltops.com',
        passwordHash: HASH,
        role: 'ADMIN',
        phone: '+905551110001',
      },
      {
        firstName: 'Operatör',
        lastName: 'Demir',
        email: 'operator@voltops.com',
        passwordHash: HASH,
        role: 'OPERATOR',
        phone: '+905551110002',
      },
      {
        firstName: 'Mehmet',
        lastName: 'Demir',
        email: 'mehmet@voltops.com',
        passwordHash: HASH,
        role: 'TECHNICIAN',
        phone: '+905551110003',
      },
      {
        firstName: 'Ahmet',
        lastName: 'Yılmaz',
        email: 'ahmet@example.com',
        passwordHash: HASH,
        role: 'CUSTOMER',
        phone: '+905551234567',
      },
      {
        firstName: 'Canan',
        lastName: 'Tekin',
        email: 'canan@example.com',
        passwordHash: HASH,
        role: 'CUSTOMER',
        phone: '+905559876543',
      },
    ])
    .returning();

  console.log('  ✓ Users');

  // ── Stations ───────────────────────────────────────────────────────────────
  const [stBursa, stGorukle, stKocaeli] = await db
    .insert(schema.stations)
    .values([
      {
        stationCode: 'TR-16-NIL-01',
        name: 'VoltOps Bursa Merkez Hub',
        city: 'Bursa',
        district: 'Nilüfer',
        address: 'İhsaniye Mah. Barbaros Cad. No:12',
        latitude: '40.221500',
        longitude: '28.962200',
        status: 'ACTIVE',
      },
      {
        stationCode: 'TR-16-GUK-02',
        name: 'Görükle Kampüs İstasyonu',
        city: 'Bursa',
        district: 'Nilüfer',
        address: 'Uludağ Üniversitesi Görükle Kampüsü',
        latitude: '40.218000',
        longitude: '28.825000',
        status: 'ACTIVE',
      },
      {
        stationCode: 'TR-41-IZM-01',
        name: 'Kocaeli Umuttepe Dağıtım Hub',
        city: 'Kocaeli',
        district: 'İzmit',
        address: 'Umuttepe Kampüsü, Kabaoğlu Mah.',
        latitude: '40.821000',
        longitude: '29.924100',
        status: 'ACTIVE',
      },
    ])
    .returning();

  console.log('  ✓ Stations');

  // ── Plugs ──────────────────────────────────────────────────────────────────
  const [p1, p2, p3, p4, p5, p6, p7, p8] = await db
    .insert(schema.plugs)
    .values([
      // Bursa Merkez – DC Fast Charger
      {
        plugCode: 'TR-16-NIL-01-P1',
        stationId: stBursa.id,
        plugType: 'DC_CCS2',
        powerKw: '120.00',
        currentType: 'DC',
        status: 'CHARGING',
      },
      {
        plugCode: 'TR-16-NIL-01-P2',
        stationId: stBursa.id,
        plugType: 'DC_CCS2',
        powerKw: '60.00',
        currentType: 'DC',
        status: 'AVAILABLE',
      },
      // Bursa Merkez – AC Charger
      {
        plugCode: 'TR-16-NIL-01-P3',
        stationId: stBursa.id,
        plugType: 'AC_TYPE2',
        powerKw: '22.00',
        currentType: 'AC',
        status: 'AVAILABLE',
      },
      {
        plugCode: 'TR-16-NIL-01-P4',
        stationId: stBursa.id,
        plugType: 'AC_TYPE2',
        powerKw: '22.00',
        currentType: 'AC',
        status: 'RESERVED',
      },
      // Görükle – Under maintenance
      {
        plugCode: 'TR-16-GUK-02-P1',
        stationId: stGorukle.id,
        plugType: 'DC_CCS2',
        powerKw: '150.00',
        currentType: 'DC',
        status: 'FAULTY',
      },
      {
        plugCode: 'TR-16-GUK-02-P2',
        stationId: stGorukle.id,
        plugType: 'DC_CHADEMO',
        powerKw: '150.00',
        currentType: 'DC',
        status: 'FAULTY',
      },
      // Kocaeli
      {
        plugCode: 'TR-41-IZM-01-P1',
        stationId: stKocaeli.id,
        plugType: 'DC_CCS2',
        powerKw: '90.00',
        currentType: 'DC',
        status: 'CHARGING',
      },
      {
        plugCode: 'TR-41-IZM-01-P2',
        stationId: stKocaeli.id,
        plugType: 'AC_TYPE2',
        powerKw: '22.00',
        currentType: 'AC',
        status: 'AVAILABLE',
      },
    ])
    .returning();

  console.log('  ✓ Plugs');

  // ── Sessions ───────────────────────────────────────────────────────────────
  const now = new Date();
  const [sess1, , sess3] = await db
    .insert(schema.sessions)
    .values([
      // Active: Ahmet charging at Bursa P1
      {
        userId: customer1.id,
        plugId: p1.id,
        startedAt: new Date(now.getTime() - 65 * 60 * 1000), // 65 min ago
        status: 'ACTIVE',
      },
      // Completed: Ahmet yesterday at Bursa P2
      {
        userId: customer1.id,
        plugId: p2.id,
        startedAt: new Date(now.getTime() - 26 * 3600 * 1000),
        endedAt: new Date(now.getTime() - 25.25 * 3600 * 1000),
        energyKwh: '45.000',
        totalPrice: '337.50',
        status: 'COMPLETED',
      },
      // Active: Canan charging at Kocaeli P7
      {
        userId: customer2.id,
        plugId: p7.id,
        startedAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
        status: 'ACTIVE',
      },
    ])
    .returning();

  console.log('  ✓ Sessions');

  // ── Receipts ───────────────────────────────────────────────────────────────
  await db.insert(schema.receipts).values([
    {
      receiptNo: 'VOP202605150001',
      sessionId: sess1.id,
      subtotal: '276.14',
      taxAmount: '61.36',
      totalAmount: '337.50',
      currency: 'TRY',
      paymentMethod: 'CREDIT_CARD',
      issuedAt: new Date(now.getTime() - 25 * 3600 * 1000),
    },
  ]);

  console.log('  ✓ Receipts');

  // ── Maintenance ────────────────────────────────────────────────────────────
  await db.insert(schema.maintenance).values([
    {
      stationId: stGorukle.id,
      plugId: p5.id,
      assignedEmployeeId: technician.id,
      maintenanceType: 'HARDWARE',
      description:
        'Sıcaklık sensörü aşırı ısınma uyarısı verdi. Güç modülü kontrol edilecek.',
      status: 'OPEN',
    },
    {
      stationId: stGorukle.id,
      plugId: p6.id,
      assignedEmployeeId: technician.id,
      maintenanceType: 'HARDWARE',
      description: 'CHAdeMO konektör kilitleme mekanizması arızalı.',
      status: 'IN_PROGRESS',
    },
  ]);

  console.log('  ✓ Maintenance');

  // ── Tickets ────────────────────────────────────────────────────────────────
  await db.insert(schema.tickets).values([
    {
      userId: customer1.id,
      stationId: stGorukle.id,
      title: 'QR Kod Okuma Hatası',
      description:
        'Görükle istasyonundaki DC cihazın ekranındaki QR kod tarayıcı tarafından okunamıyor.',
      priority: 'MEDIUM',
      status: 'OPEN',
    },
  ]);

  console.log('  ✓ Tickets');
  console.log('\n✅ Seed complete.');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => client.end());
