import { redirect } from "next/navigation";
import { HRProvider } from "@/lib/context/hr-context";
import { AppLayout } from "@/components/AppLayout";
import { getValidatedSession } from "@/lib/auth-server";

export default async function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use validated session to bypass cookie cache
  // This ensures we get fresh activeOrganizationId after setActive()
  const session = await getValidatedSession();

  // Redirect to org selection if no active organization
  if (!session?.session?.activeOrganizationId) {
    redirect("/select-organization");
  }

  return (
    <HRProvider>
      <AppLayout view="hr">{children}</AppLayout>
    </HRProvider>
  );
}
