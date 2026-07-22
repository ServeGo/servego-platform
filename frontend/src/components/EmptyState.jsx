import React from 'react';
import { Calendar, Bell, Search, Users, HelpCircle } from 'lucide-react';

export function EmptyState({ 
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        {title || 'No data found'}
      </h3>
      
      {description && (
        <p className="text-sm text-slate-500 mb-6 max-w-sm">
          {description}
        </p>
      )}
      
      {onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm shadow-sm"
        >
          {actionLabel || 'Take Action'}
        </button>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases
export function EmptyBookings({ onAction }) {
  return (
    <EmptyState
      title="No bookings yet"
      description="You haven't made any service bookings. Browse our services to find the help you need."
      actionLabel="Browse Services"
      onAction={onAction}
      icon={Calendar}
    />
  );
}

export function EmptyNotifications({ onClear }) {
  return (
    <EmptyState
      title="All caught up!"
      description="You don't have any new notifications at the moment."
      actionLabel="Clear All"
      onAction={onClear}
      icon={Bell}
    />
  );
}

export function EmptySearchResults({ query, onClear }) {
  return (
    <EmptyState
      title="No results found"
      description={`We couldn't find any providers matching "${query}". Try adjusting your search or filters.`}
      actionLabel="Clear Search"
      onAction={onClear}
      icon={Search}
    />
  );
}

export function EmptyProviders({ onAction }) {
  return (
    <EmptyState
      title="No providers available"
      description="There are no verified service providers in this category yet. Please check back later."
      actionLabel="Browse All Services"
      onAction={onAction}
      icon={Users}
    />
  );
}

export function EmptyTickets({ onAction }) {
  return (
    <EmptyState
      title="No support tickets"
      description="You haven't submitted any support tickets. Contact us if you need assistance."
      actionLabel="Contact Support"
      onAction={onAction}
      icon={HelpCircle}
    />
  );
}

export default EmptyState;
