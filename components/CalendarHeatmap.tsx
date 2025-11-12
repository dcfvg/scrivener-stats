import React from 'react';

interface CalendarHeatmapProps {
  data: { [key: string]: number };
}

const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ data }) => {
  const dateKeys = Object.keys(data);
  if (dateKeys.length === 0) {
    return <p className="text-gray-500">No daily data to display.</p>;
  }

  const dateObjects = dateKeys.map(key => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  });

  const firstDate = new Date(Math.min.apply(null, dateObjects as any));
  const lastDate = new Date(Math.max.apply(null, dateObjects as any));

  const startYear = firstDate.getUTCFullYear();
  const endYear = lastDate.getUTCFullYear();
  
  const years = [];
  for (let i = endYear; i >= startYear; i--) {
    years.push(i);
  }

  const allValues = Object.values(data).filter((v): v is number => typeof v === 'number');
  const positiveValues = allValues.filter(v => v > 0);
  const negativeValues = allValues.filter(v => v < 0).map(v => Math.abs(v));
  
  const maxWords = Math.max(...positiveValues, 1);
  const maxDeleted = Math.max(...negativeValues, 1);

  const getColor = (count: number | undefined) => {
    if (count === undefined) return 'bg-gray-900/50'; // No writing
    if (count === 0) return 'bg-emerald-900'; // Lightest green for zero net change

    if (count > 0) {
      const intensity = count / maxWords;
      if (intensity < 0.33) return 'bg-emerald-700';
      if (intensity < 0.66) return 'bg-emerald-600';
      return 'bg-emerald-500';
    } else { // count < 0
      const intensity = Math.abs(count) / maxDeleted;
      if (intensity < 0.33) return 'bg-red-700';
      if (intensity < 0.66) return 'bg-red-600';
      return 'bg-red-500';
    }
  };

  const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="w-full">
      {years.map(year => {
        const yearStartDate = new Date(Date.UTC(year, 0, 1));
        const firstDayOfWeek = yearStartDate.getUTCDay();
        
        const daysInGrid = [];
        let currentDate = new Date(yearStartDate);
        currentDate.setUTCDate(currentDate.getUTCDate() - firstDayOfWeek);

        for (let i = 0; i < 53 * 7; i++) {
          daysInGrid.push(new Date(currentDate));
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        const monthLabelPositions = monthLabels.map((label, index) => {
            const firstOfMonth = new Date(Date.UTC(year, index, 1));

            // Find which week column contains the 1st of the month.
            // The grid starts on the Sunday before/on Jan 1st and flows in columns.
            let weekIndex = -1;
            for (let w = 0; w < 53; w++) {
              const weekStart = daysInGrid[w * 7];
              const weekEnd = daysInGrid[w * 7 + 6];
              if (!weekStart || !weekEnd) continue;
              
              // Check if the 1st of this month falls within this week column
              if (firstOfMonth >= weekStart && firstOfMonth <= weekEnd) {
                weekIndex = w;
                break;
              }
            }

            if (weekIndex < 0 || weekIndex >= 53) return null;

            return { label, week: weekIndex };
          }).filter((p): p is {label: string; week: number;} => p !== null);


        return (
          <div key={year} className="mb-10">
            <h3 className="text-xl font-semibold mb-4 text-gray-100">{year}</h3>
            <div className="flex gap-3">
                <div className="grid grid-rows-7 gap-1 text-xs text-gray-500 text-right pt-6">
                    {dayLabels.map((label, index) => <div key={index} className="h-4 leading-4">{label}</div>)}
                </div>
                <div className="relative flex-grow">
                    <div className="absolute top-0 left-0 h-6 w-full flex gap-1">
                        {Array.from({ length: 53 }).map((_, weekIdx) => {
                            const monthLabel = monthLabelPositions.find(p => p.week === weekIdx);
                            return (
                                <div key={weekIdx} className="w-4 flex-shrink-0 text-xs text-gray-400">
                                    {monthLabel ? monthLabel.label : ''}
                                </div>
                            );
                        })}
                    </div>
                    <div className="grid grid-rows-7 gap-1 mt-6" style={{ gridTemplateColumns: 'repeat(53, 1rem)', gridAutoFlow: 'column' }}>
                      {daysInGrid.slice(0, 53 * 7).map((date, idx) => {
                        if (date.getUTCFullYear() !== year) {
                          return <div key={`empty-${idx}`} className="h-4 w-4 bg-transparent rounded-sm" />;
                        }

                        const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
                        const count = data[dateKey];
                        const tooltipText = count !== undefined
                          ? `${date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}: ${count.toLocaleString()} words`
                          : `${date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}: No activity`;

                        return (
                          <div key={dateKey} className="group relative">
                            <div className={`h-4 w-4 ${getColor(count)} rounded-sm transition-transform duration-150 group-hover:scale-125 group-hover:ring-2 group-hover:ring-offset-2 group-hover:ring-offset-gray-800 group-hover:ring-emerald-400 z-10 relative`}></div>
                            <div className="absolute z-20 bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 text-xs text-white bg-gray-900/90 backdrop-blur-sm border border-gray-600 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {tooltipText}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                </div>
            </div>
          </div>
        );
      })}
       <div className="flex items-center justify-end text-xs text-gray-400 mt-4 w-full space-x-1">
            <span>Less</span>
            <div className="h-4 w-4 bg-red-500 rounded-sm" title="Heavy Deletion"></div>
            <div className="h-4 w-4 bg-red-600 rounded-sm" title="Moderate Deletion"></div>
            <div className="h-4 w-4 bg-red-700 rounded-sm" title="Light Deletion"></div>
            <div className="h-4 w-4 bg-gray-900/50 border border-gray-700 rounded-sm mx-1" title="No Activity"></div>
            <div className="h-4 w-4 bg-emerald-900 rounded-sm" title="Net Zero Words"></div>
            <div className="h-4 w-4 bg-emerald-700 rounded-sm" title="Light Addition"></div>
            <div className="h-4 w-4 bg-emerald-600 rounded-sm" title="Moderate Addition"></div>
            <div className="h-4 w-4 bg-emerald-500 rounded-sm" title="Heavy Addition"></div>
            <span>More</span>
        </div>
    </div>
  );
};

export default CalendarHeatmap;