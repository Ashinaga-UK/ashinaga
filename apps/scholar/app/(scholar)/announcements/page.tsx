'use client';

import { AlertCircle, Bell } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useMyAnnouncements } from '../../../lib/hooks/use-queries';

export default function AnnouncementsPage() {
  const [yearFilter, setYearFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { data: announcements, isLoading, error } = useMyAnnouncements({ sortOrder });
  const filterOptions = useMemo(() => {
    const options = {
      years: new Set<string>(),
      programs: new Set<string>(),
      universities: new Set<string>(),
    };

    announcements?.forEach((announcement) => {
      announcement.filters?.forEach((filter) => {
        if (filter.type === 'year') options.years.add(filter.value);
        if (filter.type === 'program') options.programs.add(filter.value);
        if (filter.type === 'university') options.universities.add(filter.value);
      });
    });

    return {
      years: Array.from(options.years).sort(),
      programs: Array.from(options.programs).sort(),
      universities: Array.from(options.universities).sort(),
    };
  }, [announcements]);
  const filteredAnnouncements = useMemo(() => {
    const selectedFilters = [
      ['year', yearFilter],
      ['program', programFilter],
      ['university', universityFilter],
    ].filter((filter) => filter[1] !== 'all');

    if (!announcements || selectedFilters.length === 0) {
      return announcements || [];
    }

    return announcements.filter((announcement) =>
      selectedFilters.every(([type, value]) =>
        announcement.filters?.some((filter) => filter.type === type && filter.value === value)
      )
    );
  }, [announcements, yearFilter, programFilter, universityFilter]);

  const clearFilters = () => {
    setYearFilter('all');
    setProgramFilter('all');
    setUniversityFilter('all');
    setSortOrder('desc');
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Announcements</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {filterOptions.years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {filterOptions.programs.map((program) => (
              <SelectItem key={program} value={program}>
                {program}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={universityFilter} onValueChange={setUniversityFilter}>
          <SelectTrigger>
            <SelectValue placeholder="University" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Universities</SelectItem>
            {filterOptions.universities.map((university) => (
              <SelectItem key={university} value={university}>
                {university}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Most Recent</SelectItem>
            <SelectItem value="asc">Oldest First</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={clearFilters}>
          Reset
        </Button>
      </div>

      {isLoading ? (
        <Card className="border-ashinaga-teal-100 dark:border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4">
                  <div className="w-full h-full rounded-full border-4 border-ashinaga-teal-200 border-t-ashinaga-teal-600 animate-spin" />
                </div>
                <p className="text-muted-foreground">Loading announcements...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-600 dark:text-red-400">
                Failed to load announcements. Please try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : filteredAnnouncements.length === 0 ? (
        <Card className="border-ashinaga-teal-100 dark:border-border">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No announcements found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try changing your filters or check back later for updates from staff
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <Card key={announcement.id} className="border-ashinaga-teal-100 dark:border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <span>From {announcement.createdBy}</span>
                      <span>•</span>
                      <span>
                        {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
