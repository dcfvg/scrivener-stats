import React, { useState } from 'react';
import { ProcessedStats } from '../types';
import StatCard from './StatCard';
import DailyProgressChart from './DailyProgressChart';
import CalendarHeatmap from './CalendarHeatmap';
import StreakDistributionChart from './StreakDistributionChart';
import WeekdayDistributionChart from './WeekdayDistributionChart';
import { ChartBarIcon, ClockIcon, FireIcon, StarIcon, CalendarDaysIcon, PencilIcon, DocumentTextIcon, ChartPieIcon } from '@heroicons/react/24/outline';

interface DashboardProps {
  stats: ProcessedStats;
  fileName: string;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, fileName }) => {
  const [weekdayViewMode, setWeekdayViewMode] = useState<'activity' | 'average' | 'total'>('activity');
  const [calendarYearType, setCalendarYearType] = useState<'calendar' | 'academic'>('academic');
  const [monthlyView, setMonthlyView] = useState<'overview' | 'streaks'>('overview');

  const { 
    totalWords, 
    averageWordsPerDay, 
    longestStreak, 
    currentStreak,
    mostProductiveDay,
    writingDays,
    productivityRate,
    firstDay,
    lastDay,
    effectiveEndDate
  } = stats;
  
  // Calculate total days in the writing period
  const totalDaysInPeriod = firstDay && effectiveEndDate
    ? Math.ceil((effectiveEndDate.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const streakSubtitle = (startDate: Date | null, endDate: Date | null) => {
    if (!startDate || !endDate || startDate.getTime() === endDate.getTime()) {
      return null;
    }
    return `From ${formatDate(startDate)} to ${formatDate(endDate)}`;
};


  return (
    <div className="space-y-8 animate-fade-in">
      <div className="px-4 py-2 bg-gray-800 rounded-lg">
        <h2 className="text-lg font-medium text-gray-300">
          Report for: <span className="font-bold text-emerald-400">{fileName}</span>
        </h2>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Words" 
          value={totalWords.toLocaleString()} 
          icon={<DocumentTextIcon className="h-8 w-8 text-emerald-400" />} 
        />
        <StatCard 
          title="Avg. Words / Day" 
          value={averageWordsPerDay.toLocaleString()}
          icon={<PencilIcon className="h-8 w-8 text-emerald-400" />} 
          subtitle="On days you wrote"
        />
        <StatCard 
          title="Longest Streak" 
          value={`${longestStreak.length} Days`} 
          icon={<FireIcon className="h-8 w-8 text-emerald-400" />}
          subtitle={streakSubtitle(longestStreak.startDate, longestStreak.endDate)}
        />
        <StatCard 
          title="Writing Days & Rate" 
          value={`${writingDays.toLocaleString()} days (${productivityRate ?? 0}%)`} 
          icon={<CalendarDaysIcon className="h-8 w-8 text-emerald-400" />}
          subtitle={`From ${formatDate(firstDay)} to ${formatDate(lastDay)} • ${writingDays.toLocaleString()} of ${totalDaysInPeriod.toLocaleString()} days active`}
        />
        <StatCard 
          title="Most Productive Day" 
          value={`${(mostProductiveDay?.wordsNet || 0).toLocaleString()} words`} 
          icon={<StarIcon className="h-8 w-8 text-emerald-400" />} 
          subtitle={formatDate(mostProductiveDay?.date)}
        />
        <StatCard 
          title="Current Streak" 
          value={`${currentStreak.length} Days`} 
          icon={<ClockIcon className="h-8 w-8 text-emerald-400" />} 
          subtitle={streakSubtitle(currentStreak.startDate, currentStreak.endDate)}
        />
      </div>
      
      {/* Charts */}
      <div className="bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-100 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-2 text-emerald-400" />
            Monthly Progress
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setMonthlyView('overview')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                monthlyView === 'overview'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setMonthlyView('streaks')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                monthlyView === 'streaks'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Streaks
            </button>
          </div>
        </div>
        <DailyProgressChart 
          data={stats.dailyStats}
          view={monthlyView}
          onViewChange={setMonthlyView}
        />
      </div>
      
      <div className="bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-100 flex items-center">
            <CalendarDaysIcon className="h-6 w-6 mr-2 text-emerald-400" />
            Writing Consistency
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setCalendarYearType('calendar')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                calendarYearType === 'calendar'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setCalendarYearType('academic')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                calendarYearType === 'academic'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Academic
            </button>
          </div>
        </div>
        <CalendarHeatmap 
          data={stats.calendarData}
          yearType={calendarYearType}
          onYearTypeChange={setCalendarYearType}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-100 flex items-center">
            <ChartPieIcon className="h-6 w-6 mr-2 text-emerald-400" />
            Streak Distribution
          </h3>
          <StreakDistributionChart data={stats.streakDistribution} />
        </div>

        <div className="bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-100 flex items-center">
              <CalendarDaysIcon className="h-6 w-6 mr-2 text-emerald-400" />
              Weekday Activity
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setWeekdayViewMode('activity')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  weekdayViewMode === 'activity'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setWeekdayViewMode('average')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  weekdayViewMode === 'average'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Avg
              </button>
              <button
                onClick={() => setWeekdayViewMode('total')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  weekdayViewMode === 'total'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Total
              </button>
            </div>
          </div>
          <WeekdayDistributionChart 
            data={stats.dailyStats} 
            viewMode={weekdayViewMode}
            onViewModeChange={setWeekdayViewMode}
          />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
