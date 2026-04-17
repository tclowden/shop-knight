import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['admin.inventory.manage']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;
  const item = await prisma.inventoryItem.findFirst({ where: withCompany(companyId, { id }) });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const history = await prisma.inventoryItemStorageAssignment.findMany({
    where: withCompany(companyId, { inventoryItemId: id }),
    include: {
      bin: { include: { space: { include: { rack: true } } } },
      movedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ startedAt: 'desc' }],
  });

  return NextResponse.json(history.map((h) => ({
    ...h,
    photoUrl: h.photoFileData ? `/api/admin/storage-assignments/${h.id}/photo` : null,
  })));
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requirePermissions(['admin.inventory.manage']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const userId = String((auth.session?.user as { id?: string } | undefined)?.id || '');
  const { id } = await ctx.params;

  const item = await prisma.inventoryItem.findFirst({ where: withCompany(companyId, { id, active: true }) });
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const form = await req.formData();
  const binId = String(form.get('binId') || '').trim();
  const notes = String(form.get('notes') || '').trim() || null;
  const file = form.get('photo');

  if (!binId) return NextResponse.json({ error: 'binId is required' }, { status: 400 });

  const bin = await prisma.storageBin.findFirst({
    where: withCompany(companyId, { id: binId, active: true }),
    include: { space: { include: { rack: true } } },
  });
  if (!bin || !bin.space.active || !bin.space.rack.active) {
    return NextResponse.json({ error: 'Active bin not found' }, { status: 404 });
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

  const movedById = userId || null;

  const result = await prisma.$transaction(async (tx) => {
    await tx.inventoryItemStorageAssignment.updateMany({
      where: withCompany(companyId, { inventoryItemId: id, endedAt: null }),
      data: { endedAt: new Date() },
    });

    const created = await tx.inventoryItemStorageAssignment.create({
      data: {
        companyId,
        inventoryItemId: id,
        binId,
        notes,
        photoFileName,
        photoMimeType,
        photoFileData: photoFileData as unknown as Uint8Array<ArrayBuffer> | null,
        movedById,
      },
      include: {
        bin: { include: { space: { include: { rack: true } } } },
        movedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return created;
  });

  return NextResponse.json({ ...result, photoUrl: result.photoFileData ? `/api/admin/storage-assignments/${result.id}/photo` : null }, { status: 201 });
}
