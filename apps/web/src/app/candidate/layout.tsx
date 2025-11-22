import { CandidateProvider } from "@/lib/context/candidate-context";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CandidateProvider>{children}</CandidateProvider>;
}
