import React from "react";
import MenuCard from "./MenuCard";
import type { MenuItem } from "../../types/types";

type Props = {
  items: MenuItem[];
  onAdd: (it: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
  }) => void;
};

export default function MenuGrid({ items, onAdd }: Props) {
  if (!items?.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        No items available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.itemId} className="w-full">
          <MenuCard item={it} onAdd={onAdd} />
        </div>
      ))}
    </div>
  );
}
