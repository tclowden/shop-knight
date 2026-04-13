import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const row = await prisma.storageItem.findFirst({
    where: withCompany(companyId, { id }),
    include: { ownerCustomer: true, rack: true, space: { include: { rack: true } }, bin: true },
  });

  if (!row) return NextResponse.json({ error: 'Storage item not found' }, { status: 404 });
  return NextResponse.json({ ...row, photoUrl: row.photoFileData ? `/api/admin/storage/items/${row.id}/photo` : null });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.storageItem.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Storage item not found' }, { status: 404 });

  const form = await req.formData();
  const name = String(form.get('name') || existing.name).trim();
  const description = String(form.get('description') ?? existing.description ?? '').trim() || null;
  const rackIdInput = String(form.get('rackId') ?? existing.rackId ?? '').trim() || null;
  const spaceId = String(form.get('spaceId') ?? existing.spaceId ?? '').trim();
  const binIdInput = String(form.get('binId') ?? existing.binId ?? '').trim() || null;
  const itemNumber = String(form.get('itemNumber') ?? existing.itemNumber).trim();
  const ownerCustomerId = String(form.get('ownerCustomerId') ?? existing.ownerCustomerId ?? '').trim() || null;
  const pointOfContact = String(form.get('pointOfContact') ?? existing.pointOfContact ?? '').trim() || null;
  const pointOfContactEmail = String(form.get('pointOfContactEmail') ?? existing.pointOfContactEmail ?? '').trim() || null;
  const pointOfContactPhone = String(form.get('pointOfContactPhone') ?? existing.pointOfContactPhone ?? '').trim() || null;
  const dateEnteredStorageRaw = String(form.get('dateEnteredStorage') ?? (existing.dateEnteredStorage ? existing.dateEnteredStorage.toISOString().slice(0, 10) : '')).trim();
  const clearPhoto = String(form.get('clearPhoto') || '').trim() === 'true';
  const file = form.get('photo');

  if (!name || !spaceId || !itemNumber) return NextResponse.json({ error: 'itemNumber, name and spaceId are required' }, { status: 400 });

  const space = await prisma.storageSpace.findFirst({
    where: withCompany(companyId, { id: spaceId, active: true }),
    include: { rack: true },
  });
  if (!space || !space.rack.active) return NextResponse.json({ error: 'Active space not found' }, { status: 404 });

  if (rackIdInput && rackIdInput !== space.rackId) {
    return NextResponse.json({ error: 'Selected rack does not match selected space' }, { status: 400 });
  }

  let binId: string | null = null;
  if (binIdInput) {
    const bin = await prisma.storageBin.findFirst({ where: withCompany(companyId, { id: binIdInput, spaceId, active: true }) });
    if (!bin) return NextResponse.json({ error: 'Selected bin is invalid' }, { status: 400 });
    binId = bin.id;
  }

  if (ownerCustomerId) {
    const owner = await prisma.customer.findFirst({ where: withCompany(companyId, { id: ownerCustomerId }) });
    if (!owner) return NextResponse.json({ error: 'Selected owner customer is invalid' }, { status: 400 });
  }

  let dateEnteredStorage: Date | null = null;
  if (dateEnteredStorageRaw) {
    const parsed = new Date(dateEnteredStorageRaw);
    if (Number.isNaN(parsed.getTime())) return NextResponse.json({ error: 'dateEnteredStorage is invalid' }, { status: 400 });
    dateEnteredStorage = parsed;
  }

  const data: {
    itemNumber: string;
    name: string;
    description: string | null;
    ownerCustomerId: string | null;
    pointOfContact: string | null;
    pointOfContactEmail: string | null;
    pointOfContactPhone: string | null;
    dateEnteredStorage: Date | null;
    rackId: string;
    spaceId: string;
    binId: string | null;
    photoFileName?: string | null;
    photoMimeType?: string | null;
    photoFileData?: Uint8Array<ArrayBuffer> | null;
  } = {
    itemNumber,
    name,
    description,
    ownerCustomerId,
    pointOfContact,
    pointOfContactEmail,
    pointOfContactPhone,
    dateEnteredStorage,
    rackId: space.rackId,
    spaceId,
    binId,
  };

  if (clearPhoto) {
    data.photoFileName = null;
    data.photoMimeType = null;
    data.photoFileData = null;
  } else if (file instanceof File) {
    const bytes = await file.arrayBuffer();
    if (!bytes.byteLength) return NextResponse.json({ error: 'photo is empty' }, { status: 400 });
    data.photoFileName = file.name || 'photo';
    data.photoMimeType = file.type || 'application/octet-stream';
    data.photoFileData = new Uint8Array(bytes as ArrayBuffer);
  }

  try {
    const updated = await prisma.storageItem.update({
      where: { id },
      data,
      include: { ownerCustomer: true, rack: true, space: { include: { rack: true } }, bin: true },
    });
    return NextResponse.json({ ...updated, photoUrl: updated.photoFileData ? `/api/admin/storage/items/${updated.id}/photo` : null });
  } catch {
    return NextResponse.json({ error: 'Storage item could not be updated' }, { status: 409 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.storageItem.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Storage item not found' }, { status: 404 });

  const updated = await prisma.storageItem.update({ where: { id }, data: { active: false } });
  return NextResponse.json(updated);
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  if (String(body?.action || '').toLowerCase() !== 'restore') return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });

  const { id } = await ctx.params;
  const existing = await prisma.storageItem.findFirst({ where: withCompany(companyId, { id }) });
  if (!existing) return NextResponse.json({ error: 'Storage item not found' }, { status: 404 });

  const updated = await prisma.storageItem.update({ where: { id }, data: { active: true } });
  return NextResponse.json(updated);
}
