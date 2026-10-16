import { s } from "@ax-llm/ax";

export const ticketSignature = s(
  "ticketText:string -> priority:string, confidence:number, summary:string, assigneeEmail:string",
);
