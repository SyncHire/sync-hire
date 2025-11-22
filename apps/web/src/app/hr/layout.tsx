import { HRProvider } from "@/lib/context/hr-context";

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return <HRProvider>{children}</HRProvider>;
}
