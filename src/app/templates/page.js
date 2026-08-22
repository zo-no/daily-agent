/** Legacy record-structure URL; the editor now lives inside Settings. */

import { redirect } from "next/navigation";

export const metadata = {
  title: "Record setup"
};

export default async function TemplatesPage({ searchParams }) {
  const params = await searchParams;
  redirect(params?.focus === "periodic" ? "/settings?focus=periodic#record-setup" : "/settings#record-setup");
}
