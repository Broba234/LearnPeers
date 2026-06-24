import type { Metadata } from "next";
import { getPublishedDoc } from "@/lib/legal";
import LegalDocView from "@/components/legal/LegalDocView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms of Service · LearnPeers",
  description: "The terms governing your use of the LearnPeers platform.",
};

export default async function TermsPage() {
  const doc = await getPublishedDoc("terms_of_service");
  return <LegalDocView doc={doc} otherHref="/legal/privacy" otherLabel="Privacy Policy" />;
}
