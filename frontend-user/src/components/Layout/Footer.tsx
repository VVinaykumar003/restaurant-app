import { Utensils, FileText, Bell, User } from 'lucide-react';

type FooterNavProps = {
  activeTab?: string;
  hasOrders?: boolean;
};

export default function FooterNav({ 
  activeTab = 'menu', 
  hasOrders = false 
}: FooterNavProps) {
  const tabs = [
    { id: 'menu', label: 'Menu', icon: Utensils, href: '/menu' },
    { id: 'bill', label: 'Running Bill', icon: FileText, href: '/bill' },
    { id: 'waiter', label: 'Call Waiter', icon: Bell, href: '/waiter' },
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <a
                key={tab.id}
                href={tab.href}
                className={`flex flex-col items-center justify-center py-3 px-2 transition-colors relative ${
                  isActive 
                    ? 'text-emerald-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="relative">
                  <Icon 
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 2}
                    className="mb-1"
                  />
                  {tab.id === 'bill' && hasOrders && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      •
                    </span>
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  isActive ? 'font-semibold' : ''
                }`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-emerald-500 rounded-t-full" />
                )}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}