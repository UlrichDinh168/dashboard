import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publicRoutes = [
  '/agency/sign-in(.*)',
  '/agency/sign-up(.*)',
  '/site',
  '/api/uploadthing'
];
const isPublicRoute = createRouteMatcher(publicRoutes);


export default clerkMiddleware((auth, req) => {

  if (!isPublicRoute(req)) {

    auth().protect()
  }

  // rewrite domains
  const url = req.nextUrl;
  const searchParams = url.searchParams.toString();
  let hostname = req.headers.get('host')

  const pathWithSearchParams = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''
    }`;

  //if subdomain exists
  const customSubDomain = hostname?.split(`${process.env.NEXT_PUBLIC_DOMAIN}`).filter(Boolean)[0]

  if (customSubDomain) {
    return NextResponse.rewrite(
      new URL(`/${customSubDomain}${pathWithSearchParams}`, req.url)
    );
  }

  // redirect signin and signup paths if users navigate to these routes
  if (url.pathname === '/sign-in' || url.pathname === '/sign-up') {
    return NextResponse.redirect(new URL(`/agency/sign-in`, req.url));
  }

  // same for agency and subaccount
  if (
    url.pathname.startsWith('/agency') ||
    url.pathname.startsWith('/subaccount')
  ) {
    return NextResponse.rewrite(new URL(`${pathWithSearchParams}`, req.url))
  }
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],

};