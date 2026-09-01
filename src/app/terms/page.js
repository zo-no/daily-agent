import { PUBLIC_POLICY_DOCUMENTS } from "@/lib/public-policies.mjs";
import { PublicPageShell } from "../public-page-shell";

const document = PUBLIC_POLICY_DOCUMENTS.terms;

export const metadata = {
  title: document.title.en,
  description: document.description.en
};

export default function TermsPage() {
  return <PublicPageShell document={document} />;
}
