import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  // Ensure every active employee in this company is available as a traveler option.
  const employees = await prisma.user.findMany({
    where: {
      active: true,
      isEmployee: true,
      OR: [{ activeCompanyId: companyId }, { companyMemberships: { some: { companyId } } }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      knownTravelerNumber: true,
      rewardMarriottNumber: true,
      rewardUnitedNumber: true,
      rewardDeltaNumber: true,
      rewardAmericanNumber: true,
    },
    orderBy: { name: 'asc' },
  });

  const existing = await prisma.traveler.findMany({
    where: withCompany(companyId, { userId: { in: employees.map((e) => e.id) } }),
    select: { id: true, userId: true },
  });
  const existingUserIds = new Set(existing.map((t) => t.userId).filter(Boolean));

  for (const employee of employees) {
    if (existingUserIds.has(employee.id)) continue;
    await prisma.traveler.create({
      data: {
        companyId,
        userId: employee.id,
        fullName: employee.name,
        email: employee.email || null,
        phone: employee.phone || null,
        knownTravelerNumber: employee.knownTravelerNumber || null,
        loyaltyAirline: [employee.rewardUnitedNumber, employee.rewardDeltaNumber, employee.rewardAmericanNumber].filter(Boolean).join(' | ') || null,
        loyaltyHotel: employee.rewardMarriottNumber || null,
        active: true,
      },
    });
  }

  const items = await prisma.traveler.findMany({
    where: withCompany(companyId, { active: true }),
    include: {
      user: { select: { id: true, name: true, email: true } },
      manager: { select: { id: true, name: true, email: true } },
    },
    orderBy: { fullName: 'asc' },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'OPERATIONS', 'SALES', 'PROJECT_MANAGER', 'SALES_REP']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json();
  const fullName = String(body?.fullName || '').trim();
  const userId = String(body?.userId || '').trim();
  if (!fullName) return NextResponse.json({ error: 'fullName required' }, { status: 400 });
  if (!userId) return NextResponse.json({ error: 'userId required (must link to Users table)' }, { status: 400 });

  const linkedUser = await prisma.user.findFirst({
    where: {
      id: userId,
      active: true,
      OR: [{ activeCompanyId: companyId }, { companyMemberships: { some: { companyId } } }],
    },
    select: {
      id: true,
      phone: true,
      knownTravelerNumber: true,
      rewardMarriottNumber: true,
      rewardUnitedNumber: true,
      rewardDeltaNumber: true,
      rewardAmericanNumber: true,
    },
  });
  if (!linkedUser) return NextResponse.json({ error: 'Linked user not found in active company' }, { status: 404 });

  const managerUserId = body?.managerUserId ? String(body.managerUserId) : null;
  if (managerUserId) {
    const manager = await prisma.user.findFirst({
      where: {
        id: managerUserId,
        active: true,
        OR: [{ activeCompanyId: companyId }, { companyMemberships: { some: { companyId } } }],
      },
      select: { id: true },
    });
    if (!manager) return NextResponse.json({ error: 'Manager user not found in active company' }, { status: 404 });
  }

  const created = await prisma.traveler.create({
    data: {
      companyId,
      fullName,
      userId,
      email: body?.email ? String(body.email) : null,
      phone: linkedUser.phone || null,
      emergencyName: body?.emergencyName ? String(body.emergencyName) : null,
      emergencyRelationship: body?.emergencyRelationship ? String(body.emergencyRelationship) : null,
      emergencyPhone: body?.emergencyPhone ? String(body.emergencyPhone) : null,
      dateOfBirth: toDate(body?.dateOfBirth),
      knownTravelerNumber: linkedUser.knownTravelerNumber || null,
      passportNumber: body?.passportNumber ? String(body.passportNumber) : null,
      passportExpiration: toDate(body?.passportExpiration),
      passportCountry: body?.passportCountry ? String(body.passportCountry) : null,
      loyaltyAirline: [linkedUser.rewardUnitedNumber, linkedUser.rewardDeltaNumber, linkedUser.rewardAmericanNumber].filter(Boolean).join(' | ') || null,
      loyaltyHotel: linkedUser.rewardMarriottNumber || null,
      loyaltyRentalCar: body?.loyaltyRentalCar ? String(body.loyaltyRentalCar) : null,
      dietaryNotes: body?.dietaryNotes ? String(body.dietaryNotes) : null,
      medicalNotes: body?.medicalNotes ? String(body.medicalNotes) : null,
      managerUserId: body?.managerUserId ? String(body.managerUserId) : null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
