import { CandidateProvider } from "@/lib/context/candidate-context";
import { AppLayout } from "@/components/AppLayout";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CandidateProvider>
      <AppLayout view="candidate">{children}</AppLayout>
    </CandidateProvider>
  );
}
