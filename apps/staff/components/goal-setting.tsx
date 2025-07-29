'use client';

import type React from 'react';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, Target, Save } from 'lucide-react';

interface GoalSettingProps {
  trigger?: React.ReactNode;
  preselectedScholarId?: string;
}

// Mock scholars data
const mockScholars = [
  {
    id: 'SC001',
    name: 'Sarah Chen',
    program: 'Computer Science',
    year: 'Year 2',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: 'MJ002',
    name: 'Marcus Johnson',
    program: 'Medicine',
    year: 'Year 4',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: 'AO003',
    name: 'Amara Okafor',
    program: 'International Relations',
    year: 'Year 1',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: 'DK004',
    name: 'David Kim',
    program: 'Engineering',
    year: 'Year 3',
    avatar: '/placeholder.svg?height=32&width=32',
  },
];

interface Goal {
  title: string;
  description: string;
  category: string;
  targetDate: string;
  milestones: string[];
}

export function GoalSetting({ trigger, preselectedScholarId }: GoalSettingProps) {
  const [open, setOpen] = useState(false);
  const [selectedScholarId, setSelectedScholarId] = useState(preselectedScholarId || '');
  const [goals, setGoals] = useState<Goal[]>([
    {
      title: '',
      description: '',
      category: '',
      targetDate: '',
      milestones: [''],
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedScholar = mockScholars.find((s) => s.id === selectedScholarId);

  const addGoal = () => {
    setGoals([
      ...goals,
      {
        title: '',
        description: '',
        category: '',
        targetDate: '',
        milestones: [''],
      },
    ]);
  };

  const updateGoal = (index: number, field: keyof Goal, value: string | string[]) => {
    const updatedGoals = [...goals];
    updatedGoals[index] = { ...updatedGoals[index], [field]: value } as Goal;
    setGoals(updatedGoals);
  };

  const addMilestone = (goalIndex: number) => {
    const updatedGoals = [...goals];
    if (updatedGoals[goalIndex]) {
      updatedGoals[goalIndex].milestones.push('');
      setGoals(updatedGoals);
    }
  };

  const updateMilestone = (goalIndex: number, milestoneIndex: number, value: string) => {
    const updatedGoals = [...goals];
    if (
      updatedGoals[goalIndex] &&
      updatedGoals[goalIndex].milestones[milestoneIndex] !== undefined
    ) {
      updatedGoals[goalIndex].milestones[milestoneIndex] = value;
      setGoals(updatedGoals);
    }
  };

  const removeMilestone = (goalIndex: number, milestoneIndex: number) => {
    const updatedGoals = [...goals];
    if (updatedGoals[goalIndex]) {
      updatedGoals[goalIndex].milestones.splice(milestoneIndex, 1);
      setGoals(updatedGoals);
    }
  };

  const removeGoal = (index: number) => {
    if (goals.length > 1) {
      const updatedGoals = goals.filter((_, i) => i !== index);
      setGoals(updatedGoals);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('Goals set:', { scholarId: selectedScholarId, goals });
    setOpen(false);
    setIsSubmitting(false);
    // Reset form
    setGoals([
      {
        title: '',
        description: '',
        category: '',
        targetDate: '',
        milestones: [''],
      },
    ]);
    if (!preselectedScholarId) {
      setSelectedScholarId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700">
            <Target className="h-4 w-4 mr-2" />
            Set Goals
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Scholar Goals</DialogTitle>
          <DialogDescription>
            Create and assign goals to help scholars track their progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Scholar Selection */}
          {!preselectedScholarId && (
            <div className="space-y-2">
              <Label>Select Scholar *</Label>
              <Select value={selectedScholarId} onValueChange={setSelectedScholarId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a scholar" />
                </SelectTrigger>
                <SelectContent>
                  {mockScholars.map((scholar) => (
                    <SelectItem key={scholar.id} value={scholar.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={scholar.avatar || '/placeholder.svg'} />
                          <AvatarFallback>
                            {scholar.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{scholar.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {scholar.year}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected Scholar Display */}
          {selectedScholar && (
            <div className="bg-ashinaga-teal-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedScholar.avatar || '/placeholder.svg'} />
                  <AvatarFallback>
                    {selectedScholar.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">Setting goals for {selectedScholar.name}</h4>
                  <p className="text-sm text-gray-600">
                    {selectedScholar.program} • {selectedScholar.year}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Goals */}
          <div className="space-y-6">
            {goals.map((goal, goalIndex) => (
              <Card key={`goal-${goalIndex}-${goal.title || 'untitled'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Goal {goalIndex + 1}</CardTitle>
                    {goals.length > 1 && (
                      <Button variant="outline" size="sm" onClick={() => removeGoal(goalIndex)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`goal-title-${goalIndex}`}>Goal Title *</Label>
                      <Input
                        id={`goal-title-${goalIndex}`}
                        value={goal.title}
                        onChange={(e) => updateGoal(goalIndex, 'title', e.target.value)}
                        placeholder="e.g., Graduate with First Class Honours"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`goal-category-${goalIndex}`}>Category</Label>
                      <Select
                        value={goal.category}
                        onValueChange={(value) => updateGoal(goalIndex, 'category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="career">Career</SelectItem>
                          <SelectItem value="leadership">Leadership</SelectItem>
                          <SelectItem value="personal">Personal Development</SelectItem>
                          <SelectItem value="community">Community Impact</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`goal-description-${goalIndex}`}>Description</Label>
                    <Textarea
                      id={`goal-description-${goalIndex}`}
                      value={goal.description}
                      onChange={(e) => updateGoal(goalIndex, 'description', e.target.value)}
                      placeholder="Describe the goal and why it's important..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`goal-date-${goalIndex}`}>Target Completion Date</Label>
                    <Input
                      id={`goal-date-${goalIndex}`}
                      type="date"
                      value={goal.targetDate}
                      onChange={(e) => updateGoal(goalIndex, 'targetDate', e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Milestones</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addMilestone(goalIndex)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Milestone
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {goal.milestones.map((milestone, milestoneIndex) => (
                        <div
                          key={`milestone-${goalIndex}-${milestoneIndex}-${milestone}`}
                          className="flex gap-2"
                        >
                          <Input
                            value={milestone}
                            onChange={(e) =>
                              updateMilestone(goalIndex, milestoneIndex, e.target.value)
                            }
                            placeholder={`Milestone ${milestoneIndex + 1}`}
                          />
                          {goal.milestones.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeMilestone(goalIndex, milestoneIndex)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addGoal}
              className="w-full bg-transparent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Goal
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedScholarId || goals.some((g) => !g.title) || isSubmitting}
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting
              ? 'Setting Goals...'
              : `Set ${goals.length} Goal${goals.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
