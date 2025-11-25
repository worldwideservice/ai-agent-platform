const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTokenDomain() {
  try {
    // Get all tokens
    const tokens = await prisma.kommoToken.findMany();
    console.log('📋 Found tokens:', tokens.length);

    for (const token of tokens) {
      console.log('\n🔍 Processing token:', {
        id: token.id,
        integrationId: token.integrationId,
        baseDomain: token.baseDomain,
        apiDomain: token.apiDomain,
      });

      // Update apiDomain to use baseDomain if it's api-g.kommo.com or kommo.com
      if (token.apiDomain === 'api-g.kommo.com' || token.apiDomain === 'kommo.com' || token.baseDomain === 'kommo.com') {
        const newApiDomain = 'worldwideservices.kommo.com';

        console.log('🔧 Updating token:', {
          from: token.apiDomain,
          to: newApiDomain,
        });

        await prisma.kommoToken.update({
          where: { id: token.id },
          data: {
            apiDomain: newApiDomain,
            baseDomain: 'worldwideservices.kommo.com', // Also update baseDomain
          },
        });

        console.log('✅ Updated successfully');
      } else {
        console.log('⏭️  No update needed');
      }
    }

    console.log('\n🎉 All tokens updated!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTokenDomain();
