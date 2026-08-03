"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { toast } from "sonner";

export default function InvitePage() {
  const params = useParams();
  const token = String(params.token);
  const router = useRouter();
  const [info, setInfo] = useState<{
    email: string;
    role: string;
    organizationName: string;
  } | null>(null);
  const [error, setError] = useState("");
  const session = authClient.useSession();

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Invalid invite");
          return;
        }
        setInfo(d);
      });
  }, [token]);

  async function accept() {
    const res = await fetch(`/api/invite/${token}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success("Joined organization");
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Team invite</h1>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {info && (
          <div className="mt-4 space-y-3 text-sm">
            <p>
              Join <strong>{info.organizationName}</strong> as{" "}
              <strong>{info.role}</strong>
            </p>
            <p className="text-stone-500">Invite for {info.email}</p>
            {!session.data ? (
              <div className="flex gap-2">
                <Link href={`/login`}>
                  <Button>Log in</Button>
                </Link>
                <Link href={`/signup`}>
                  <Button variant="outline">Sign up</Button>
                </Link>
              </div>
            ) : (
              <Button onClick={accept}>Accept invite</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
