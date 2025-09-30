import React from "react";
import type { MenuItem } from "../../types/types";

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
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition sm:rounded-2xl">
      {/* Image section */}
      <div className="relative">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-36 w-full object-cover sm:h-44 md:h-52"
          />
        ) : (
          <div className="h-36 w-full bg-gray-100 flex items-center justify-center text-gray-400 sm:h-44 md:h-52">
            No image
          </div>
        )}

        {/* Veg/Non-Veg dot indicator (Zomato style) */}
        <span
          className={`absolute top-2 left-2 h-4 w-4 rounded-sm border flex items-center justify-center ${
            item.isVegetarian ? "border-green-600" : "border-red-600"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              item.isVegetarian ? "bg-green-600" : "bg-red-600"
            }`}
          ></span>
        </span>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-base text-gray-900 sm:text-lg">
            {item.name}
          </h3>
          <div className="text-right font-bold text-gray-800 text-sm sm:text-base">
            ₹{item.price.toFixed(0)}
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-1 line-clamp-1 sm:text-sm sm:line-clamp-2">
          {item.description || "Delicious food you'll love!"}
        </p>

        {item.preparationTime && (
          <p className="text-xs text-gray-400 mt-1 sm:text-sm">
            ⏱ {item.preparationTime} min
          </p>
        )}

        {/* Add button */}
        <div className="mt-3 flex justify-end sm:mt-4">
          <button
            onClick={() =>
              onAdd({
                itemId: item.itemId,
                name: item.name,
                price: item.price,
                quantity: 1,
              })
            }
            className="px-3 py-1 rounded-md bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition sm:px-4 sm:py-1.5 sm:rounded-lg sm:text-sm"
          >
            Add +
          </button>
        </div>
      </div>
    </div>
  );
}
