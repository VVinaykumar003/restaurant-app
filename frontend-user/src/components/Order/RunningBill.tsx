import { useQuery } from "@tanstack/react-query";
import FooterNav from "../Layout/Footer";
import { Clock, MapPin, ArrowLeft, Loader2, Receipt, CheckCircle, XCircle } from 'lucide-react';
import { getOrder } from "../../api/order.api";
import { useTableFromUrl } from "../../hooks/useTable";
import { useNavigate } from "react-router-dom";


type OrderItem = {
  menuItemId: { $oid: string };
  name: string;
  quantity: number;
  price: number;
  priceAtOrder: number;
  notes: string;
  status: 'placed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  _id: { $oid: string };
  createdAt: { $date: string };
  updatedAt: { $date: string };
};

type Order = {
  _id: { $oid: string };
  restaurantId: string;
  tableId: string;
  sessionId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'placed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'partial';
  isCustomerOrder: boolean;
  customerName: string;
  customerEmail: string;
  staffAlias: string | null;
  overrideToken: string | null;
  version: number;
  createdAt: { $date: string };
  updatedAt: { $date: string };
  __v: number;
};

const statusConfig = {
  placed: { label: 'Order Placed', color: 'bg-blue-100 text-blue-700', icon: Receipt },
  preparing: { label: 'Preparing', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  served: { label: 'Served', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700', icon: CheckCircle }
};

export default function RunningBillPage() {
  // Move useTableFromUrl inside the component
  const { tableId, sessionId } = useTableFromUrl();
  const restaurantId = 'restro10'; // You might want to get this from props or context
  // const [items, setItems] = useState<Item[]>([]);
  const {
    data: orders,
    isLoading,
    error,
    refetch
  } = useQuery<Order[]>
({
    queryKey: ['orders', sessionId],
    queryFn: async () => {
      const res = await getOrder(restaurantId, sessionId);
    
   
    // const res = await axios.get("http://localhost:5000/api/user/orders");
      
      if (!res) {
        throw new Error('No orders found');
      }
      
      return res;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds
    retry: 1,
    enabled: !!sessionId, // Only run query if sessionId exists
  });



  const navigate = useNavigate();


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-gray-600">Loading your orders...</p>
        </div>
        <FooterNav activeTab="bill" hasOrders={false} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="flex items-center justify-center min-h-[80vh] p-4">
          <div className="text-center max-w-md">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to load orders</h2>
            <p className="text-gray-600 mb-4">{(error as Error).message}</p>
            <button
              onClick={() => refetch()}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
        <FooterNav activeTab="bill" hasOrders={false} />
      </div>
    );
  }


  const activeOrders = orders?.filter(order => 
    order.status !== 'completed' && order.status !== 'cancelled'
) || [];

console.log(`activeOrders : ${activeOrders[0]?.createdAt}`)


  const totalBill = activeOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="px-4 py-3 flex items-center gap-3">
            <a href="/menu" className="p-2 hover:bg-gray-300 text-black rounded-full transition-colors">
              <ArrowLeft size={20} />
            </a>
            <div className="flex-1">
              <h1 className="font-bold text-gray-800 text-lg lg:text-2xl">Running Bill</h1>
              <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-500">
                <MapPin size={12} className="lg:w-4 lg:h-4" />
                <span>Table {tableId}</span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500">Session: {sessionId?.slice(-8)}</span>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Refresh"
            >
              <Loader2 size={20} className="text-emerald-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Receipt size={64} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Orders</h2>
            <p className="text-gray-600 mb-6">You haven't placed any orders yet</p>
            <a
              href="/menu"
              className="inline-block px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
            >
              Browse Menu
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {activeOrders.map((order , orderIndex ) => {
              const StatusIcon = statusConfig[order.status].icon;
              
              return (
                <div  key={order._id || `order-${orderIndex}`} className="bg-white rounded-xl shadow-sm overflow-hidden"
                  onClick={() => navigate(`/order/${order._id}`)}
                >
                  {/* Order Header */}
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Order ID</p>
                        <p className="font-mono text-sm font-semibold text-gray-900">
                         #{order._id? order._id.slice(-8).toUpperCase() : "UNKNOWN"}
                         
                      

                        </p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig[order.status].color}`}>
                        <StatusIcon size={16} />
                        <span className="text-sm font-semibold">
                          {statusConfig[order.status].label}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Placed at {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* Order Items */}
                  {/* <div className="p-4 space-y-3">
                    {order.items.map((item , itemIndex) => (
                      <div key={item._id?.$oid || `${order._id?.$oid}-item-${itemIndex}`}className="flex items-start gap-3 pb-3 border-b last:border-0">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            <span className="font-bold text-gray-900 whitespace-nowrap">
                              ₹{item.priceAtOrder * item.quantity}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-600">₹{item.priceAtOrder} each</span>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-gray-500 mt-1 italic">Note: {item.notes}</p>
                          )}
                          <div className="mt-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[item.status].color}`}>
                              {statusConfig[item.status].label}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div> */}

                  {/* Order Footer */}
                  {/* <div className="bg-gray-50 px-4 py-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">Order Total</span>
                      <span className="font-bold text-lg text-gray-900">₹{order.totalAmount}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-600">Payment Status</span>
                      <span className={`text-sm font-semibold ${
                        order.paymentStatus === 'paid' 
                          ? 'text-green-600' 
                          : order.paymentStatus === 'partial'
                          ? 'text-yellow-600'
                          : 'text-gray-600'
                      }`}>
                        {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                      </span>
                    </div>
                  </div> */}
                </div>
              );
            })}

            {/* Grand Total */}
            <div className="bg-white rounded-xl shadow-sm p-4 sticky bottom-4 mx-2 sm:mx-0"> {/* Total Orders */}
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2">
    <span className="text-gray-600 text-sm sm:text-base">Total Orders</span>
    <span className="font-semibold text-lg sm:text-xl mt-1 sm:mt-0">{activeOrders.length}</span>
  </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 border-t">
    <span className="text-lg font-bold text-gray-900">Grand Total</span>
    <span className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1 sm:mt-0">₹{totalBill}</span>
  </div>
              {/* Request Bill Button */}
  <button className="w-full mt-4 bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 transition-colors">
    Request Bill
  </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <FooterNav activeTab="bill" hasOrders={activeOrders.length > 0} />
    </div>
  );
}