'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserRole } from '@/types'
import { LogOut, Calendar, LayoutDashboard, CalendarCheck } from 'lucide-react'

export function Navbar() {
  const [user, setUser] = useState<{ email: string; role: UserRole } | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, first_name, last_name')
          .eq('id', authUser.id)
          .single()
        setUser({ email: authUser.email || '', role: profile?.role ?? 'CUSTOMER' })
      } else {
        setUser(null)
      }
      setLoading(false)
    }
    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?'

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[#6366F1]">Bookify</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {!loading && (
            <>
              {user ? (
                <>
                  {user.role === 'SHOP_OWNER' && (
                    <Link href="/owner/dashboard" className="hidden sm:block">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                  )}
                  {user.role === 'WORKER' && (
                    <Link href="/worker/calendar" className="hidden sm:block">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        My Calendar
                      </Button>
                    </Link>
                  )}
                  {(user.role === 'CUSTOMER' || user.role === 'SHOP_OWNER') && (
                    <Link href="/list-business" className="hidden sm:block">
                      <Button variant="outline" size="sm">
                        List your business
                      </Button>
                    </Link>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2">
                        <Avatar className="h-9 w-9 cursor-pointer">
                          <AvatarFallback className="bg-[#6366F1] text-white text-sm font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                        <p className="text-sm font-medium leading-none truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/customer/bookings" className="cursor-pointer">
                          <CalendarCheck className="mr-2 h-4 w-4" />
                          My Bookings
                        </Link>
                      </DropdownMenuItem>
                      {user.role === 'SHOP_OWNER' && (
                        <DropdownMenuItem asChild>
                          <Link href="/owner/dashboard" className="cursor-pointer">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Dashboard
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {user.role === 'WORKER' && (
                        <DropdownMenuItem asChild>
                          <Link href="/worker/calendar" className="cursor-pointer">
                            <Calendar className="mr-2 h-4 w-4" />
                            My Calendar
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(user.role === 'CUSTOMER' || user.role === 'SHOP_OWNER') && (
                        <DropdownMenuItem asChild>
                          <Link href="/list-business" className="cursor-pointer sm:hidden">
                            List your business
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Log in</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Sign up</Button>
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
