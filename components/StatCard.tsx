import React from 'react';

/**
 * Props for StatCard.
 */
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
}

/**
 * Simple stat summary card for dashboard metrics.
 */
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, subtitle }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex items-center space-x-6 hover:bg-gray-700/50 transition-colors duration-300">
      <div className="bg-gray-900 p-3 rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default StatCard;
