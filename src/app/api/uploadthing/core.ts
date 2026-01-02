import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { z } from 'zod'
import sharp from 'sharp'
import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'

const f = createUploadthing()

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: '4MB' } })
    .input(z.object({ configId: z.string().optional() }))
    .middleware(async ({ input }) => {
      const { getUser } = getKindeServerSession()
      const user = await getUser()

      if (!user?.id) {
        throw new Error('You must be logged in to upload images')
      }

      return { input, userId: user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const { configId } = metadata.input
      const { userId } = metadata

      const res = await fetch(file.url)
      const buffer = await res.arrayBuffer()

      const imgMetadata = await sharp(buffer).metadata()
      const { width, height } = imgMetadata

      if (!configId) {
        const configuration = await db.configuration.create({
          data: {
            imageUrl: file.url,
            height: height || 500,
            width: width || 500,
            userId: userId,
          },
        })

        return { configId: configuration.id }
      } else {
        const existingConfig = await db.configuration.findUnique({
          where: { id: configId },
        })

        if (existingConfig && existingConfig.userId && existingConfig.userId !== userId) {
          throw new Error('You do not have permission to modify this configuration')
        }

        const updatedConfiguration = await db.configuration.update({
          where: {
            id: configId,
          },
          data: {
            croppedImageUrl: file.url,
            userId: userId,
          },
        })

        return { configId: updatedConfiguration.id }
      }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
