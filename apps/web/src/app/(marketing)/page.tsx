import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { LandingPage } from "@/components/LandingPage";

export default async function Home() {
  const session = await getServerSession();

  if (session?.user) {
    // Redirect authenticated users to HR view by default
    // TODO: Could check user preferences or last visited view
    redirect("/hr/jobs");
  }

  return <LandingPage />;
}
