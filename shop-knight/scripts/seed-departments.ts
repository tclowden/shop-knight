import { prisma } from '../src/lib/prisma';

async function main() {
  const names = ['Fabrication', 'Events', 'Graphic Install', 'Print'];
  const companies = await prisma.company.findMany({ select: { id: true } });

  for (const company of companies) {
    for (const name of names) {
      await prisma.department.upsert({
        where: { companyId_name: { companyId: company.id, name } },
        update: { active: true },
        create: { companyId: company.id, name, active: true },
      });
    }
  }

  const fab = await prisma.department.findMany({ where: { name: 'Fabrication' }, select: { id: true, companyId: true } });
  const byCompany = new Map(fab.map((d) => [d.companyId || '', d.id]));

  const tommy = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'tclowden@gmail.com' },
        { name: { contains: 'Tommy', mode: 'insensitive' } },
        { name: { contains: 'Thomas', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true, activeCompanyId: true },
  });

  if (!tommy) {
    console.log('Could not find Tommy user to assign Fabrication');
    return;
  }

  const targetDepartmentId = byCompany.get(tommy.activeCompanyId || '') || fab[0]?.id || null;
  if (!targetDepartmentId) {
    console.log('No Fabrication department found to assign');
    return;
  }

  await prisma.user.update({ where: { id: tommy.id }, data: { departmentId: targetDepartmentId } });
  console.log(`Assigned ${tommy.name} (${tommy.email}) to Fabrication`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
