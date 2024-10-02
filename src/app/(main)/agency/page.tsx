// import { currentUser } from '@clerk/nextjs/server'
// import { redirect } from 'next/navigation'
import AgencyDetails from '@/components/forms/agency-details'
import { getAuthUserDetails, verifyAndAcceptInvitation } from '@/lib/queries'
import { currentUser } from '@clerk/nextjs/server'
import { Plan } from '@prisma/client'
import { redirect } from 'next/navigation'
import React from 'react'

type SearchParams = {
  plan?: Plan;
  state?: string;
  code?: string;
};
const Page = async ({ searchParams }: { searchParams: SearchParams }) => {
  console.log(searchParams, 'searchpParams');

  const user = await getAuthUserDetails()

  // users were sent an invitation
  const agencyId = await verifyAndAcceptInvitation()
  console.log(agencyId, 'agencyId');

  if (agencyId) {
    console.log(agencyId, 'agencyId');

    const userRole = user?.role;
    console.log(userRole, 'userRole');

    // Redirect subaccount users
    if (userRole === 'SUBACCOUNT_GUEST' || userRole === 'SUBACCOUNT_USER') {
      return redirect('/subaccount');
    }

    // Redirect agency users
    if (userRole === 'AGENCY_OWNER' || userRole === 'AGENCY_ADMIN') {
      console.log(searchParams.plan, searchParams.state, 'searchParams');

      if (searchParams.plan) {
        // Redirect to billing if the 'plan' parameter exists
        return redirect(`/agency/${agencyId}/billing?plan=${searchParams.plan}`);
      }

      if (searchParams.state) {
        const [statePath, stateAgencyId] = searchParams.state.split('___');

        // Validate stateAgencyId before proceeding
        if (!stateAgencyId) {
          return <div>Authorization failed: Missing agency ID in state parameter.</div>;
        }

        return redirect(
          `/agency/${stateAgencyId}/${statePath}?code=${searchParams.code}`
        );
      }

      // Default redirect for agency users if no 'plan' or 'state' parameters
      return redirect(`/agency/${agencyId}`);
    }

    // Fallback for unauthorized users
    return <div>Access denied: You do not have permission to view this page.</div>;
  }

  const authUser = await currentUser()
  console.log(authUser, 'authUser');


  return (
    <div className="flex justify-center items-center mt-4">
      <div className="max-w-[850px] border-[1px] p-4 rounded-xl">
        <h1 className="text-4xl"> Create An Agency</h1>
        <AgencyDetails
          data={{ companyEmail: authUser?.emailAddresses[0].emailAddress }}
        />
      </div>
    </div>
  )
}

export default Page