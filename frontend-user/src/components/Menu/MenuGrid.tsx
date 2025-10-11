import { useState } from 'react';
import { ShoppingCart, Search, ArrowLeft, Plus, Minus, Clock, MapPin, Utensils } from 'lucide-react';
import { createOrder } from '../../api/order.api';
import { useTableFromUrl } from '../../hooks/useTable';
import CallWaiterButton from '../Layout/Bell';

type MenuAppProps = {
  menuData: {
    branding: { title: string };
    categories: Array<{
      name: string;
      itemIds: string[];
      _id: string;
    }>;
    menu: MenuItem[];
    serviceCharge: number;
    taxes: Array<{ name: string; percent: number }>;
  };
  tableId?: string;
  onAddToCart?: (item: CartItem) => void;
};

type MenuItem = {
  itemId: string;
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string | null;
  isActive: boolean;
  isVegetarian: boolean;
  preparationTime: string | null;
};

type CartItem = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  isVegetarian?: boolean;
};

export default function RestaurantMenuApp({ menuData, tableId = "5", onAddToCart }: MenuAppProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const { sessionId } = useTableFromUrl();
  const [vegFilter, setVegFilter] = useState("veg");
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Cart logic
  const addToCart = (item: MenuItem) => {
    const newCart = { ...cart, [item._id]: { ...item, quantity: (cart[item._id]?.quantity || 0) + 1 } };
    setCart(newCart);
    if (onAddToCart) onAddToCart({ _id: item._id, name: item.name, price: item.price, quantity: 1 });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId].quantity > 1) newCart[itemId].quantity -= 1;
      else delete newCart[itemId];
      return newCart;
    });
  };

  // Filters
  const filteredItems = menuData.menu.filter(item => {
    if (!item.isActive) return false;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      || item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const category = activeCategory ? menuData.categories.find(cat => cat.name === activeCategory) : null;
    const matchesCategory = category ? category.itemIds.includes(item.itemId) : true;
    const matchesVeg = vegFilter === "veg" ? item.isVegetarian : !item.isVegetarian;
    return matchesSearch && matchesCategory && matchesVeg;
  });

  // Totals
  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const gstAmount = menuData.taxes.reduce((sum, tax) => sum + cartTotal * tax.percent / 100, 0);
  const finalTotal = cartTotal + gstAmount + menuData.serviceCharge;

  const placeOrder = async () => {
    try {
      const rid = "restro10";
      const items = cartItems.map(item => ({
        itemId: item._id, name: item.name, price: item.price, quantity: item.quantity
      }));
      const payload = { tableId, sessionId, customerName, customerEmail, items };
      await createOrder(rid, payload);
      alert("Order placed successfully!");
      setCart({});
      setShowCart(false);
    } catch (error) {
      console.error("Failed to place order:", error);
      alert("Failed to place order");
    }
  };

   const handleCallWaiter = () => {
    // Replace with API call to notify staff
    alert("Waiter has been called! 🍽️");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="px-4 py-3 flex items-center gap-3">
            <button className="p-2 hover:bg-black rounded-full transition-colors lg:hidden">
              <ArrowLeft size={20} className="text-black" />
            </button>
            <div className="flex-2 flex-wrap justify-between">
              <h1 className="font-bold justify-center text-gray-500 text-lg lg:text-2xl">{menuData.branding?.title || "Menu"}</h1>
              <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-500">
                <MapPin size={12} className="lg:w-4 lg:h-4 text-green-300" />
                <span>Table {tableId}</span>
                <span className="text-gray-300">•</span>
                <Clock size={12} className="lg:w-4 lg:h-4 text-green-300 " />
                <span>30-40 mins</span>
              </div>
            </div>
              <div className='flex justify-end'>
                <CallWaiterButton onClick={handleCallWaiter}/>
              </div>
          </div>
          {/* Search/toggle row */}
          <div className="relative">
            <div className="flex justify-between items-center gap-1 border-2 mb-1 bg-white z-10 relative px-2 py-1">
              <div className="ml-2">
                <button onClick={() => setShowSearchModal(true)} className="p-2 rounded-full hover:bg-gray-200 transition">
                  <Search size={30} className="text-gray-400" />
                </button>
              </div>
                 {showSearchModal && (
                <div className="absolute inset-0 bg-white z-30 flex items-center justify-center">
                  <div className="w-full max-w-lg shadow-xl rounded-lg bg-transparent mt-2">
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Search for dishes..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          autoFocus
                        />
                        <button  onClick={() => {
                            setShowSearchModal(false);
                            setSearchQuery("");   // <-- Clear the input field!
                          }}
                          className="text-gray-500 hover:text-gray-700 font-bold text-xl">
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mr-3 flex items-center">
                <span className="text-black text-xs mr-2">Veg</span>
                <input
                  type="checkbox"
                  checked={vegFilter === "non-veg"}
                  onChange={() => setVegFilter(prev => prev === "veg" ? "non-veg" : "veg")}
                  className={`toggle ${vegFilter === "veg" ? "bg-emerald-600" : "toggle-error"}`}
                />
                <span className="text-black text-xs ml-2">Non-veg</span>
              </div>
           
            </div>
            {!showSearchModal && (
              <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveCategory(null)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${activeCategory === null ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  All Items
                </button>
                {menuData.categories.map(category => (
                  <button key={category._id}
                          onClick={() => setActiveCategory(category.name)}
                          className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${activeCategory === category.name ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Menu items */}
     
        <div className="max-w-7xl mx-auto px-4 py-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Utensils size={48} className="mx-auto mb-3 opacity-30" />
              <p>No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
              {filteredItems.map(item => {
                const itemInCart = cart[item._id];
                return (
                  <div key={item._id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-3 lg:p-4 flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <div className={`w-4 h-4 border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${item.isVegetarian ? "border-green-600" : "border-red-600"}`}>
                            <div className={`w-2 h-2 rounded-full ${item.isVegetarian ? "bg-green-600" : "bg-red-600"}`} />
                          </div>
                          <h3 className="font-semibold text-gray-900 flex-1 leading-tight text-sm lg:text-base">{item.name}</h3>
                        </div>
                        {item.description && (
                          <p className="text-xs lg:text-sm text-gray-500 mb-1.5 lg:mb-2 line-clamp-2 ml-6">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mb-2 lg:mb-3 ml-6">
                          <span className="font-bold text-gray-900 text-sm lg:text-base">₹{item.price}</span>
                          {item.preparationTime && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock size={11} />
                                {item.preparationTime} mins
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Add/Remove buttons */}
                      <div className="flex flex-col items-center gap-1.5 lg:gap-2">
                        <div className="w-24 h-20 lg:w-28 lg:h-24 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-4xl lg:text-5xl opacity-30">🍽️</div>
                          )}
                        </div>
                        {!itemInCart ? (
                          <button onClick={() => addToCart(item)}
                                  className="w-24 lg:w-28 px-3 py-1.5 lg:py-2 bg-white border-2 border-emerald-500 text-emerald-500 rounded-lg font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1 text-sm">
                            <Plus size={16} strokeWidth={2.5} />
                            ADD
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 lg:gap-2 bg-emerald-500 rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 w-24 lg:w-28">
                            <button onClick={() => removeFromCart(item._id)}
                                    className="text-white hover:bg-emerald-600 rounded p-0.5 lg:p-1 transition-colors">
                              <Minus size={16} strokeWidth={2.5} />
                            </button>
                            <span className="flex-1 text-center font-bold text-white text-base lg:text-lg">{itemInCart.quantity}</span>
                            <button onClick={() => addToCart(item)}
                                    className="text-white hover:bg-emerald-600 rounded p-0.5 lg:p-1 transition-colors">
                              <Plus size={16} strokeWidth={2.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(!showCart)}
          className="fixed bottom-18 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-5 lg:px-8 py-3 lg:py-4 rounded-xl shadow-lg flex items-center gap-3 hover:bg-emerald-600 transition-all z-50 w-[90%] max-w-md lg:max-w-lg"
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="relative">
              <ShoppingCart size={20} className="lg:w-6 lg:h-6" strokeWidth={2} />
              <span className="absolute -top-2 -right-2 bg-white text-emerald-500 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
            </div>
            <span className="font-semibold text-base lg:text-lg">View Cart</span>
          </div>
          <div className="h-6 w-px bg-emerald-400" />
          <span className="font-bold text-base lg:text-xl">₹{cartTotal}</span>
        </button>
      )}
      {showCart && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50" onClick={() => setShowCart(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto max-w-2xl mx-auto"
               onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between z-10">
              <h2 className="text-xl lg:text-2xl font-bold">Your Order</h2>
              <button onClick={() => setShowCart(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {cartItems.map(item => (
                <div key={item._id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                  <div className={`w-4 h-4 border-2 flex items-center justify-center mt-1 flex-shrink-0 ${item.isVegetarian ? "border-green-600" : "border-red-600"}`}>
                    <div className={`w-2 h-2 rounded-full ${item.isVegetarian ? "bg-green-600" : "bg-red-600"}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold lg:text-lg">{item.name}</h3>
                    <p className="text-sm text-gray-500">₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1">
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="text-emerald-500 hover:bg-gray-200 rounded p-1 transition-colors"
                    >
                      <Minus size={16} strokeWidth={2.5} />
                    </button>
                    <span className="font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="text-emerald-500 hover:bg-gray-200 rounded p-1 transition-colors"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                  <span className="font-bold lg:text-lg">{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div className="px-6 py-4 border-t space-y-2 bg-gray-50">
              <div className="flex justify-between text-sm lg:text-base">
                <span className="text-gray-600">Subtotal</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              {menuData.taxes.map((tax, idx) => (
                <div key={idx} className="flex justify-between text-sm lg:text-base">
                  <span className="text-gray-600">{tax.name} ({tax.percent}%)</span>
                  <span>₹{(cartTotal * tax.percent / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm lg:text-base">
                <span className="text-gray-600">Service Charge</span>
                <span>₹{menuData.serviceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg lg:text-xl pt-2 border-t">
                <span>Total</span>
                <span>₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="px-6 pb-6 pt-4">
              <button
                onClick={() => setShowCustomerModal(true)}
                className="w-full bg-emerald-500 text-white py-3.5 lg:py-4 rounded-xl font-bold text-base lg:text-lg hover:bg-emerald-600 transition-colors shadow-md"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Enter your details</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Your Name"
                     value={customerName} onChange={e => setCustomerName(e.target.value)}
                     className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              <input type="email" placeholder="Your Email"
                     value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                     className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCustomerModal(false)}
                      className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100">
                Cancel
              </button>
              <button onClick={() => { setShowCustomerModal(false); placeOrder(); }}
                      disabled={!customerName || !customerEmail}
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:bg-gray-300">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
