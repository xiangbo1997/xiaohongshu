import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      phone: true,
      nickname: true,
      memberType: true,
      memberExpire: true,
      points: true,
      todayUsage: true,
      dailyFreeUsed: true,
      lastUsageDate: true,
    },
    take: 5
  })
  
  console.log('Users:', JSON.stringify(users, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
