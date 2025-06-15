import { Session, BillItem } from '@/types';

interface Participant {
  id: string;
  selectedItems: string[];
  name?: string;
}

interface PaymentBreakdown {
  subtotalOwed: number;
  taxOwed: number;
  tipOwed: number;
  totalOwed: number;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }[];
}

export function calculateItemSplit(
  item: BillItem,
  numParticipants: number
): number {
  if (numParticipants === 0) return 0;
  return (item.price * item.quantity) / numParticipants;
}

export function calculateParticipantBreakdown(
  session: Session,
  participant: Participant,
  allSelections: Record<string, string[]>
): PaymentBreakdown {
  // Calculate item totals with splits
  const items = session.bill.items
    .filter((item: BillItem) => participant.selectedItems.includes(item.id))
    .map((item: BillItem) => {
      const itemParticipants = Object.entries(allSelections)
        .filter(([_, items]) => items.includes(item.id))
        .length;
      return {
        ...item,
        total: calculateItemSplit(item, itemParticipants)
      };
    });

  // Calculate subtotal
  const subtotalOwed = items.reduce((sum: number, item) => sum + item.total, 0);

  // Calculate tax and tip based on distribution method
  const taxOwed = calculateTaxOwed(session, subtotalOwed);
  const tipOwed = calculateTipOwed(session, subtotalOwed);

  // Calculate total
  const totalOwed = subtotalOwed + taxOwed + tipOwed;

  return {
    subtotalOwed,
    taxOwed,
    tipOwed,
    totalOwed,
    items
  };
}

export function calculateSubtotalOwed(session: Session, selectedItems: string[]): number {
  return session.bill.items
    .filter((item: BillItem) => selectedItems.includes(item.id))
    .reduce((sum: number, item: BillItem) => sum + (item.price * item.quantity), 0);
}

export function calculateTaxOwed(session: Session, subtotalOwed: number): number {
  if (session.bill.taxDistribution === 'equal') {
    return session.bill.tax / Object.keys(session.selections).length;
  } else {
    // Proportional distribution based on subtotal
    return (subtotalOwed / session.bill.subtotal) * session.bill.tax;
  }
}

export function calculateTipOwed(session: Session, subtotalOwed: number): number {
  if (session.bill.tipDistribution === 'equal') {
    return session.bill.tip / Object.keys(session.selections).length;
  } else {
    // Proportional distribution based on subtotal
    return (subtotalOwed / session.bill.subtotal) * session.bill.tip;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function generateCSV(session: Session): string {
  const headers = ['Participant ID', 'Subtotal', 'Tax', 'Tip', 'Total'];
  const rows = Object.entries(session.selections).map(([participantId, selectedItems]) => {
    const breakdown = calculateParticipantBreakdown(session, { id: participantId, selectedItems }, session.selections);
    return [
      participantId,
      breakdown.subtotalOwed.toFixed(2),
      breakdown.taxOwed.toFixed(2),
      breakdown.tipOwed.toFixed(2),
      breakdown.totalOwed.toFixed(2)
    ];
  });

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
} 