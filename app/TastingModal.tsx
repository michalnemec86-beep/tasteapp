import TastingModalClient from "./TastingModalClient";
import { saveTastingInModal } from "./tastings/actions";

export default function TastingModal() {
  return (
    <TastingModalClient
      saveTastingAction={saveTastingInModal}
    />
  );
}
