import React from "react";

interface BillItem {
  name: string;
  qty: number;
  price: number;
  notes?: string;
}

interface ExtraCharge {
  label: string;
  amount: number;
}

interface Tax {
  name: string;
  rate: number;
  taxAmount: number;
}

interface Bill {
  id: string;
  items: BillItem[];
  subtotal: number;
  amount: number;
  discount?: number;
  fine?: number;
  extras?: ExtraCharge[];
  taxes?: Tax[];
}

interface Customer {
  name?: string;
  phone?: string;
}

interface BillingComponentProps {
  bill: Bill | null;
  customer: Customer | null;
  table: { id: number } | null;
  discount: number;
  fine: number;
  setDiscount: (val: number) => void;
  setFine: (val: number) => void;
  onAddItem: () => void;
  onPay: () => void;
  onBack: () => void;
}

const BillingComponent: React.FC<BillingComponentProps> = ({
  bill,
  customer,
  table,
  discount,
  fine,
  setDiscount,
  setFine,
  onAddItem,
  onPay,
  onBack,
}) => {
  const subtotal = bill?.subtotal || 0;
  const charges = bill?.extras?.reduce((sum, c) => sum + c.amount, 0) || 0;
  const taxes = bill?.taxes?.reduce((sum, t) => sum + t.taxAmount, 0) || 0;
  const discountAmount = subtotal ? (subtotal * discount) / 100 : 0;
  const fineAmount = fine || 0;
  const totalPayable = subtotal + charges + taxes - discountAmount + fineAmount;

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800">Billing</h1>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold"
        >
          Back
        </button>
      </div>

      {/* Table & Customer Info */}
      <div className="bg-white p-4 rounded-lg shadow space-y-1">
        <p className="font-semibold text-gray-700">
          Customer: {customer?.name || "Guest"}
        </p>
        <p className="text-gray-500 text-sm">
          Phone: {customer?.phone || "N/A"}
        </p>
        <p className="text-gray-500 text-sm">Table: {table?.id || "N/A"}</p>
        <p className="text-gray-400 text-xs">Bill ID: {bill?.id.slice(-6)}</p>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow p-4 space-y-2">
        <h2 className="font-semibold text-lg">Items</h2>
        {bill?.items?.length ? (
          bill.items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between border-b border-gray-200 py-2 last:border-none"
            >
              <div>
                <p>{item.name}</p>
                {item.notes && (
                  <p className="text-xs text-gray-400">{item.notes}</p>
                )}
              </div>
              <p>
                ₹{item.price * item.qty} <span className="text-gray-500">({item.qty}×)</span>
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No items in this bill.</p>
        )}
      </div>

      {/* Extras */}
      {charges > 0 && (
        <div className="bg-white rounded-lg shadow p-4 space-y-1">
          <h2 className="font-semibold text-lg">Additional Charges</h2>
          {bill?.extras?.map((extra, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{extra.label}</span>
              <span>₹{extra.amount}</span>
            </div>
          ))}
        </div>
      )}

      {/* Taxes */}
      {taxes > 0 && (
        <div className="bg-white rounded-lg shadow p-4 space-y-1">
          <h2 className="font-semibold text-lg">Taxes</h2>
          {bill?.taxes?.map((tax, idx) => (
            <div key={idx} className="flex justify-between">
              <span>
                {tax.name} ({tax.rate}%)
              </span>
              <span>₹{tax.taxAmount}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="bg-emerald-50 rounded-lg p-4 space-y-1 shadow">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal}</span>
        </div>
        {charges > 0 && (
          <div className="flex justify-between">
            <span>Extras</span>
            <span>₹{charges}</span>
          </div>
        )}
        {taxes > 0 && (
          <div className="flex justify-between">
            <span>Taxes</span>
            <span>₹{taxes}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-₹{discountAmount}</span>
        </div>
        <div className="flex justify-between">
          <span>Fine</span>
          <span>+₹{fineAmount}</span>
        </div>
        <div className="flex justify-between font-bold text-lg mt-2">
          <span>Total Payable</span>
          <span>₹{totalPayable}</span>
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-3">
        <input
          type="number"
          className="w-full border border-gray-300 rounded p-2"
          placeholder="Add Discount in %"
          value={discount}
          min={0}
          onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
        />
        <input
          type="number"
          className="w-full border border-gray-300 rounded p-2"
          placeholder="Add Fine"
          value={fine}
          min={0}
          onChange={(e) => setFine(Number(e.target.value))}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onAddItem}
          className="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-lg font-bold"
        >
          Add Items
        </button>
        <button
          onClick={onPay}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-bold"
        >
          Pay Bill
        </button>
      </div>
    </div>
  );
};

export default BillingComponent;
