import { Bill, Participant } from '@/types';
import { formatCurrency } from '@/lib/calculations';

interface PaymentBreakdownProps {
  bill: Bill;
  participant: Participant;
  isCurrentUser?: boolean;
  allSelections: Record<string, string[]>;
}

export default function PaymentBreakdown({
  bill,
  participant,
  isCurrentUser = false,
  allSelections
}: PaymentBreakdownProps) {
  const getItemParticipants = (itemId: string) => {
    return Object.values(allSelections).filter(items => items.includes(itemId)).length;
  };

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${isCurrentUser ? 'ring-2 ring-indigo-500' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {participant.name}
          {isCurrentUser && <span className="ml-2 text-sm text-indigo-600">(You)</span>}
        </h3>
      </div>

      {/* Items Breakdown */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Items</h4>
        <ul className="space-y-1">
          {bill.items
            .filter(item => participant.selectedItems.includes(item.id))
            .map(item => {
              const numParticipants = getItemParticipants(item.id);
              const itemTotal = item.price * item.quantity;
              const splitAmount = itemTotal / numParticipants;
              return (
                <li key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatCurrency(splitAmount)}</span>
                </li>
              );
            })}
        </ul>
      </div>

      {/* Totals */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatCurrency(participant.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tax ({bill.taxDistribution})</span>
          <span>{formatCurrency(participant.tax)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Tip ({bill.tipDistribution})</span>
          <span>{formatCurrency(participant.tip)}</span>
        </div>
        <div className="flex justify-between font-medium text-base border-t pt-2 mt-2">
          <span>Total</span>
          <span>{formatCurrency(participant.total)}</span>
        </div>
      </div>
    </div>
  );
} 