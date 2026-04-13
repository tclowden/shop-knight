import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

async function generateNextStorageItemNumber(companyId: string) {
  const rows = await prisma.$queryRaw<Array<{ max_num: number | null }>>`
    SELECT MAX(CAST(SUBSTRING("itemNumber" FROM '[0-9]+$') AS INTEGER)) AS max_num
    FROM "StorageItem"
    WHERE "companyId" = ${companyId}
      AND "itemNumber" ~ '[0-9]+$'
  `;
  const next = Number(rows?.[0]?.max_num || 0) + 1;
  return `STI-${String(next).padStart(4, '0')}`;
}

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const archivedMode = searchParams.get('archived');

  const rows = await prisma.storageItem.findMany({
    where:
      archivedMode === 'only'
        ? withCompany(companyId, { active: false })
        : archivedMode === 'all'
          ? withCompany(companyId)
          : withCompany(companyId, { active: true }),
    include: {
      ownerCustomer: true,
      rack: true,
      space: { include: { rack: true } },
      bin: true,
    },
    orderBy: [{ name: 'asc' }],
  });

  return NextResponse.json(rows.map((row) => ({
    ...row,
    photoUrl: row.photoFileData ? `/api/admin/storage/items/${row.id}/photo` : null,
  })));
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const form = await req.formData();
  const name = String(form.get('name') || '').trim();
  const description = String(form.get('description') || '').trim() || null;
  const rackId = String(form.get('rackId') || '').trim() || null;
  const spaceId = String(form.get('spaceId') || '').trim();
  const binId = String(form.get('binId') || '').trim() || null;
  const requestedItemNumber = String(form.get('itemNumber') || '').trim();
  const ownerCustomerId = String(form.get('ownerCustomerId') || '').trim() || null;
  const pointOfContact = String(form.get('pointOfContact') || '').trim() || null;
  const pointOfContactEmail = String(form.get('pointOfContactEmail') || '').trim() || null;
  const pointOfContactPhone = String(form.get('pointOfContactPhone') || '').trim() || null;
  const dateEnteredStorageRaw = String(form.get('dateEnteredStorage') || '').trim();
  const file = form.get('photo');

  if (!name || !spaceId) return NextResponse.json({ error: 'name and spaceId are required' }, { status: 400 });

  const space = await prisma.storageSpace.findFirst({
    where: withCompany(companyId, { id: spaceId, active: true }),
    include: { rack: true },
  });
  if (!space || !space.rack.active) return NextResponse.json({ error: 'Active space not found' }, { status: 404 });

  if (rackId && rackId !== space.rackId) {
    return NextResponse.json({ error: 'Selected rack does not match selected space' }, { status: 400 });
  }

  let validBinId: string | null = null;
  if (binId) {
    const bin = await prisma.storageBin.findFirst({ where: withCompany(companyId, { id: binId, spaceId, active: true }) });
    if (!bin) return NextResponse.json({ error: 'Selected bin is invalid' }, { status: 400 });
    validBinId = bin.id;
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

  let photoFileName: string | null = null;
  let photoMimeType: string | null = null;
  let photoFileData: Uint8Array | null = null;

  if (file instanceof File) {
    const bytes = await file.arrayBuffer();
    if (!bytes.byteLength) return NextResponse.json({ error: 'photo is empty' }, { status: 400 });
    photoFileName = file.name || 'photo';
    photoMimeType = file.type || 'application/octet-stream';
    photoFileData = new Uint8Array(bytes as ArrayBuffer);
  }

  const createPayload = {
    companyId,
    name,
    description,
    ownerCustomerId,
    pointOfContact,
    pointOfContactEmail,
    pointOfContactPhone,
    dateEnteredStorage,
    rackId: space.rackId,
    spaceId,
    binId: validBinId,
    photoFileName,
    photoMimeType,
    photoFileData: photoFileData as unknown as Uint8Array<ArrayBuffer> | null,
    active: true,
  };

  if (requestedItemNumber) {
    try {
      const created = await prisma.storageItem.create({
        data: {
          ...createPayload,
          itemNumber: requestedItemNumber,
        },
        include: {
          ownerCustomer: true,
          rack: true,
          space: { include: { rack: true } },
          bin: true,
        },
      });
      return NextResponse.json({ ...created, photoUrl: created.photoFileData ? `/api/admin/storage/items/${created.id}/photo` : null }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ error: 'Storage item number already exists' }, { status: 409 });
      }
      console.error('Failed to create storage item', error);
      return NextResponse.json({ error: 'Could not create storage item' }, { status: 500 });
    }
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const itemNumber = await generateNextStorageItemNumber(companyId);
      const created = await prisma.storageItem.create({
        data: {
          ...createPayload,
          itemNumber,
        },
        include: {
          ownerCustomer: true,
          rack: true,
          space: { include: { rack: true } },
          bin: true,
        },
      });
      return NextResponse.json({ ...created, photoUrl: created.photoFileData ? `/api/admin/storage/items/${created.id}/photo` : null }, { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        continue;
      }
      console.error('Failed to create storage item', error);
      return NextResponse.json({ error: 'Could not create storage item' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Could not reserve a unique storage item number. Please try again.' }, { status: 409 });
}
