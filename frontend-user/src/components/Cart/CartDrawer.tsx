import React, { useState } from "react";
import { useCart } from "../../stores/cart.store";
import { createOrder } from "../../api/order.api";
import { useTableFromUrl } from "../../hooks/useTable";
import { useNavigate } from "react-router-dom";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function CartDrawer() {
  const [expanded, setExpanded] = useState(false);

  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal)();
  const remove = useCart((s) => s.remove);
  const updateQty = useCart((s) => s.updateQty);
  const clear = useCart((s) => s.clear);
  const { tableId, sessionId } = useTableFromUrl();
  const navigate = useNavigate();
  const rid = import.meta.env.VITE_RID || "restro10";

  const placeOrder = async () => {
    if (!tableId) {
      alert("Please select a table first.");
      return;
    }
    const payload = {
      tableId,
      sessionId,
      items: items.map((i) => ({
        menuItemId: i.itemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
    };
    try {
      const res = await createOrder(rid, payload);
      const orderId = res?._id || res?.id || res?.orderId;
      clear();
      if (orderId) {
        navigate(`/order/${orderId}`);
      } else {
        alert("Order placed — but no order id returned.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to place order: " + (err?.message || "unknown"));
    }
  };

  // Collapsed state (like Zomato bottom bar)
  if (!expanded) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md border-t px-4 py-3 flex items-center justify-between md:hidden">
        <div>
          <div className="font-semibold text-gray-900">
            ₹{subtotal.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500">
            {items.length} item{items.length !== 1 && "s"}
          </div>
        </div>
        <button
          onClick={() => setExpanded(true)}
          className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"
        >
          View Cart
        </button>
      </div>
    );
  }

  // Expanded Drawer
  return (
    <aside className="fixed inset-x-0 bottom-0 max-h-[80vh] bg-white rounded-t-2xl shadow-lg p-4 overflow-auto md:w-96 md:right-4 md:bottom-4 md:rounded-xl md:inset-x-auto">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold">Your Cart</h4>
        <button onClick={() => setExpanded(false)} className="text-gray-500">
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      <div className="divide-y divide-gray-100 max-h-56 overflow-auto mb-3">
        {items.length === 0 && (
          <div className="text-sm text-gray-500">Cart empty</div>
        )}
        {items.map((it) => (
          <div
            key={it.itemId}
            className="py-2 flex items-center justify-between gap-2"
          >
            <div>
              <div className="font-medium text-sm">{it.name}</div>
              <div className="text-xs text-gray-500">
                ₹{it.price} × {it.quantity}
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() =>
                    updateQty(it.itemId, Math.max(1, it.quantity - 1))
                  }
                  className="px-2 text-sm border rounded"
                >
                  -
                </button>
                <button
                  onClick={() => updateQty(it.itemId, it.quantity + 1)}
                  className="px-2 text-sm border rounded"
                >
                  +
                </button>
                <button
                  onClick={() => remove(it.itemId)}
                  className="text-xs text-red-500 ml-2"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="text-sm font-medium">
              ₹{(it.price * it.quantity).toFixed(0)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-gray-500">Subtotal</div>
          <div className="font-semibold">₹{subtotal.toFixed(0)}</div>
        </div>
        <button
          onClick={placeOrder}
          disabled={items.length === 0}
          className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50"
        >
          Place Order
        </button>
      </div>

      <div className="text-xs text-gray-400">
        Table: {tableId || "Not selected"}
      </div>
    </aside>
  );
}
