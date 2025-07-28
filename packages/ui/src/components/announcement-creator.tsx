'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Badge } from './badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Plus, Send, X } from 'lucide-react';

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
  const [previewStudents, setPreviewStudents] = useState<any[]>([]);

  // Mock students data for filtering
  const allStudents = [
    {
      id: 'SC001',
      name: 'Sarah Chen',
      year: 'Year 2',
      program: 'Computer Science',
      university: 'Imperial College London',
      status: 'Active',
    },
    {
      id: 'MJ002',
      name: 'Marcus Johnson',
      year: 'Year 4',
      program: 'Medicine',
      university: 'University of Edinburgh',
      status: 'Active',
    },
    {
      id: 'AO003',
      name: 'Amara Okafor',
      year: 'Year 1',
      program: 'International Relations',
      university: 'LSE',
      status: 'Active',
    },
    {
      id: 'DK004',
      name: 'David Kim',
      year: 'Year 3',
      program: 'Engineering',
      university: 'Cambridge University',
      status: 'Active',
    },
    {
      id: 'JS005',
      name: 'Jennifer Smith',
      year: 'Year 1',
      program: 'Computer Science',
      university: 'Imperial College London',
      status: 'Active',
    },
    {
      id: 'AB006',
      name: 'Ahmed Ben',
      year: 'Year 2',
      program: 'Medicine',
      university: 'University of Edinburgh',
      status: 'Active',
    },
  ];

  const filterOptions = [
    { value: 'year', label: 'Year' },
    { value: 'program', label: 'Program' },
    { value: 'university', label: 'University' },
    { value: 'status', label: 'Status' },
  ];

  const filterValues = {
    year: ['Year 1', 'Year 2', 'Year 3', 'Year 4'],
    program: ['Computer Science', 'Medicine', 'Engineering', 'International Relations'],
    university: [
      'Imperial College London',
      'University of Edinburgh',
      'LSE',
      'Cambridge University',
    ],
    status: ['Active', 'Inactive', 'On Hold'],
  };

  // Function to filter students based on active filters
  const getFilteredStudents = () => {
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
          default:
            return true;
        }
      });
    });
  };

  useEffect(() => {
    setPreviewStudents(getFilteredStudents());
  }, [filters]);

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

  const handleSend = () => {
    // Here you would implement the actual sending logic
    console.log('Sending announcement:', { title, content, filters, recipients: previewStudents });
    setOpen(false);
    setTitle('');
    setContent('');
    setFilters([]);
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
                      {filterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {currentFilter && (
                    <Select value={currentFilterValue} onValueChange={setCurrentFilterValue}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {filterValues[currentFilter as keyof typeof filterValues]?.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
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
                {previewStudents.length > 0 ? (
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
            disabled={!title || !content || previewStudents.length === 0}
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Send to {previewStudents.length} Student{previewStudents.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
