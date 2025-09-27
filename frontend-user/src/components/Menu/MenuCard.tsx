import React from "react";
import type { MenuItem } from "../../types";

type Props = {
  item: MenuItem;
  onAdd: (item: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
  }) => void;
};

export default function MenuCard({ item, onAdd }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col">
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          className="h-36 w-full object-cover rounded-md mb-3"
        />
      ) : (
        <div className="h-36 w-full bg-gray-100 rounded-md mb-3 flex items-center justify-center text-gray-400">
          No image
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
        </div>
        <div className="text-right">
          <div className="font-medium">{item.price.toFixed(0)}</div>
          <div className="text-sm text-gray-400">₹</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {item.preparationTime ? `${item.preparationTime} min` : ""}
        </div>
        <button
          onClick={() =>
            onAdd({
              itemId: item.itemId,
              name: item.name,
              price: item.price,
              quantity: 1,
            })
          }
          className="px-3 py-1 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition"
        >
          Add
        </button>
      </div>
    </div>
  );
}
