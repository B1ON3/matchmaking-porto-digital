import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('populando o banco com dados de exemplo...');

  const senhaTeste = await bcrypt.hash('senha123', 10);

  const startupUser = await prisma.user.upsert({
    where: { email: 'startup@porto.digital' },
    update: {},
    create: {
      name: 'Ana Caroline',
      email: 'startup@porto.digital',
      passwordHash: senhaTeste,
      role: UserRole.STARTUP,
      startupProfile: {
        create: {
          companyName: 'Recife Tech Studio',
          sector: 'Tecnologia',
          description: 'Studio de desenvolvimento de produtos digitais para o mercado nordestino.',
          stage: 'Seed',
          city: 'Recife',
          state: 'PE',
          needs: 'Rodada seed',
        },
      },
    },
    include: { startupProfile: true },
  });

  const investidorUser = await prisma.user.upsert({
    where: { email: 'investidor@porto.digital' },
    update: {},
    create: {
      name: 'Bruno Tavares',
      email: 'investidor@porto.digital',
      passwordHash: senhaTeste,
      role: UserRole.INVESTOR,
      investorProfile: {
        create: {
          companyName: 'Nordeste Capital',
          sectorInterest: 'Tecnologia, Design',
          stageInterest: 'Seed, Pre-seed',
          ticketMin: 50000,
          ticketMax: 300000,
          city: 'Recife',
          state: 'PE',
          bio: 'Investidor anjo com foco no ecossistema criativo do Recife.',
        },
      },
    },
    include: { investorProfile: true },
  });

  await prisma.user.upsert({
    where: { email: 'admin@porto.digital' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@porto.digital',
      passwordHash: senhaTeste,
      role: UserRole.ADMIN,
    },
  });

  if (startupUser.startupProfile && investidorUser.investorProfile) {
    await prisma.match.upsert({
      where: {
        startupId_investorId: {
          startupId: startupUser.startupProfile.id,
          investorId: investidorUser.investorProfile.id,
        },
      },
      update: {},
      create: {
        startupId: startupUser.startupProfile.id,
        investorId: investidorUser.investorProfile.id,
        score: 87.5,
        reason: 'Setor e estagio compativeis, faixa de investimento cobre a rodada seed.',
      },
    });
  }

  console.log('dados de exemplo criados');
  console.log('startup@porto.digital / investidor@porto.digital / admin@porto.digital');
  console.log('senha: senha123');
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());