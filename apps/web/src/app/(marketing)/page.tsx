import { redirect } from "next/navigation";
import { LandingPage } from "@/components/LandingPage";
import { getServerSession } from "@/lib/auth-server";

export default async function Home() {
  const session = await getServerSession();

  if (session?.user) {
    // Redirect authenticated users to HR view by default
    // TODO: Could check user preferences or last visited view
    redirect("/hr/jobs");
  }

  return <LandingPage />;
}
