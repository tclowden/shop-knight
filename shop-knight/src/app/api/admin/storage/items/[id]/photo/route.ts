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
  const item = await prisma.storageItem.findFirst({
    where: withCompany(companyId, { id }),
    select: { photoFileData: true, photoMimeType: true, photoFileName: true },
  });

  if (!item?.photoFileData) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

  return new NextResponse(item.photoFileData, {
    status: 200,
    headers: {
      'Content-Type': item.photoMimeType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `inline; filename="${item.photoFileName || 'storage-item-photo'}"`,
    },
  });
}
