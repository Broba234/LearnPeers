import type { Metadata } from "next";
import { getPublishedDoc } from "@/lib/legal";
import LegalDocView from "@/components/legal/LegalDocView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy · LearnPeers",
  description: "How LearnPeers collects, uses, and protects your information.",
};

export default async function PrivacyPage() {
  const doc = await getPublishedDoc("privacy_policy");
  return <LegalDocView doc={doc} otherHref="/legal/terms" otherLabel="Terms of Service" />;
}
