import { createTool } from "@mastra/core/tools";
import {
  searchRecordsInputSchema,
  searchRecordsOutputSchema,
  searchRecords
} from "../../../modules/agent-bridge/read-only-query.mjs";

export const SEARCH_RECORDS_TOOL_ID = "search-records";

export const searchRecordsTool = createTool({
  id: SEARCH_RECORDS_TOOL_ID,
  description: "Search the user's existing records when they ask what they wrote before or need a date-bounded factual lookup. Read-only: never invent matches or change records.",
  inputSchema: searchRecordsInputSchema,
  outputSchema: searchRecordsOutputSchema,
  execute: async (input, context) => {
    if (context?.abortSignal?.aborted) throw new DOMException("Record search was aborted", "AbortError");
    const adapter = context?.requestContext?.get?.("logNoteReadOnlyAdapter") || context?.logNoteReadOnlyAdapter;
    return searchRecords(input, adapter);
  }
});
