const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
  const tokens = await prisma.kommoToken.findMany();
  
  for (const token of tokens) {
    console.log('Updating token:', token.id);
    await prisma.kommoToken.update({
      where: { id: token.id },
      data: {
        apiDomain: 'worldwideservices.kommo.com'
      }
    });
    console.log('✅ Updated apiDomain to worldwideservices.kommo.com');
  }
  
  await prisma.$disconnect();
}

update();
