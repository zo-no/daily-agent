/**
 * @fileoverview Adapts the report download contract to the Next.js route handler boundary.
 */

import { getReportDownload, postReportDownload } from "../../../../lib/report-route.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  return postReportDownload(request);
}

export function GET() {
  return getReportDownload();
}
