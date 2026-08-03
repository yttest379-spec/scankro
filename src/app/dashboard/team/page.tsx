"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { toast } from "sonner";
import type { Plan } from "@prisma/client";

export default function TeamPage() {
  const [plan, setPlan] = useState<Plan>("free");
  const [members, setMembers] = useState<
    Array<{ id: string; role: string; user: { name: string; email: string } }>
  >([]);
  const [invites, setInvites] = useState<
    Array<{ id: string; email: string; role: string; token: string }>
  >([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [lastInviteUrl, setLastInviteUrl] = useState("");

  async function load() {
    const res = await fetch("/api/team");
    const data = await res.json();
    setPlan(data.plan || "free");
    setMembers(data.members || []);
    setInvites(data.invites || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    setLastInviteUrl(data.inviteUrl);
    toast.success("Invite created — share the link");
    setEmail("");
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-stone-500">Invite managers and staff (Pro)</p>
      </div>
      {plan !== "pro" && <UpgradeBanner plan={plan} feature="Multiple users" />}

      <form onSubmit={invite} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={plan !== "pro"}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={plan !== "pro"}
          >
            <option value="staff">Staff (availability)</option>
            <option value="manager">Manager</option>
          </Select>
        </div>
        <Button type="submit" disabled={plan !== "pro"}>
          Invite
        </Button>
      </form>

      {lastInviteUrl && (
        <p className="break-all rounded-lg bg-teal-50 p-3 text-xs text-teal-900">
          Invite link: {lastInviteUrl}
        </p>
      )}

      <div>
        <h2 className="font-medium">Members</h2>
        <ul className="mt-2 space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <span>
                {m.user.name} · {m.user.email}{" "}
                <span className="text-stone-400">({m.role})</span>
              </span>
              {m.role !== "owner" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await fetch(`/api/team?memberId=${m.id}`, { method: "DELETE" });
                    load();
                  }}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {invites.length > 0 && (
        <div>
          <h2 className="font-medium">Pending invites</h2>
          <ul className="mt-2 space-y-2">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
              >
                <span>
                  {i.email} ({i.role})
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await fetch(`/api/team?inviteId=${i.id}`, { method: "DELETE" });
                    load();
                  }}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
