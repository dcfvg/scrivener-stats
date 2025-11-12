import React, { useState } from 'react';

interface CalendarHeatmapProps {
  data: { [key: string]: number };
}

type YearType = 'calendar' | 'academic';

interface YearPeriod {
  label: string;
  startDate: Date;
  endDate: Date;
}

const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ data }) => {
  const [yearType, setYearType] = useState<YearType>('calendar');
  
  const dateKeys = Object.keys(data);
  if (dateKeys.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">No daily data to display.</p>;
  }

  const dateObjects = dateKeys.map(key => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  });

  const firstDate = new Date(Math.min.apply(null, dateObjects as any));
  const lastDate = new Date(Math.max.apply(null, dateObjects as any));

  // Generate year periods based on type
  const getYearPeriods = (): YearPeriod[] => {
    const periods: YearPeriod[] = [];
    
    if (yearType === 'calendar') {
      const startYear = firstDate.getUTCFullYear();
      const endYear = lastDate.getUTCFullYear();
      
      for (let year = endYear; year >= startYear; year--) {
        periods.push({
          label: `${year}`,
          startDate: new Date(Date.UTC(year, 0, 1)),
          endDate: new Date(Date.UTC(year, 11, 31))
        });
      }
    } else {
      // Academic years (October to September)
      const startYear = firstDate.getUTCMonth() >= 9 ? firstDate.getUTCFullYear() : firstDate.getUTCFullYear() - 1;
      const endYear = lastDate.getUTCMonth() >= 9 ? lastDate.getUTCFullYear() : lastDate.getUTCFullYear() - 1;
      
      for (let year = endYear; year >= startYear; year--) {
        periods.push({
          label: `${year}-${year + 1}`,
          startDate: new Date(Date.UTC(year, 9, 1)), // October 1st
          endDate: new Date(Date.UTC(year + 1, 8, 30)) // September 30th
        });
      }
    }
    
    return periods;
  };
  
  const yearPeriods = getYearPeriods();

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
  
  // Get month labels in the correct order based on year type
  const getOrderedMonthLabels = () => {
    if (yearType === 'academic') {
      // Academic year: Oct, Nov, Dec, Jan, Feb, ..., Sep
      return ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
    }
    return monthLabels; // Calendar year: Jan, Feb, ..., Dec
  };
  
  const orderedMonthLabels = getOrderedMonthLabels();

  return (
    <div className="w-full">
      {/* Toggle buttons */}
      <div className="flex justify-end mb-6 space-x-2">
        <button
          onClick={() => setYearType('calendar')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            yearType === 'calendar'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Calendar Year
        </button>
        <button
          onClick={() => setYearType('academic')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            yearType === 'academic'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Academic Year
        </button>
      </div>

      {yearPeriods.map(period => {
        const yearStartDate = period.startDate;
        const yearEndDate = period.endDate;
        const firstDayOfWeek = yearStartDate.getUTCDay();
        
        // For current period, use today as the end date instead of the period end
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const effectiveEndDate = yearEndDate > today ? today : yearEndDate;
        
        // Calculate productivity rate for this period
        const periodDates = dateKeys.filter(key => {
          const [y, m, d] = key.split('-').map(Number);
          const date = new Date(Date.UTC(y, m - 1, d));
          return date >= yearStartDate && date <= yearEndDate;
        });
        const totalDaysInPeriod = Math.ceil((effectiveEndDate.getTime() - yearStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const yearProductivityRate = totalDaysInPeriod > 0 ? Math.round((periodDates.length / totalDaysInPeriod) * 100) : 0;
        
        const daysInGrid = [];
        let currentDate = new Date(yearStartDate);
        currentDate.setUTCDate(currentDate.getUTCDate() - firstDayOfWeek);

        for (let i = 0; i < 53 * 7; i++) {
          daysInGrid.push(new Date(currentDate));
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        const monthLabelPositions = orderedMonthLabels.map((label, index) => {
            // Calculate the actual month and year for this label
            let monthYear = yearStartDate.getUTCFullYear();
            let monthIndex: number;
            
            if (yearType === 'academic') {
              // For academic year: index 0=Oct, 1=Nov, 2=Dec, 3=Jan(next year), etc.
              monthIndex = (index + 9) % 12; // Oct=9, Nov=10, Dec=11, Jan=0, Feb=1, etc.
              if (index >= 3) { // Jan-Sep are in the next calendar year
                monthYear = yearStartDate.getUTCFullYear() + 1;
              }
            } else {
              // For calendar year: index matches month directly
              monthIndex = index; // Jan=0, Feb=1, ..., Dec=11
            }
            
            const firstOfMonth = new Date(Date.UTC(monthYear, monthIndex, 1));

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
          <div key={period.label} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-100 dark:text-gray-100">{period.label}</h3>
              <div className="text-sm text-gray-400 dark:text-gray-400">
                <div>Writing Rate: <span className="font-semibold text-emerald-400">{yearProductivityRate}%</span></div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{periodDates.length} of {totalDaysInPeriod} days active</div>
              </div>
            </div>
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
                        // Check if date is outside the period
                        if (date < yearStartDate || date > yearEndDate) {
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