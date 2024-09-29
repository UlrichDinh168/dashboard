import { auth } from '@clerk/nextjs/server'
import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'

const f = createUploadthing()

const authenticateUser = async () => {
  const user = auth()
  if (!user || !user.userId) throw new UploadThingError('Unauthorized')
  return { userId: user.userId }
}

// Generic upload complete handler
const handleUploadComplete = async ({ metadata, file }: { metadata: { userId: string }, file: { url: string } }) => {
  console.log("Upload complete for userId:", metadata.userId)
  console.log("File URL:", file.url)
  return { uploadedBy: metadata.userId, fileUrl: file.url }
}

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  subaccountLogo: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(authenticateUser)
    .onUploadComplete(handleUploadComplete),
  avatar: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(authenticateUser)
    .onUploadComplete(handleUploadComplete),
  agencyLogo: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(authenticateUser)
    .onUploadComplete(handleUploadComplete),
  media: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(authenticateUser)
    .onUploadComplete(handleUploadComplete),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter