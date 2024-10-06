"use server"
import { redirect } from 'next/navigation'

import { clerkClient, currentUser } from "@clerk/nextjs/server"
import { db } from "./db"
import { Agency, Plan, User } from '@prisma/client'

export const getAuthUserDetails = async () => {
  const user = await currentUser()
  if (!user) return

  const userData = await db.user.findUnique({
    where: {
      email: user.emailAddresses[0].emailAddress
    },
    include: {
      Agency: {
        include: {
          SidebarOption: true,
          SubAccount: {
            include: {
              SidebarOption: true
            }
          }
        }
      },
      Permissions: true
    }
  })

  return userData
}

// Helper function to create a notification
const createNotification = async ({
  userId,
  agencyId,
  description,
  subaccountId,
  userName,
}: {
  userId: string;
  agencyId: string;
  description: string;
  subaccountId?: string;
  userName: string;
}) => {
  const notificationData: any = {
    notification: `${userName} | ${description}`,
    User: { connect: { id: userId } },
    Agency: { connect: { id: agencyId } },
  };

  // Add subaccount if it exists
  if (subaccountId) {
    notificationData.SubAccount = { connect: { id: subaccountId } };
  }

  await db.notification.create({ data: notificationData });
};

export const saveActivityLogsNotification = async ({
  agencyId,
  description,
  subaccountId,
}: {
  agencyId?: string;
  description: string;
  subaccountId?: string;
}) => {
  // Validate required inputs early on
  if (!description || !subaccountId) {
    throw new Error('Description and subaccountId are required.');
  }

  // Fetch current user or user by subaccountId
  const authUser = await currentUser();
  let userData = null;

  if (authUser) {
    // Try to find the user by email if authenticated
    userData = await db.user.findUnique({
      where: { email: authUser?.emailAddresses[0].emailAddress },
    });
  } else {
    // If no authenticated user, find user associated with subaccountId
    userData = await db.user.findFirst({
      where: {
        Agency: {
          SubAccount: {
            some: { id: subaccountId },
          },
        },
      },
    });
  }

  // Handle case where user is not found
  if (!userData) {
    console.error('Could not find a user.');
    return;
  }

  // Get agencyId if not provided
  let foundAgencyId = agencyId;
  if (!foundAgencyId) {
    const subAccount = await db.subAccount.findUnique({
      where: { id: subaccountId },
    });
    if (!subAccount) {
      throw new Error(`SubAccount with ID ${subaccountId} not found.`);
    }
    foundAgencyId = subAccount.agencyId;
  }

  // Create notification in the database
  await createNotification({
    userId: userData.id,
    agencyId: foundAgencyId,
    description,
    subaccountId,
    userName: userData.name,
  });
};



export const createTeamUser = async (agencyId: string, user: User) => {
  if (user.role === 'AGENCY_OWNER') return null

  const response = await db.user.create({ data: { ...user } })
  return response

};


export const verifyAndAcceptInvitation = async () => {
  try {
    const user = await currentUser();

    if (!user) return redirect('/sign-in');

    const { emailAddresses, id: userId, firstName, lastName, imageUrl } = user;
    const userEmail = emailAddresses?.[0]?.emailAddress;
    if (!userEmail) throw new Error('User email is missing.');

    // Check for pending invitation
    const invitation = await db.invitation.findUnique({
      where: {
        email: userEmail,
        status: 'PENDING',
      },
    });


    if (invitation) {
      const { agencyId, role, email } = invitation;

      // Create team user
      const now = new Date();
      const userDetails = await createTeamUser(agencyId, {
        email,
        agencyId,
        avatarUrl: imageUrl,
        id: userId,
        name: `${firstName} ${lastName}`,
        role,
        createdAt: now,
        updatedAt: now,
      });

      // Save activity logs
      await saveActivityLogsNotification({
        agencyId,
        description: 'Joined',
        subaccountId: undefined,
      });

      if (userDetails) {
        // Update Clerk metadata with role
        await clerkClient.users.updateUserMetadata(userId, {
          privateMetadata: {
            role: userDetails.role || 'SUBACCOUNT_USER',
          },
        });

        // Remove the processed invitation
        await db.invitation.delete({
          where: { email: userDetails.email },
        });

        return userDetails.agencyId;
      }
      return null;
    }

    // If no invitation exists, find the agency directly
    const existingAgencyUser = await db.user.findUnique({
      where: {
        email: userEmail,
      },
    });

    return existingAgencyUser ? existingAgencyUser.agencyId : null;
  } catch (error) {
    console.error('Error in verifyAndAcceptInvitation:', error);
    return null;
  }
};


export const upsertAgency = async (agency: Agency, price?: Plan) => {
  if (!agency.companyEmail) return null
  try {
    const agencyDetails = await db.agency.upsert({
      where: {
        id: agency.id,
      },
      update: agency,
      create: {
        users: {
          connect: { email: agency.companyEmail },
        },
        ...agency,
        SidebarOption: {
          create: [
            {
              name: 'Dashboard',
              icon: 'category',
              link: `/agency/${agency.id}`,
            },
            {
              name: 'Launchpad',
              icon: 'clipboardIcon',
              link: `/agency/${agency.id}/launchpad`,
            },
            {
              name: 'Billing',
              icon: 'payment',
              link: `/agency/${agency.id}/billing`,
            },
            {
              name: 'Settings',
              icon: 'settings',
              link: `/agency/${agency.id}/settings`,
            },
            {
              name: 'Sub Accounts',
              icon: 'person',
              link: `/agency/${agency.id}/all-subaccounts`,
            },
            {
              name: 'Team',
              icon: 'shield',
              link: `/agency/${agency.id}/team`,
            },
          ],
        },
      },
    })
    return agencyDetails
  } catch (error) {
    console.log(error)
  }
}


export const initUser = async (newUser: Partial<User>) => {
  const user = await currentUser()
  if (!user) return

  const userData = await db.user.upsert({
    where: {
      email: user.emailAddresses[0].emailAddress,
    },
    update: newUser,
    create: {
      id: user.id,
      avatarUrl: user.imageUrl,
      email: user.emailAddresses[0].emailAddress,
      name: `${user.firstName} ${user.lastName}`,
      role: newUser.role || 'SUBACCOUNT_USER',
    },
  })

  await clerkClient.users.updateUserMetadata(user.id, {
    privateMetadata: {
      role: newUser.role || 'SUBACCOUNT_USER',
    },
  })

  return userData
}

export const deleteAgency = async (agencyId: string) => {
  const response = await db.agency.delete({ where: { id: agencyId } })
  return response
}

export const updateAgencyDetails = async (
  agencyId: string,
  agencyDetails: Partial<Agency>
) => {
  const response = await db.agency.update({
    where: { id: agencyId },
    data: { ...agencyDetails },
  })
  return response
}
