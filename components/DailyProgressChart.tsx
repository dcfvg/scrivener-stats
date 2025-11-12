import React, { useMemo, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter } from 'recharts';
import { WritingDayStat } from '../types';

interface DailyProgressChartProps {
  data: WritingDayStat[];
}

const Square = (props: any) => {
  const { cx, cy } = props;
  if (cx === null || cy === null) {
    return null;
  }
  return <rect x={cx - 4} y={cy - 4} width={8} height={8} fill="#34D399" className="opacity-75" />;
};


const DailyProgressChart: React.FC<DailyProgressChartProps> = ({ data }) => {
  const [view, setView] = useState<'overview' | 'streaks'>('overview');

  const { monthlyData, dailyData } = useMemo(() => {
    const monthMap: { [key: string]: { month: string; sessions: number; netWords: number; } } = {};
    
    data.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthLabel,
          sessions: 0,
          netWords: 0,
        };
      }
      monthMap[monthKey].sessions += 1;
      monthMap[monthKey].netWords += item.wordsNet;
    });
    
    const sortedKeys = Object.keys(monthMap).sort();
    
    let cumulativeWords = 0;
    const finalMonthlyData = sortedKeys.map(key => {
      cumulativeWords += monthMap[key].netWords;
      return {
        month: monthMap[key].month,
        'Writing Sessions': monthMap[key].sessions,
        'Cumulative Words': cumulativeWords,
      };
    });

    const finalDailyData = data.map(stat => {
      const date = new Date(stat.date);
      return {
          month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          day: date.getDate(),
          words: stat.wordsNet,
          date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      };
    });

    return { monthlyData: finalMonthlyData, dailyData: finalDailyData };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // For streak/scatter view
      if (payload[0].dataKey === 'day') {
        const dataPoint = payload[0].payload;
        return (
          <div className="bg-gray-900/80 backdrop-blur-sm p-3 border border-gray-600 rounded-lg shadow-lg">
            <p className="font-bold text-emerald-400">{dataPoint.date}</p>
            <p className="text-gray-300">Net Words: {dataPoint.words.toLocaleString()}</p>
          </div>
        );
      }
      // For overview view
      return (
        <div className="bg-gray-900/80 backdrop-blur-sm p-3 border border-gray-600 rounded-lg shadow-lg">
          <p className="font-bold text-emerald-400">{label}</p>
          {payload.map((pld) => (
            <p key={pld.dataKey} style={{ color: pld.color }}>
              {`${pld.dataKey}: ${pld.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // FIX: Define props for ToggleButton using an interface to avoid potential type inference issues.
  interface ToggleButtonProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }

  // FIX: Explicitly typing the component with React.FC aligns it with project conventions and resolves a type inference issue where 'children' was not being recognized.
  const ToggleButton: React.FC<ToggleButtonProps> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
        active
          ? 'bg-emerald-500 text-white'
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
            data={monthlyData}
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
            
            {view === 'streaks' ? (
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                stroke="#A0AEC0" 
                tick={{ fontSize: 12 }} 
                label={{ value: 'Day of Month', angle: -90, position: 'insideLeft', fill: '#A0AEC0', dy: 40 }}
                domain={[1, 31]}
                ticks={[1, 5, 10, 15, 20, 25, 31]}
                reversed={true}
              />
            ) : (
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                stroke="#A0AEC0" 
                tick={{ fontSize: 12 }} 
                allowDecimals={false}
                label={{ value: 'Writing Sessions', angle: -90, position: 'insideLeft', fill: '#A0AEC0', dy: 40 }} 
              />
            )}
            
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#34D399" 
              tick={{ fontSize: 12 }} 
              label={{ value: 'Cumulative Words', angle: 90, position: 'insideRight', fill: '#34D399', dy: -60 }} 
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(113, 224, 183, 0.1)' }}/>
            <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
            
            {view === 'overview' && <Bar yAxisId="left" dataKey="Writing Sessions" fill="#4A5568" name="Writing Sessions" />}
            
            {view === 'streaks' && <Scatter yAxisId="left" data={dailyData} dataKey="day" name="Writing Days" shape={<Square />} />}
            
            <Line yAxisId="right" type="monotone" dataKey="Cumulative Words" stroke="#34D399" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} name="Cumulative Words" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DailyProgressChart;