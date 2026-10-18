import { ax, type AxAIService } from "@ax-llm/ax";

const draft = ax("question:string -> answer:string");

export function scoreAnswer(answer: string): number {
  return answer.includes("https://") ? 1 : 0.25;
}

export async function selectAnswer(llm: AxAIService, question: string) {
  const result = await draft.forward(llm, { question });
  return result.answer;
}
