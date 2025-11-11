import { Home, Search, PlusSquare, Heart, User, MessageCircle, Film } from 'lucide-react';

interface BottomNavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  hasNotifications?: boolean;
}

export function BottomNavigation({ currentView, onNavigate, hasNotifications }: BottomNavigationProps) {
  const tabs = [
    { id: 'home', icon: MessageCircle, label: 'Chats' },
    { id: 'feed', icon: Home, label: 'Feed' },
    { id: 'create-post', icon: PlusSquare, label: 'Create' },
    { id: 'reels', icon: Film, label: 'Reels' },
    { id: 'notifications', icon: Heart, label: 'Activity', showBadge: true },
    { id: 'settings', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className="flex flex-col items-center justify-center space-y-1 p-2 min-w-[60px] transition-colors relative"
            >
              <Icon
                className={`w-6 h-6 ${
                  isActive ? 'text-[#25D366]' : 'text-gray-600'
                }`}
                fill={isActive ? 'currentColor' : 'none'}
              />
              <span
                className={`text-xs ${
                  isActive ? 'text-[#25D366] font-medium' : 'text-gray-600'
                }`}
              >
                {tab.label}
              </span>
              {tab.showBadge && hasNotifications && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
