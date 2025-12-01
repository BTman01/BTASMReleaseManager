import React, { useEffect, useRef } from 'react';
import { AppNotification } from '../types';
import { UpdateIcon, ClockIcon } from './icons';

interface NotificationDropdownProps {
  isOpen: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onNotificationClick: (profileId: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, notifications, onClose, onNotificationClick, onMarkAllRead, onClearAll }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // A bit more logic to not close when clicking the bell icon itself
        const bellButton = document.querySelector('[aria-label="Open notifications"]');
        if (bellButton && !bellButton.contains(event.target as Node)) {
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) {
    return null;
  }
  
  const hasUnread = notifications.some(n => !n.read);

  const getIconForType = (type: 'update' | 'restart') => {
    switch(type) {
      case 'update':
        return <UpdateIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />;
      case 'restart':
        return <ClockIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-16 right-4 sm:right-6 lg:right-8 w-80 max-w-sm bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 animate-fade-in"
      style={{ animationDuration: '150ms' }}
    >
        <div className="p-3 border-b border-gray-700">
            <h3 className="font-semibold text-gray-200">Notifications</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No new notifications</p>
            ) : (
                <ul className="divide-y divide-gray-700">
                    {notifications.map(notification => {
                       const isClickable = notification.type === 'update';
                       const Component = isClickable ? 'button' : 'div';
                       
                       return (
                         <li key={notification.id}>
                           <Component
                             onClick={isClickable ? () => onNotificationClick(notification.profileId) : undefined}
                             className={`w-full text-left p-3 flex items-start space-x-3 text-sm relative ${isClickable ? 'hover:bg-gray-700/50' : ''}`}
                           >
                            {!notification.read && (
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                </span>
                            )}
                             <div className="pl-3">
                                {getIconForType(notification.type)}
                             </div>
                             <p className="text-gray-300">{notification.message}</p>
                           </Component>
                         </li>
                       );
                    })}
                </ul>
            )}
        </div>
        {notifications.length > 0 && (
            <div className="p-2 border-t border-gray-700 bg-gray-800/50 text-xs flex justify-between">
                <button 
                    onClick={onMarkAllRead} 
                    disabled={!hasUnread}
                    className="text-cyan-400 hover:underline disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                    Mark all as read
                </button>
                <button onClick={onClearAll} className="text-gray-400 hover:text-red-400 hover:underline">
                    Clear all
                </button>
            </div>
        )}
    </div>
  );
};

export default NotificationDropdown;