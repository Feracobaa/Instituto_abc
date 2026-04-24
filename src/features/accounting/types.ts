export type PendingDeleteAction =
  | {
      kind: "tuition_payment";
      id: string;
      title: string;
      description: string;
    }
  | {
      kind: "financial_transaction";
      id: string;
      title: string;
      description: string;
    }
  | {
      kind: "inventory_item";
      id: string;
      title: string;
      description: string;
    }
  | {
      kind: "tuition_profile_reset";
      studentId: string;
      title: string;
      description: string;
    };
