import React, { useMemo, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { WritingDayStat } from '../types';

interface DailyProgressChartProps {
  data: WritingDayStat[];
}

const DailyProgressChart: React.FC<DailyProgressChartProps> = ({ data }) => {
  const [view, setView] = useState<'overview' | 'streaks'>('overview');

  // Custom bar shape that renders streaks as segments
  const StreakSegmentBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload || !payload.streaks) return null;
    
    const segments: React.ReactElement[] = [];
    // Y axis is always 0-31 in both modes
    // When reversed, height is negative - use absolute value
    const absHeight = Math.abs(height);
    const pixelsPerDay = absHeight / 31;
    
    // When height is negative (reversed axis), y is at the BOTTOM
    // The top is at y + height (e.g., 201 + (-196) = 5)
    const chartTop = height < 0 ? y + height : y;
    const chartBottom = height < 0 ? y : y + height;
    
    if (view === 'overview') {
      // Overview: stack all streak segments from bottom (day 0)
      let currentDay = 0; // Start stacking from day 0
      
      payload.streaks.forEach((streak: any) => {
        const segmentY = chartBottom - ((currentDay + streak.length) * pixelsPerDay); // Top of segment
        const segmentHeight = streak.length * pixelsPerDay;
        
        segments.push(
          <rect
            key={`${payload.month}-${streak.startDay}-${streak.endDay}`}
            x={x}
            y={segmentY}
            width={width}
            height={segmentHeight}
            fill="#4A5568"
          />
        );
        
        currentDay += streak.length; // Stack next segment on top
      });
      
      return <g>{segments}</g>;
    } else {
      // Streaks: draw each streak segment positioned at its actual day in the month
      // Y axis is reversed: day 1 at top, day 31 at bottom
      // chartTop is the visual top (day 1), position segments from there
      payload.streaks.forEach((streak: any) => {
        const segmentY = chartTop + ((streak.startDay - 1) * pixelsPerDay);
        const segmentHeight = streak.length * pixelsPerDay;
        
        segments.push(
          <rect
            key={`${payload.month}-${streak.startDay}-${streak.endDay}`}
            x={x}
            y={segmentY}
            width={width}
            height={segmentHeight}
            fill="#4A5568"
          />
        );
      });
      
      return <g>{segments}</g>;
    }
  };

  const chartData = useMemo(() => {
    // Group data by month
    const monthMap: { [key: string]: { 
      month: string; 
      totalDays: number;
      streaks: Array<{ startDay: number; endDay: number; length: number }>;
      netWords: number;
    } } = {};
    
    data.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthLabel,
          totalDays: 0,
          streaks: [],
          netWords: 0,
        };
      }
      monthMap[monthKey].totalDays += 1;
      monthMap[monthKey].netWords += item.wordsNet;
    });
    
    // Build day arrays for each month to identify streaks
    const monthDays: { [key: string]: number[] } = {};
    data.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      if (!monthDays[monthKey]) monthDays[monthKey] = [];
      monthDays[monthKey].push(date.getDate());
    });
    
    // Identify consecutive streaks in each month
    Object.keys(monthDays).forEach(monthKey => {
      const days = monthDays[monthKey].sort((a, b) => a - b);
      let currentStreak: number[] = [days[0]];
      
      for (let i = 1; i < days.length; i++) {
        if (days[i] === days[i-1] + 1) {
          currentStreak.push(days[i]);
        } else {
          monthMap[monthKey].streaks.push({
            startDay: currentStreak[0],
            endDay: currentStreak[currentStreak.length - 1],
            length: currentStreak.length,
          });
          currentStreak = [days[i]];
        }
      }
      if (currentStreak.length > 0) {
        monthMap[monthKey].streaks.push({
          startDay: currentStreak[0],
          endDay: currentStreak[currentStreak.length - 1],
          length: currentStreak.length,
        });
      }
    });
    
    const sortedKeys = Object.keys(monthMap).sort();
    let cumulativeWords = 0;
    
    // Create ONE row per month with all streaks as separate bar segments
    return sortedKeys.map(key => {
      cumulativeWords += monthMap[key].netWords;
      
      const monthData: any = {
        month: monthMap[key].month,
        totalDays: monthMap[key].totalDays,
        cumulativeWords: cumulativeWords,
        streaks: monthMap[key].streaks,
      };
      
      // Always use 31 as bar value so Y axis is consistent (0-31) in both modes
      monthData.barValue = 31;
      
      return monthData;
    });
  }, [data, view]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm p-3 border border-gray-600 rounded-lg shadow-lg">
          <p className="font-bold text-emerald-400 mb-2">{label}</p>
          
          {view === 'streaks' && dataPoint?.streaks ? (
            <>
              <p className="text-sm text-gray-300 mb-1">
                Writing Days: {dataPoint.totalDays}
              </p>
              <div className="text-xs text-gray-400 mt-2">
                <p className="font-semibold mb-1">Streaks:</p>
                {dataPoint.streaks.map((streak: any, idx: number) => (
                  <p key={idx}>
                    {streak.length === 1 
                      ? `Day ${streak.startDay}`
                      : `Days ${streak.startDay}-${streak.endDay} (${streak.length} days)`
                    }
                  </p>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-300">
              Writing Days: {dataPoint?.totalDays || 0}
            </p>
          )}
          
          {payload.find((p: any) => p.dataKey === 'cumulativeWords') && (
            <p className="text-sm mt-2" style={{ color: '#34D399' }}>
              Cumulative Words: {dataPoint?.cumulativeWords?.toLocaleString() || 0}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  interface ToggleButtonProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }

  const ToggleButton: React.FC<ToggleButtonProps> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
        active
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full h-[400px] flex flex-col pt-4">
      <div className="flex justify-end mb-4 space-x-2 flex-shrink-0">
        <ToggleButton active={view === 'overview'} onClick={() => setView('overview')}>
          Overview
        </ToggleButton>
        <ToggleButton active={view === 'streaks'} onClick={() => setView('streaks')}>
          Streaks
        </ToggleButton>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
            <XAxis 
              dataKey="month" 
              stroke="#A0AEC0"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={70}
              interval="preserveStartEnd"
            />
            
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              stroke="#A0AEC0" 
              tick={{ fontSize: 12 }}
              allowDecimals={false}
              domain={[0, 31]}
              ticks={[1, 5, 10, 15, 20, 25, 31]}
              reversed={view === 'streaks'}
              label={{ 
                value: view === 'streaks' ? 'Day of Month' : 'Days (Stacked)', 
                angle: -90, 
                position: 'insideLeft', 
                fill: '#A0AEC0', 
                dy: 40 
              }} 
            />
            
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#34D399" 
              tick={{ fontSize: 12 }} 
              label={{ 
                value: 'Cumulative Words', 
                angle: 90, 
                position: 'insideRight', 
                fill: '#34D399', 
                dy: -60 
              }} 
            />

            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(113, 224, 183, 0.1)' }}
              wrapperStyle={{ zIndex: 1000 }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
              formatter={(value) => {
                if (value === 'position') return 'Writing Streaks';
                if (value === 'cumulativeWords') return 'Cumulative Words';
                return value;
              }}
            />
            
            {/* Reference lines for all months */}
            {chartData.map((item, index) => (
              <ReferenceLine
                key={`ref-${item.month}`}
                x={item.month}
                stroke="#4A5568"
                strokeDasharray="3 3"
                yAxisId="left"
              />
            ))}
            
            {/* Single bar per month with custom shape that renders streak segments */}
            <Bar 
              yAxisId="left" 
              dataKey="barValue"
              fill="#4A5568" 
              name="Writing Streaks"
              shape={<StreakSegmentBar />}
              isAnimationActive={false}
            />
            
            {/* Cumulative line always visible */}
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="cumulativeWords" 
              stroke="#34D399" 
              strokeWidth={2} 
              dot={{ r: 4, strokeWidth: 2 }} 
              name="Cumulative Words"
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-in-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DailyProgressChart;