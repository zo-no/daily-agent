/** Legacy record-structure URL; the editor now lives inside Settings. */

import { redirect } from "next/navigation";

export const metadata = {
  title: "Record setup"
};

export default function TemplatesPage() {
  redirect("/settings#record-setup");
}
