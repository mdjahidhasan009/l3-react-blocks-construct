import { ActivityLogToolbar } from 'features/activity-log-v2/components/activity-log-toobar/activity-log-toolbar';
import { activities } from 'features/activity-log-v2/components/activity-log-timeline/activity-data';
import ActivityLogTimeline from 'features/activity-log-v2/components/activity-log-timeline/activity-log-timeline';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';

/**
 * ActivityLogPage2 Component
 *
 * A timeline page that displays filtered user activity logs with search,
 * date range, and category filtering. Uses local state to manage filter criteria
 * and automatically applies filtering logic on updates.
 *
 * Features:
 * - Search query filtering
 * - Date range filtering
 * - Category-based filtering with normalization
 * - Dynamic UI updates via `ActivityLogToolbar` and `ActivityLogTimeline` components
 *
 * @returns {JSX.Element} The full activity log timeline UI with filtering controls
 *
 * @example
 * <ActivityLogPage2 />
 */

const transformCategory = (category: string): string => {
  return category.toLowerCase().replace(/\s+/g, '_');
};

export default function ActivityLogPage2() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [filteredActivities, setFilteredActivities] = useState(activities);

  const filterActivities = (
    query: string,
    range: DateRange | undefined,
    categories: string[]
  ) => {
    let filtered = activities;

    if (range?.from && range?.to) {
      const fromDate = range.from.getTime();
      const toDate = range.to.getTime();
      filtered = filtered.filter((activity) => {
        const activityDate = new Date(activity.date).getTime();
        return activityDate >= fromDate && activityDate <= toDate;
      });
    }

    if (query) {
      filtered = filtered
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            item.description.toLowerCase().includes(query.toLowerCase())
          ),
        }))
        .filter((group) => group.items.length > 0);
    }

    if (categories.length > 0) {
      filtered = filtered
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            categories.includes(transformCategory(item.category))
          ),
        }))
        .filter((group) => group.items.length > 0);
    }

    setFilteredActivities(filtered);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    filterActivities(query, dateRange, selectedCategory);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    filterActivities(searchQuery, range, selectedCategory);
  };

  const handleCategoryChange = (categories: string[]) => {
    setSelectedCategory(categories);
    filterActivities(searchQuery, dateRange, categories);
  };

  return (
    <div className="flex w-full flex-col">
      <div className="mb-[18px] flex flex-col sm:flex-row sm:items-center sm:justify-between md:mb-[32px]">
        <h3 className="text-2xl font-bold tracking-tight text-high-emphasis">Timeline</h3>
        <ActivityLogToolbar
          onSearchChange={handleSearchChange}
          onDateRangeChange={handleDateRangeChange}
          onCategoryChange={handleCategoryChange}
          selectedCategory={selectedCategory}
        />
      </div>
      <ActivityLogTimeline activities={filteredActivities} />
    </div>
  );
}
