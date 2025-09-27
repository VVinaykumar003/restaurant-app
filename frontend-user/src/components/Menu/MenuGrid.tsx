import React from "react";
import MenuCard from "./MenuCard";
import type { MenuItem } from "@/types/types";

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
    return <div className="text-center text-gray-500">No items available.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((it) => (
        <MenuCard key={it.itemId} item={it} onAdd={onAdd} />
      ))}
    </div>
  );
}
