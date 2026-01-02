"use server"

import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { z } from 'zod'

const changeOrderStatusSchema = z.object({
  id: z.string().min(1),
  newStatus: z.enum(['fulfilled', 'shipped', 'awaiting_shipment']),
})

export const changeOrderStatus = async ({
  id,
  newStatus,
}: {
  id: string
  newStatus: z.infer<typeof changeOrderStatusSchema>['newStatus']
}) => {
  const { getUser } = getKindeServerSession()
  const user = await getUser()

  if (!user?.email) {
    throw new Error('You must be logged in')
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL
  if (user.email !== ADMIN_EMAIL) {
    throw new Error('Unauthorized: Admin access required')
  }

  const validatedData = changeOrderStatusSchema.parse({ id, newStatus })

  await db.order.update({
    where: { id: validatedData.id },
    data: { status: validatedData.newStatus },
  })
}
