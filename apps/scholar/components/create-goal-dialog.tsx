'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { createGoal, type CreateGoalData } from '../lib/api/goals';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateGoalDialog({ open, onOpenChange, onSuccess }: CreateGoalDialogProps) {
  const [formData, setFormData] = useState<CreateGoalData>({
    title: '',
    description: '',
    category: 'academic',
    targetDate: '',
    progress: 0,
    status: 'pending',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title || !formData.targetDate) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await createGoal(formData);
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'academic',
        targetDate: '',
        progress: 0,
        status: 'pending',
      });
    } catch (err) {
      setError('Failed to create goal. Please try again.');
      console.error('Error creating goal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'academic':
        return '🎓';
      case 'career':
        return '💼';
      case 'leadership':
        return '👥';
      case 'personal':
        return '🌟';
      case 'community':
        return '🤝';
      default:
        return '📌';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
            <DialogDescription>
              Set a new goal to track your progress and achieve your aspirations
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">
                Goal Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Complete my thesis research"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your goal in detail..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">
                    <span className="flex items-center gap-2">
                      <span>{getCategoryEmoji('academic')}</span>
                      Academic
                    </span>
                  </SelectItem>
                  <SelectItem value="career">
                    <span className="flex items-center gap-2">
                      <span>{getCategoryEmoji('career')}</span>
                      Career
                    </span>
                  </SelectItem>
                  <SelectItem value="leadership">
                    <span className="flex items-center gap-2">
                      <span>{getCategoryEmoji('leadership')}</span>
                      Leadership
                    </span>
                  </SelectItem>
                  <SelectItem value="personal">
                    <span className="flex items-center gap-2">
                      <span>{getCategoryEmoji('personal')}</span>
                      Personal
                    </span>
                  </SelectItem>
                  <SelectItem value="community">
                    <span className="flex items-center gap-2">
                      <span>{getCategoryEmoji('community')}</span>
                      Community
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Date */}
            <div className="grid gap-2">
              <Label htmlFor="targetDate">
                Target Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                disabled={isSubmitting}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Initial Progress */}
            <div className="grid gap-2">
              <Label htmlFor="progress">Initial Progress (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={formData.progress || 0}
                onChange={(e) =>
                  setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })
                }
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                Set an initial progress value if you've already started working on this goal
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Goal'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}