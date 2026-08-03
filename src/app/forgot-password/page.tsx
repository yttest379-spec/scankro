import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-stone-600">
          <p>
            Password reset is available when Resend is configured (`RESEND_API_KEY`).
            Until then, create a new account or contact support.
          </p>
          <Link href="/login" className="font-medium text-teal-700 underline">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
