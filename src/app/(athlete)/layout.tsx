import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Shell from "@/components/layout/Shell";

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const role = cookieStore.get("triforce_role")?.value;
  if (role !== "athlete") {
    redirect("/gate");
  }

  return <Shell>{children}</Shell>;
}
