import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WritingDayStat } from '../types';

interface WeekdayDistributionChartProps {
  data: WritingDayStat[];
  viewMode: 'activity' | 'average' | 'total';
  onViewModeChange: (mode: 'activity' | 'average' | 'total') => void;
}

type ViewMode = 'activity' | 'average' | 'total';

const WeekdayDistributionChart: React.FC<WeekdayDistributionChartProps> = ({ data, viewMode, onViewModeChange }) => {

  const chartData = useMemo(() => {
    const weekdayCounts: { [key: string]: number } = {
      'Sunday': 0,
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0
    };

    const weekdayWords: { [key: string]: number } = {
      'Sunday': 0,
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0
    };

    const weekdayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    data.forEach(item => {
      const date = new Date(item.date);
      const dayName = weekdayOrder[date.getDay()];
      weekdayCounts[dayName]++;
      weekdayWords[dayName] += item.wordsNet;
    });

    return weekdayOrder.map(day => ({
      day: day.substring(0, 3), // Abréviation: Sun, Mon, etc.
      count: weekdayCounts[day],
      average: weekdayCounts[day] > 0 ? Math.round(weekdayWords[day] / weekdayCounts[day]) : 0,
      total: weekdayWords[day],
      fullDay: day
    }));
  }, [data]);

  if (chartData.every(d => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500">
        No weekday data available.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-gray-900/80 backdrop-blur-sm p-3 border border-gray-600 rounded-lg shadow-lg">
          <p className="font-bold text-emerald-400">{dataPoint.fullDay}</p>
          {viewMode === 'activity' ? (
            <p style={{ color: '#A0AEC0' }}>
              {`Writing days: ${payload[0].value.toLocaleString()}`}
            </p>
          ) : viewMode === 'average' ? (
            <>
              <p style={{ color: '#A0AEC0' }}>
                {`Average: ${payload[0].value.toLocaleString()} words/day`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {`Based on ${dataPoint.count} writing day${dataPoint.count !== 1 ? 's' : ''}`}
              </p>
            </>
          ) : (
            <>
              <p style={{ color: '#A0AEC0' }}>
                {`Total: ${payload[0].value.toLocaleString()} words`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {`Across ${dataPoint.count} writing day${dataPoint.count !== 1 ? 's' : ''}`}
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 20,
              left: -10,
              bottom: 5,
            }}
            barSize={30}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
            <XAxis 
              dataKey="day" 
              stroke="#A0AEC0" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#A0AEC0" 
              tick={{ fontSize: 12 }} 
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(113, 224, 183, 0.1)' }} />
            <Bar 
              dataKey={viewMode === 'activity' ? 'count' : viewMode === 'average' ? 'average' : 'total'} 
              fill="#34D399" 
              name={viewMode === 'activity' ? 'Writing Days' : viewMode === 'average' ? 'Avg Words/Day' : 'Total Words'} 
            />
          </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default WeekdayDistributionChart;
