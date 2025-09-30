import { useQuery } from "@tanstack/react-query";
import { fetchMenu } from "../api/menu.api";
import MenuGrid from "../components/Menu/MenuGrid";
import { useCart } from "../stores/cart.store";
import CartDrawer from "../components/Cart/CartDrawer";
import { useTableFromUrl } from "../hooks/useTable";

type Branding = {
  title: string;
  [key: string]: any;
};

type MenuItem = {
  itemId: string;
  name: string;
  price: number;
  isActive?: boolean;
  description?: string;
  image?: string | null;
  preparationTime?: number | null;
  isVegetarian?: boolean;
};

type MenuType = {
  branding?: Branding;
  menu: MenuItem[];
  categories?: any[];
  taxes?: any[];
  serviceCharge?: number;
};

export default function MenuPage() {
  const { tableId } = useTableFromUrl();
  const rid = import.meta.env.VITE_RID || "restro10";

  const {
    data: menu,
    isLoading,
    error,
  } = useQuery<MenuType>({
    queryKey: ["menu", rid],
    queryFn: () => fetchMenu(rid),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const add = useCart((s) => s.addItem);

  const handleAdd = (payload: {
    itemId: string;
    name: string;
    price: number;
    quantity: number;
  }) => {
    add(payload);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {menu?.branding?.title || "Menu"}
            </h1>
            <div className="text-sm text-gray-500">
              Table: {tableId || "Select a table"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        {isLoading && (
          <div className="text-center text-gray-500">Loading menu…</div>
        )}
        {error && (
          <div className="text-center text-red-500">
            Failed to load menu. Please try again.
          </div>
        )}
        {menu && (
          <MenuGrid
            items={menu.menu.filter((i) => i.isActive !== false)}
            onAdd={handleAdd}
          />
        )}
      </main>

      <CartDrawer />
    </div>
  );
}
