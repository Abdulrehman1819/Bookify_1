import Link from 'next/link'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { redirect?: string }
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-sm">
        <CardHeader className="text-center">
          <Link href="/" className="text-2xl font-bold text-[#6366F1] block mb-2">Bookify</Link>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Start booking appointments in seconds</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm redirectAfter={searchParams.redirect || '/'} />
          <p className="text-sm text-center text-[#94A3B8] mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-[#6366F1] hover:underline font-medium">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
