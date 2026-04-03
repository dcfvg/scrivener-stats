import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Props for StreakDistributionChart.
 */
interface StreakDistributionChartProps {
  data: { [length: string]: number };
}

/**
 * Histogram of streak lengths.
 */
const StreakDistributionChart: React.FC<StreakDistributionChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    return Object.entries(data)
      .map(([length, count]) => ({
        length,
        count,
        numericLength: parseInt(length.split('-')[0], 10)
      }))
      .sort((a, b) => a.numericLength - b.numericLength)
      .map(({ length, count }) => ({ length, count }));

  }, [data]);

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-500">No streak data available.</div>;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/80 backdrop-blur-sm p-3 border border-gray-600 rounded-lg shadow-lg">
          <p className="font-bold text-emerald-400">{label}</p>
          <p style={{ color: '#A0AEC0' }}>
            {`Count: ${payload[0].value.toLocaleString()}`}
          </p>
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
          barSize={20}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
          <XAxis 
            dataKey="length" 
            stroke="#A0AEC0" 
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            stroke="#A0AEC0" 
            tick={{ fontSize: 12 }} 
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(113, 224, 183, 0.1)' }} />
          <Bar dataKey="count" fill="#34D399" name="Count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StreakDistributionChart;
