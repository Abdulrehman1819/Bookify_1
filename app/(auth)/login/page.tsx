import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string }
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-sm">
        <CardHeader className="text-center">
          <Link href="/" className="text-2xl font-bold text-[#6366F1] block mb-2">Bookify</Link>
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm redirectAfter={searchParams.redirect} />
          <p className="text-sm text-center text-[#94A3B8] mt-4">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#6366F1] hover:underline font-medium">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
