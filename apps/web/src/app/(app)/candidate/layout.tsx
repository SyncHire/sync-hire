import { AppLayout } from "@/components/AppLayout";
import { CandidateProvider } from "@/lib/context/candidate-context";

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
