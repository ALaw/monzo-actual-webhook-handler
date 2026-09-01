export interface MonzoTransaction {
  id: string;
  account_id: string;
  created: string;
  updated: string;
  amount: number;
  description: string;
  settled: string;
  decline_reason?: string;
  include_in_spending?: boolean;
  merchant?: { name?: string | null } | string | null;
  counterparty?: { name?: string | null } | null;
}

export interface ActualTransaction {
  date: string;
  amount: number;
  payee_name: string;
  notes: string;
  imported_id: string;
  cleared: boolean;
}
