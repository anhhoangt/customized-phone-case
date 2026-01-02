'use server'

import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { z } from 'zod'

const saveConfigSchema = z.object({
  color: z.enum(['black', 'blue', 'rose', 'yellow']),
  finish: z.enum(['smooth', 'textured']),
  material: z.enum(['silicone', 'polycarbonate']),
  model: z.enum(['iphonex', 'iphone11', 'iphone12', 'iphone13', 'iphone14', 'iphone15']),
  configId: z.string().min(1),
})

export type SaveConfigArgs = z.infer<typeof saveConfigSchema>

export async function saveConfig(args: SaveConfigArgs) {
  const { getUser } = getKindeServerSession()
  const user = await getUser()

  if (!user?.id) {
    throw new Error('You must be logged in to save configuration')
  }

  const validatedArgs = saveConfigSchema.parse(args)
  const { color, finish, material, model, configId } = validatedArgs

  const configuration = await db.configuration.findUnique({
    where: { id: configId },
  })

  if (!configuration) {
    throw new Error('Configuration not found')
  }

  if (configuration.userId && configuration.userId !== user.id) {
    throw new Error('You do not have permission to modify this configuration')
  }

  await db.configuration.update({
    where: { id: configId },
    data: { color, finish, material, model, userId: user.id },
  })
}
