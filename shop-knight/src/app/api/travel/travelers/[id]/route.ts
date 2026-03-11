import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });
  const { id } = await params;

  const item = await prisma.traveler.findFirst({ where: withCompany(companyId, { id }) });
  if (!item) return NextResponse.json({ error: 'Traveler not found' }, { status: 404 });

  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'OPERATIONS']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });
  const { id } = await params;

  const existing = await prisma.traveler.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Traveler not found' }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.traveler.update({
    where: { id },
    data: {
      fullName: body?.fullName !== undefined ? String(body.fullName || '') : undefined,
      email: body?.email !== undefined ? (body.email ? String(body.email) : null) : undefined,
      phone: body?.phone !== undefined ? (body.phone ? String(body.phone) : null) : undefined,
      emergencyName: body?.emergencyName !== undefined ? (body.emergencyName ? String(body.emergencyName) : null) : undefined,
      emergencyRelationship: body?.emergencyRelationship !== undefined ? (body.emergencyRelationship ? String(body.emergencyRelationship) : null) : undefined,
      emergencyPhone: body?.emergencyPhone !== undefined ? (body.emergencyPhone ? String(body.emergencyPhone) : null) : undefined,
      dateOfBirth: body?.dateOfBirth !== undefined ? toDate(body.dateOfBirth) : undefined,
      knownTravelerNumber: body?.knownTravelerNumber !== undefined ? (body.knownTravelerNumber ? String(body.knownTravelerNumber) : null) : undefined,
      passportNumber: body?.passportNumber !== undefined ? (body.passportNumber ? String(body.passportNumber) : null) : undefined,
      passportExpiration: body?.passportExpiration !== undefined ? toDate(body.passportExpiration) : undefined,
      passportCountry: body?.passportCountry !== undefined ? (body.passportCountry ? String(body.passportCountry) : null) : undefined,
      loyaltyAirline: body?.loyaltyAirline !== undefined ? (body.loyaltyAirline ? String(body.loyaltyAirline) : null) : undefined,
      loyaltyHotel: body?.loyaltyHotel !== undefined ? (body.loyaltyHotel ? String(body.loyaltyHotel) : null) : undefined,
      loyaltyRentalCar: body?.loyaltyRentalCar !== undefined ? (body.loyaltyRentalCar ? String(body.loyaltyRentalCar) : null) : undefined,
      dietaryNotes: body?.dietaryNotes !== undefined ? (body.dietaryNotes ? String(body.dietaryNotes) : null) : undefined,
      medicalNotes: body?.medicalNotes !== undefined ? (body.medicalNotes ? String(body.medicalNotes) : null) : undefined,
      managerUserId: body?.managerUserId !== undefined ? (body.managerUserId ? String(body.managerUserId) : null) : undefined,
      active: body?.active !== undefined ? Boolean(body.active) : undefined,
    },
  });

  return NextResponse.json(updated);
}
