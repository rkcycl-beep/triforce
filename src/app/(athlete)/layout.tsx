import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Shell from "@/components/layout/Shell";

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/");
  }
  return <Shell>{children}</Shell>;
}
