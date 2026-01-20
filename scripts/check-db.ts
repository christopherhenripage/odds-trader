import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.opportunity.count();
  console.log('Total opportunities:', count);

  const sample = await prisma.opportunity.findFirst();
  if (sample) {
    console.log('Sample:', sample.homeTeam, 'vs', sample.awayTeam, '- Edge:', sample.edgePct);
  } else {
    console.log('No opportunities found in database');
  }
}

main().finally(() => prisma.$disconnect());
