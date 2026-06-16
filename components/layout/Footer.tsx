import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t bg-[#0F172A] text-white mt-16">
      <div className="container py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <span className="text-2xl font-bold text-[#6366F1]">Bookify</span>
          <p className="text-sm text-slate-400 mt-2">Book appointments with saloons, clinics, gyms and more.</p>
        </div>
        <div>
          <h3 className="font-semibold mb-3">For Customers</h3>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/search" className="hover:text-white transition-colors">Find services</Link></li>
            <li><Link href="/customer/bookings" className="hover:text-white transition-colors">My bookings</Link></li>
            <li><Link href="/register" className="hover:text-white transition-colors">Sign up free</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3">For Businesses</h3>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/list-business" className="hover:text-white transition-colors">List your business</Link></li>
            <li><Link href="/owner/dashboard" className="hover:text-white transition-colors">Owner dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Bookify. All rights reserved.
      </div>
    </footer>
  )
}
