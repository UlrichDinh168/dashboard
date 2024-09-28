// import { currentUser } from '@clerk/nextjs/server'
// import { redirect } from 'next/navigation'
import { getAuthUserDetails, verifyAndAcceptInvitation } from '@/lib/queries'
import React from 'react'

type Props = {}

const Page = async (props: Props) => {
  // const authUser = await currentUser()
  // if (!authUser) return redirect('/sign-in')

  const user = getAuthUserDetails()

  // users were sent an invitation
  const agencyId = await verifyAndAcceptInvitation()
  return (
    <div>Agency</div>
  )
}

export default Page