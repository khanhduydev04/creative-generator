import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-pending',
])

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  if (pathname.startsWith('/api/auth/')) return true
  if (pathname.startsWith('/auth/callback')) return true
  return false
}

function redirectTo(path: string, request: NextRequest, response: NextResponse): NextResponse {
  const url = request.nextUrl.clone()
  const [pathname, search] = path.split('?')
  url.pathname = pathname
  url.search = search ? `?${search}` : ''
  const redirectResponse = NextResponse.redirect(url)
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value)
  })
  return redirectResponse
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Auth-only login/signup pages: bounce signed-in users to /app
  if (pathname === '/login' || pathname === '/signup') {
    if (user) return redirectTo('/app', request, supabaseResponse)
    return supabaseResponse
  }

  // Other public routes (landing, password flows, /api/auth/*) pass through
  if (isPublicPath(pathname)) {
    return supabaseResponse
  }

  // /app/* requires an authenticated, email-verified user
  if (pathname.startsWith('/app')) {
    if (!user) return redirectTo('/login', request, supabaseResponse)
    if (!user.email_confirmed_at) return redirectTo('/verify-pending', request, supabaseResponse)
    return supabaseResponse
  }

  // Default: pass through (covers /api/* non-auth routes, which enforce
  // their own requireUser() check via src/lib/user-context.ts)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|brand/|api/(?!auth/)).*)',
  ],
}
