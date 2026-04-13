import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN', 'STORAGE']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;

  const assignment = await prisma.inventoryItemStorageAssignment.findFirst({
    where: withCompany(companyId, { id }),
    select: { photoFileData: true, photoMimeType: true, photoFileName: true },
  });
  if (!assignment?.photoFileData) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

  return new NextResponse(new Uint8Array(assignment.photoFileData), {
    status: 200,
    headers: {
      'Content-Type': assignment.photoMimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${assignment.photoFileName || 'storage-photo'}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
