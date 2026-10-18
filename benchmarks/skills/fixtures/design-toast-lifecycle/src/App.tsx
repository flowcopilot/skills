import { Toaster } from "sonner";
import { SaveButton } from "./SaveButton";

export function App({ save }: { save: () => Promise<void> }) {
  return <><Toaster /><SaveButton onSave={save} /></>;
}
