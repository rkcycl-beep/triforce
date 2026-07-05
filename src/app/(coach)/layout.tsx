import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import CoachShell from "@/components/layout/CoachShell";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const role = cookieStore.get("triforce_role")?.value;
  if (role !== "coach") {
    redirect("/gate");
  }

  return <CoachShell>{children}</CoachShell>;
}
