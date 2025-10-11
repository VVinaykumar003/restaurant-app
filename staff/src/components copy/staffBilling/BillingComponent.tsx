import React from "react";

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
    <div className="min-h-screen bg-gray-50 p-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-lg p-5">
        <button
            onClick={onBack}
            className="flex items-center gap-1 sm:gap-2 text-white hover:text-black transition-colors group"
          >
            <span className="text-xl sm:text-2xl group-hover:-translate-x-1 transition-transform">⬅</span>
            <span className="font-medium text-sm sm:text-base">Back </span>
          </button>

        <h1 className="text-2xl font-bold text-white tracking-wide">Billing</h1>
       
      </div>

      {/* Table & Customer Info */}
      <section className="bg-white p-6 rounded-xl shadow-md space-y-2">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Customer & Table Info</h2>
        <p className="font-semibold text-gray-700">
          Customer:{" "}
          <span className="font-normal text-gray-600">{customer?.name || "Guest"}</span>
        </p>
        <p className="text-gray-600 text-sm">
          Phone: <span className="text-gray-500">{customer?.phone || "N/A"}</span>
        </p>
        <p className="text-gray-600 text-sm">
          Table: <span className="text-gray-500">{table?.id || "N/A"}</span>
        </p>
        <p className="text-gray-400 text-xs">Bill ID: {bill?.id.slice(-6)}</p>
      </section>

      {/* Items List */}
      <section className="bg-white rounded-xl shadow-md p-6 space-y-3">
        <h2 className="font-semibold text-xl mb-4 border-b border-gray-200 pb-1">Items</h2>
        {bill?.items?.length ? (
          bill.items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between border-b border-gray-200 py-3 last:border-none items-center"
            >
              <div>
                <p className="font-medium text-gray-800">{item.name}</p>
                {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
              </div>
              <p className="text-gray-700 font-semibold">
                ₹{item.price * item.qty}{" "}
                <span className="text-gray-500 font-normal">({item.qty}×)</span>
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-400 italic">No items in this bill.</p>
        )}
      </section>

      {/* Extras */}
      {charges > 0 && (
        <section className="bg-white rounded-xl shadow-md p-6 space-y-2">
          <h2 className="font-semibold text-xl mb-3 border-b border-gray-200 pb-1">
            Additional Charges
          </h2>
          {bill?.extras?.map((extra, idx) => (
            <div key={idx} className="flex justify-between text-gray-700 font-medium">
              <span>{extra.label}</span>
              <span>₹{extra.amount}</span>
            </div>
          ))}
        </section>
      )}

      {/* Taxes */}
      {taxes > 0 && (
        <section className="bg-white rounded-xl shadow-md p-6 space-y-2">
          <h2 className="font-semibold text-xl mb-3 border-b border-gray-200 pb-1">Taxes</h2>
          {bill?.taxes?.map((tax, idx) => (
            <div key={idx} className="flex justify-between text-gray-700 font-medium">
              <span>
                {tax.name} <span className="text-gray-500">({tax.rate}%)</span>
              </span>
              <span>₹{tax.taxAmount}</span>
            </div>
          ))}
        </section>
      )}

      {/* Summary */}
      <section className="bg-emerald-50 rounded-xl p-6 shadow-md space-y-3 text-gray-800">
        <h2 className="font-semibold text-2xl border-b border-emerald-200 pb-2 mb-4">
          Summary
        </h2>
        <div className="flex justify-between text-lg">
          <span>Subtotal</span>
          <span>₹{subtotal}</span>
        </div>
        {charges > 0 && (
          <div className="flex justify-between text-lg">
            <span>Extras</span>
            <span>₹{charges}</span>
          </div>
        )}
        {taxes > 0 && (
          <div className="flex justify-between text-lg">
            <span>Taxes</span>
            <span>₹{taxes}</span>
          </div>
        )}
        <div className="flex justify-between text-lg text-emerald-700">
          <span>Discount</span>
          <span>-₹{discountAmount}</span>
        </div>
        <div className="flex justify-between text-lg text-red-600">
          <span>Fine</span>
          <span>+₹{fineAmount}</span>
        </div>
        <div className="flex justify-between font-bold text-3xl mt-6">
          <span>Total Payable</span>
          <span>₹{totalPayable}</span>
        </div>
      </section>

      {/* Inputs */}
      <div className="space-y-4 max-w-md mx-auto">
        <input
          type="number"
          placeholder="Add Discount in %"
          value={discount}
          min={0}
          onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
        />
        <input
          type="number"
          placeholder="Add Fine"
          value={fine}
          min={0}
          onChange={(e) => setFine(Number(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-6 max-w-md mx-auto">
        <button
          onClick={onAddItem}
          className="flex-1 bg-gray-300 hover:bg-gray-400 py-3 rounded-lg font-semibold transition shadow"
        >
          Add Items
        </button>
        <button
          onClick={onPay}
          type="button"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold transition shadow"
        >
          Pay Bill
        </button>
      </div>
    </div>
  );
};

export default BillingComponent;
