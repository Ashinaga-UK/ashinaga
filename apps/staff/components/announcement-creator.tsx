'use client';

import { Plus, Send, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  type AnnouncementFilterOptions,
  type CreateAnnouncementData,
  createAnnouncement,
  getAnnouncementFilterOptions,
  getScholarsForFiltering,
  type ScholarFilter,
} from '../lib/api-client';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';

interface AnnouncementCreatorProps {
  trigger?: React.ReactNode;
}

export function AnnouncementCreator({ trigger }: AnnouncementCreatorProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [filters, setFilters] = useState<string[]>([]);
  const [currentFilter, setCurrentFilter] = useState('');
  const [currentFilterValue, setCurrentFilterValue] = useState('');
  const [previewStudents, setPreviewStudents] = useState<ScholarFilter[]>([]);
  const [allStudents, setAllStudents] = useState<ScholarFilter[]>([]);
  const [filterOptions, setFilterOptions] = useState<AnnouncementFilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const filterTypeOptions = [
    { value: 'year', label: 'Year' },
    { value: 'program', label: 'Program' },
    { value: 'university', label: 'University' },
    { value: 'status', label: 'Status' },
    { value: 'location', label: 'Location' },
  ];

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [scholarsData, filterOptionsData] = await Promise.all([
        getScholarsForFiltering(),
        getAnnouncementFilterOptions(),
      ]);
      setAllStudents(scholarsData);
      setFilterOptions(filterOptionsData);
      setPreviewStudents(scholarsData); // Show all students by default
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to filter students based on active filters
  const getFilteredStudents = useCallback(() => {
    if (filters.length === 0) return allStudents;

    return allStudents.filter((student) => {
      return filters.every((filter) => {
        const [filterType, filterValue] = filter.split(': ');
        switch (filterType) {
          case 'year':
            return student.year === filterValue;
          case 'program':
            return student.program === filterValue;
          case 'university':
            return student.university === filterValue;
          case 'status':
            return student.status === filterValue;
          case 'location':
            return student.location === filterValue;
          default:
            return true;
        }
      });
    });
  }, [filters, allStudents]);

  useEffect(() => {
    setPreviewStudents(getFilteredStudents());
  }, [getFilteredStudents]);

  const addFilter = () => {
    if (currentFilter && currentFilterValue) {
      const filterString = `${currentFilter}: ${currentFilterValue}`;
      if (!filters.includes(filterString)) {
        setFilters([...filters, filterString]);
      }
      setCurrentFilter('');
      setCurrentFilterValue('');
    }
  };

  const removeFilter = (filterToRemove: string) => {
    setFilters(filters.filter((filter) => filter !== filterToRemove));
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const announcementData: CreateAnnouncementData = {
        title,
        content,
        filters: filters.map((filter) => {
          const [filterType, filterValue] = filter.split(': ');
          return { filterType, filterValue };
        }),
      };

      await createAnnouncement(announcementData);
      console.log('Announcement sent successfully');
      setOpen(false);
      setTitle('');
      setContent('');
      setFilters([]);
    } catch (error) {
      console.error('Error sending announcement:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700">
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Announcement</DialogTitle>
          <DialogDescription>
            Send important updates and information to your scholars
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Announcement Title</Label>
            <Input
              id="title"
              placeholder="Enter announcement title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Message Content</Label>
            <Textarea
              id="content"
              placeholder="Write your announcement message here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <p className="text-sm text-gray-500">
              Basic formatting supported. For rich text editing, we'll add a WYSIWYG editor in the
              next update.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audience Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Target Audience</CardTitle>
                <CardDescription>
                  Filter which students will receive this announcement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Filter */}
                <div className="flex gap-2">
                  <Select value={currentFilter} onValueChange={setCurrentFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select filter" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {currentFilter && filterOptions && (
                    <Select value={currentFilterValue} onValueChange={setCurrentFilterValue}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {filterOptions[currentFilter as keyof AnnouncementFilterOptions]?.map(
                          (value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    onClick={addFilter}
                    disabled={!currentFilter || !currentFilterValue}
                    variant="outline"
                  >
                    Add Filter
                  </Button>
                </div>

                {/* Active Filters */}
                {filters.length > 0 && (
                  <div className="space-y-2">
                    <Label>Active Filters:</Label>
                    <div className="flex flex-wrap gap-2">
                      {filters.map((filter) => (
                        <Badge key={filter} variant="secondary" className="flex items-center gap-1">
                          {filter}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeFilter(filter)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {filters.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No filters applied - announcement will be sent to all students
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Student Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recipients Preview</CardTitle>
                <CardDescription>
                  {previewStudents.length} student{previewStudents.length !== 1 ? 's' : ''} will
                  receive this announcement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Loading scholars...</p>
                  </div>
                ) : previewStudents.length > 0 ? (
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Program</TableHead>
                          <TableHead>Year</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.program}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{student.year}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No students match the current filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!title || !content || previewStudents.length === 0 || sending}
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            {sending ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to {previewStudents.length} Student{previewStudents.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
