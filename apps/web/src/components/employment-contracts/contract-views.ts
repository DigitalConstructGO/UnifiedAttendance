import { FilePlus2, FileSignature, UsersRound } from "lucide-react";

export const CONTRACT_VIEWS = [
  {
    id: "list",
    label: "All contracts",
    icon: FileSignature,
    manageableOnly: false,
  },
  {
    id: "create",
    label: "Create contract",
    icon: FilePlus2,
    manageableOnly: true,
  },
  {
    id: "cosigners",
    label: "Cosigners",
    icon: UsersRound,
    manageableOnly: false,
  },
] as const;
