import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const items = await prisma.traveler.findMany({
    where: withCompany(companyId, { active: true }),
    orderBy: { fullName: 'asc' },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'OPERATIONS']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json();
  const fullName = String(body?.fullName || '').trim();
  if (!fullName) return NextResponse.json({ error: 'fullName required' }, { status: 400 });

  const created = await prisma.traveler.create({
    data: {
      companyId,
      fullName,
      email: body?.email ? String(body.email) : null,
      phone: body?.phone ? String(body.phone) : null,
      emergencyName: body?.emergencyName ? String(body.emergencyName) : null,
      emergencyRelationship: body?.emergencyRelationship ? String(body.emergencyRelationship) : null,
      emergencyPhone: body?.emergencyPhone ? String(body.emergencyPhone) : null,
      dateOfBirth: toDate(body?.dateOfBirth),
      knownTravelerNumber: body?.knownTravelerNumber ? String(body.knownTravelerNumber) : null,
      passportNumber: body?.passportNumber ? String(body.passportNumber) : null,
      passportExpiration: toDate(body?.passportExpiration),
      passportCountry: body?.passportCountry ? String(body.passportCountry) : null,
      loyaltyAirline: body?.loyaltyAirline ? String(body.loyaltyAirline) : null,
      loyaltyHotel: body?.loyaltyHotel ? String(body.loyaltyHotel) : null,
      loyaltyRentalCar: body?.loyaltyRentalCar ? String(body.loyaltyRentalCar) : null,
      dietaryNotes: body?.dietaryNotes ? String(body.dietaryNotes) : null,
      medicalNotes: body?.medicalNotes ? String(body.medicalNotes) : null,
      managerUserId: body?.managerUserId ? String(body.managerUserId) : null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
