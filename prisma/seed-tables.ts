/**
 * Seed tables to match the real Báo Garden floor plan.
 * 
 * Areas:
 *   - Khu A (right side): A1–A17
 *   - Khu B (left side, lounge): B1–B13
 *   - Khu T (center, near stage): T1–T16
 *   - Khu VIP (bottom): V1-1, V1-2, V1-4, V2-1, V2-2
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Upsert areas
  const areaData = [
    { name: 'Khu A', description: 'Khu bên phải – View sân khấu', sortOrder: 1 },
    { name: 'Khu B', description: 'Khu bên trái – Lounge & chill', sortOrder: 2 },
    { name: 'Khu T', description: 'Khu trung tâm – Gần sân khấu nhất', sortOrder: 3 },
    { name: 'Khu VIP', description: 'Phòng VIP – Tiệc đặc biệt', sortOrder: 4 },
  ];

  const areaMap: Record<string, string> = {};
  for (const a of areaData) {
    const existing = await prisma.tableArea.findFirst({ where: { name: a.name } });
    if (existing) {
      areaMap[a.name] = existing.id;
    } else {
      const created = await prisma.tableArea.create({ data: a });
      areaMap[a.name] = created.id;
    }
  }

  // 2. Define all tables per floor plan
  const tablesDef: { code: string; name: string; area: string; min: number; max: number; deposit: number; minSpend: number }[] = [
    // Khu A: A1–A17
    ...Array.from({ length: 17 }, (_, i) => ({
      code: `A${i + 1}`,
      name: `Bàn A${i + 1}`,
      area: 'Khu A',
      min: i >= 13 ? 6 : 2,
      max: i >= 13 ? 12 : 6,
      deposit: 0,
      minSpend: i >= 13 ? 500000 : 0,
    })),
    // Khu B: B1–B13
    ...Array.from({ length: 13 }, (_, i) => ({
      code: `B${i + 1}`,
      name: `Bàn B${i + 1}`,
      area: 'Khu B',
      min: 2,
      max: i >= 11 ? 4 : 6,
      deposit: 0,
      minSpend: 0,
    })),
    // Khu T: T1–T16
    ...Array.from({ length: 16 }, (_, i) => ({
      code: `T${i + 1}`,
      name: `Bàn T${i + 1}`,
      area: 'Khu T',
      min: 2,
      max: 6,
      deposit: 0,
      minSpend: 0,
    })),
    // Khu VIP
    { code: 'V1-1', name: 'VIP 1-1', area: 'Khu VIP', min: 6, max: 20, deposit: 1000000, minSpend: 3000000 },
    { code: 'V1-2', name: 'VIP 1-2', area: 'Khu VIP', min: 6, max: 20, deposit: 1000000, minSpend: 3000000 },
    { code: 'V1-4', name: 'VIP 1-4 (VIPI)', area: 'Khu VIP', min: 8, max: 30, deposit: 2000000, minSpend: 5000000 },
    { code: 'V2-1', name: 'VIP 2-1', area: 'Khu VIP', min: 6, max: 15, deposit: 1000000, minSpend: 3000000 },
    { code: 'V2-2', name: 'VIP 2-2', area: 'Khu VIP', min: 6, max: 15, deposit: 1000000, minSpend: 3000000 },
  ];

  // 3. Delete old tables (that don't match new codes)
  const newCodes = tablesDef.map(t => t.code);
  const oldTables = await prisma.restaurantTable.findMany();
  const toDelete = oldTables.filter(t => !newCodes.includes(t.code));
  
  // Check for bookings before deleting
  for (const t of toDelete) {
    const bookingCount = await prisma.booking.count({ where: { tableId: t.id } });
    if (bookingCount === 0) {
      // Safe to delete - check sessions too
      const sessionCount = await prisma.tableSession.count({ where: { tableId: t.id } });
      if (sessionCount === 0) {
        await prisma.restaurantTable.delete({ where: { id: t.id } });
        console.log(`  Deleted old table: ${t.code}`);
      } else {
        // Mark inactive instead
        await prisma.restaurantTable.update({ where: { id: t.id }, data: { status: 'INACTIVE' } });
        console.log(`  Deactivated old table (has sessions): ${t.code}`);
      }
    } else {
      // Mark inactive instead
      await prisma.restaurantTable.update({ where: { id: t.id }, data: { status: 'INACTIVE' } });
      console.log(`  Deactivated old table (has bookings): ${t.code}`);
    }
  }

  // 4. Upsert new tables
  let created = 0;
  let updated = 0;
  for (const t of tablesDef) {
    const existing = await prisma.restaurantTable.findUnique({ where: { code: t.code } });
    if (existing) {
      await prisma.restaurantTable.update({
        where: { code: t.code },
        data: {
          name: t.name,
          areaId: areaMap[t.area],
          minGuests: t.min,
          maxGuests: t.max,
          depositAmount: t.deposit,
          minSpend: t.minSpend,
          status: 'AVAILABLE',
        },
      });
      updated++;
    } else {
      await prisma.restaurantTable.create({
        data: {
          code: t.code,
          name: t.name,
          areaId: areaMap[t.area],
          minGuests: t.min,
          maxGuests: t.max,
          depositAmount: t.deposit,
          minSpend: t.minSpend,
          status: 'AVAILABLE',
        },
      });
      created++;
    }
  }

  // 5. Delete old areas that have no tables
  const oldAreas = await prisma.tableArea.findMany();
  for (const a of oldAreas) {
    if (!Object.values(areaMap).includes(a.id)) {
      const tableCount = await prisma.restaurantTable.count({ where: { areaId: a.id, status: { not: 'INACTIVE' } } });
      if (tableCount === 0) {
        // Check if there are inactive tables pointing here
        const inactiveCount = await prisma.restaurantTable.count({ where: { areaId: a.id } });
        if (inactiveCount === 0) {
          await prisma.tableArea.delete({ where: { id: a.id } });
          console.log(`  Deleted old area: ${a.name}`);
        }
      }
    }
  }

  console.log(`\n✅ Done! Created ${created}, updated ${updated} tables.`);
  
  // Verify
  const final = await prisma.restaurantTable.findMany({
    where: { status: { not: 'INACTIVE' } },
    include: { area: true },
    orderBy: { code: 'asc' },
  });
  const byArea: Record<string, string[]> = {};
  for (const t of final) {
    const a = t.area?.name || 'N/A';
    (byArea[a] ??= []).push(t.code);
  }
  console.log('\nFinal layout:');
  for (const [area, codes] of Object.entries(byArea)) {
    console.log(`  ${area}: ${codes.join(', ')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
