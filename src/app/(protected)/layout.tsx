import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isEmailVerified } from "@/lib/db/users";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const verified = await isEmailVerified(session.user.id);
  if (!verified) {
    redirect("/verify-email/sent");
  }

  return <>{children}</>;
}
