import { Toaster, toast } from "sonner";

type Props = { onSave: () => Promise<void> };

export function SaveButton({ onSave }: Props) {
  function handleSave() {
    toast.loading("Saving...");
    void onSave();
  }
  return <><Toaster /><button onClick={handleSave}>Save</button></>;
}
