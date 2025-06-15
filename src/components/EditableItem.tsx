import { useState } from 'react';
import { BillItem } from '@/types';

interface EditableItemProps {
  item: BillItem;
  onUpdate: (updatedItem: BillItem) => void;
  onDelete: () => void;
}

export default function EditableItem({ item, onUpdate, onDelete }: EditableItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedPrice, setEditedPrice] = useState(item.price.toString());
  const [editedQuantity, setEditedQuantity] = useState(item.quantity.toString());

  const handleSave = () => {
    const updatedItem: BillItem = {
      ...item,
      name: editedName,
      price: parseFloat(editedPrice) || 0,
      quantity: parseInt(editedQuantity) || 1
    };
    onUpdate(updatedItem);
    setIsEditing(false);
  };

  const total = (item.price * item.quantity).toFixed(2);

  if (isEditing) {
    return (
      <div className="flex items-center gap-4 p-2 bg-gray-50 rounded-lg">
        <input
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md"
          placeholder="Item name"
        />
        <input
          type="number"
          value={editedPrice}
          onChange={(e) => setEditedPrice(e.target.value)}
          className="w-24 px-3 py-2 border rounded-md"
          placeholder="Price"
          step="0.01"
          min="0"
        />
        <input
          type="number"
          value={editedQuantity}
          onChange={(e) => setEditedQuantity(e.target.value)}
          className="w-20 px-3 py-2 border rounded-md"
          placeholder="Qty"
          min="1"
        />
        <button
          onClick={handleSave}
          className="px-3 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-500"
        >
          Save
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="px-3 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group">
      <div className="flex-1">
        <span className="font-medium">{item.name}</span>
        <span className="text-sm text-gray-500 ml-2">× {item.quantity}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-medium">${total}</span>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
} 