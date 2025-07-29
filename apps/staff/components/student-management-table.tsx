'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Checkbox } from './ui/checkbox';
import { Search, MoreHorizontal, Eye, Plus, Target, Users } from 'lucide-react';
import { TaskAssignment } from './task-assignment';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { GoalSetting } from './goal-setting';
import { BulkTaskAssignment } from './bulk-task-assignment';

// Extended mock data for demonstration
const mockStudents = [
  {
    id: 'SC001',
    name: 'Sarah Chen',
    email: 'sarah.chen@student.ac.uk',
    program: 'Computer Science',
    year: 'Year 2',
    university: 'Imperial College London',
    goals: 3,
    completedGoals: 1,
    status: 'Active',
    lastActivity: '2025-01-02',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: 'MJ002',
    name: 'Marcus Johnson',
    email: 'marcus.j@student.ac.uk',
    program: 'Medicine',
    year: 'Foundation',
    university: 'University of Edinburgh',
    goals: 4,
    completedGoals: 2,
    status: 'Active',
    lastActivity: '2025-01-01',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: 'AO003',
    name: 'Amara Okafor',
    email: 'amara.okafor@student.ac.uk',
    program: 'International Relations',
    year: 'Year 1',
    university: 'LSE',
    goals: 2,
    completedGoals: 0,
    status: 'Active',
    lastActivity: '2024-12-30',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: 'DK004',
    name: 'David Kim',
    email: 'david.kim@student.ac.uk',
    program: 'Engineering',
    year: 'Pre-University',
    university: 'Cambridge University',
    goals: 5,
    completedGoals: 3,
    status: 'Active',
    lastActivity: '2025-01-03',
    avatar: '/placeholder.svg?height=32&width=32',
  },
];

interface StudentManagementTableProps {
  onViewProfile: (studentId: string) => void;
  onOnboardStudent: () => void;
}

export function StudentManagementTable({
  onViewProfile,
  onOnboardStudent,
}: StudentManagementTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [students] = useState(mockStudents);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const [programFilter, setProgramFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.program.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.year.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProgram = programFilter === 'all' || student.program === programFilter;
    const matchesYear = yearFilter === 'all' || student.year === yearFilter;
    const matchesUniversity = universityFilter === 'all' || student.university === universityFilter;

    return matchesSearch && matchesProgram && matchesYear && matchesUniversity;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map((s) => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
    }
  };

  const isAllSelected =
    filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length;
  const isIndeterminate =
    selectedStudents.length > 0 && selectedStudents.length < filteredStudents.length;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {selectedStudents.length > 0 && (
            <BulkTaskAssignment
              selectedStudentIds={selectedStudents}
              trigger={
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Task to Selected ({selectedStudents.length})
                </Button>
              }
            />
          )}
          <BulkTaskAssignment
            filteredStudents={filteredStudents}
            trigger={
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Assign to All Filtered ({filteredStudents.length})
              </Button>
            }
          />
          <Button
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
            onClick={onOnboardStudent}
          >
            <Plus className="h-4 w-4 mr-2" />
            Onboard New Students
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            <SelectItem value="Computer Science">Computer Science</SelectItem>
            <SelectItem value="Medicine">Medicine</SelectItem>
            <SelectItem value="Engineering">Engineering</SelectItem>
            <SelectItem value="International Relations">International Relations</SelectItem>
          </SelectContent>
        </Select>

        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            <SelectItem value="Pre-University">Pre-University</SelectItem>
            <SelectItem value="Foundation">Foundation</SelectItem>
            <SelectItem value="Year 1">Year 1</SelectItem>
            <SelectItem value="Year 2">Year 2</SelectItem>
            <SelectItem value="Year 3">Year 3</SelectItem>
          </SelectContent>
        </Select>

        <Select value={universityFilter} onValueChange={setUniversityFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Universities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Universities</SelectItem>
            <SelectItem value="Imperial College London">Imperial College London</SelectItem>
            <SelectItem value="University of Edinburgh">University of Edinburgh</SelectItem>
            <SelectItem value="LSE">LSE</SelectItem>
            <SelectItem value="Cambridge University">Cambridge University</SelectItem>
          </SelectContent>
        </Select>

        {(programFilter !== 'all' || yearFilter !== 'all' || universityFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setProgramFilter('all');
              setYearFilter('all');
              setUniversityFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Students Table */}
      <div className="border border-ashinaga-teal-100 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  ref={(el) => {
                    if (el && 'indeterminate' in el) {
                      (el as any).indeterminate = isIndeterminate;
                    }
                  }}
                />
              </TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>University</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Goals Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow
                key={student.id}
                className="hover:bg-ashinaga-teal-50 cursor-pointer"
                onClick={() => onViewProfile(student.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={(checked) =>
                      handleSelectStudent(student.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={student.avatar || '/placeholder.svg'} />
                      <AvatarFallback>
                        {student.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{student.program}</TableCell>
                <TableCell>{student.university}</TableCell>
                <TableCell>
                  <Badge variant="outline">{student.year}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-ashinaga-teal-600 h-2 rounded-full"
                        style={{
                          width: `${(student.completedGoals / student.goals) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {student.completedGoals}/{student.goals}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(student.status)}>{student.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">{student.lastActivity}</TableCell>
                <TableCell className="text-right">
                  {/* biome-ignore lint/a11y/useSemanticElements: div with role="group" is appropriate for interactive action buttons container */}
                  <div
                    className="flex items-center gap-2"
                    role="group"
                    aria-label="Student actions"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                      }
                    }}
                  >
                    <TaskAssignment
                      trigger={
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-1" />
                          Task
                        </Button>
                      }
                      preselectedStudentId={student.id}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewProfile(student.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <GoalSetting
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Target className="h-4 w-4 mr-2" />
                              Set Goals
                            </DropdownMenuItem>
                          }
                          preselectedStudentId={student.id}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
