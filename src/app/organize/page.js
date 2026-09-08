"use client";

/** Route entry for the isolated, local-only smart organize workspace. */

import { OrganizeWorkspace } from "./organize-workspace";
import "../_components/date-disclosure.css";
import "../_components/home-calendar.css";
import "../_components/management-header.css";
import "./organize.css";

export default function OrganizePage() {
  return <OrganizeWorkspace />;
}
