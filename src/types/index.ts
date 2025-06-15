export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Bill {
  items: BillItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  taxDistribution: 'equal' | 'proportional';
  tipDistribution: 'equal' | 'proportional';
  restaurantName?: string;
  isReceipt?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  selectedItems: string[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export interface Session {
  bill: Bill;
  selections: Record<string, string[]>; // participantId -> selectedItems
  participants: Participant[];
}