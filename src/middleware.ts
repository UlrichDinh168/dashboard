import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

//'/sign-in(.*)', '/sign-up(.*)',
// const isPublicRoute = createRouteMatcher(['/'])

const publicRoutes = [
  '/agency/sign-in(.*)',
  '/agency/sign-up(.*)',
  '/site',
  '/api/uploadthing'
];
const isPublicRoute = createRouteMatcher(publicRoutes);

// export default clerkMiddleware()

export default clerkMiddleware((auth, request) => {

  if (!isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],

};