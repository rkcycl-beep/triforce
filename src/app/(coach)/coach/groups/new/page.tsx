"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/coach/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to create group.");
        setLoading(false);
        return;
      }
      router.push(`/coach/groups/${data.id}`);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <Link
        href="/coach"
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">Create a group</h1>
      <p className="mt-1 text-sm text-gray-600">
        Give your training group a name. A 6-character invite code will be
        generated automatically — share it with your athletes to let them join.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Input
          label="Group name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Tel Aviv Runners"
          required
          maxLength={80}
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Create group
        </Button>
      </form>
    </div>
  );
}
