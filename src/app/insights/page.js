/** Route entry for the local-only, account-scoped domain review. */

import "../management-header.css";
import "./insights.css";
import { InsightsPage } from "./insights-page";

export const metadata = {
  title: "Domain insights"
};

export default function InsightsRoute() {
  return <InsightsPage />;
}
