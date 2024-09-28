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
  const url = req.nextUrl;
  const searchParams = url.searchParams.toString();
  const hostname = req.headers.get('host') ?? '';
  const pathWithSearchParams = `${url.pathname}${searchParams ? `?${searchParams}` : ''}`;

  // Protect non-public routes
  if (!isPublicRoute(req)) {
    auth().protect();
  }

  // Handle subdomain-based rewriting
  const mainDomain = process.env.NEXT_PUBLIC_DOMAIN;
  if (!mainDomain) {
    throw new Error("NEXT_PUBLIC_DOMAIN is not defined.");
  }

  const customSubDomain = hostname.split(mainDomain).filter(Boolean)[0];
  if (customSubDomain) {
    return NextResponse.rewrite(
      new URL(`/${customSubDomain}${pathWithSearchParams}`, req.url)
    );
  }

  // Redirect sign-in/sign-up paths to agency-specific routes
  if (['/sign-in', '/sign-up'].includes(url.pathname)) {
    return NextResponse.redirect(new URL('/agency/sign-in', req.url));
  }

  // Handle homepage or /site route for the primary domain
  if (
    url.pathname === '/' ||
    (url.pathname === '/site' && hostname === process.env.NEXT_PUBLIC_DOMAIN)
  ) {
    return NextResponse.rewrite(new URL('/site', req.url));
  }

  // Rewrite for agency and subaccount routes
  if (url.pathname.startsWith('/agency') || url.pathname.startsWith('/subaccount')) {
    return NextResponse.rewrite(new URL(pathWithSearchParams, req.url));
  }

  return NextResponse.next(); // Default response for all other cases


})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],

};