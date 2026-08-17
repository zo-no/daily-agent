"use client";

/** Route entry for the isolated, local-only smart organize workspace. */

import { OrganizeWorkspace } from "./organize-workspace";
import "../date-disclosure.css";
import "../home-calendar.css";
import "../management-header.css";
import "./organize.css";

export default function OrganizePage() {
  return <OrganizeWorkspace />;
}
