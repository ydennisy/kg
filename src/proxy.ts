import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Sends anyone without a session cookie to the sign-in page. Optimistic only —
 * it checks a cookie exists, not that it is valid. `requireUser()` does the
 * real check next to the data.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything but the sign-in page, Better Auth's own routes and static files.
  matcher: ['/((?!sign-in|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
