/**
 * @fileoverview Exposes the statically rendered local data-management route.
 */

import "../management-header.css";
import "./settings.css";
import "./_components/record-setup/record-setup.css";
import "./_components/agent-bridge/agent-bridge-panel.css";
import { SettingsPage } from "./settings-page";

export const metadata = {
  title: "Settings"
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
