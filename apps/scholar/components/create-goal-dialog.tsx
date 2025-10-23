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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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
    category: 'academic_development',
    targetDate: '',
    relatedSkills: '',
    actionPlan: '',
    reviewNotes: '',
    completionScale: 1,
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
        category: 'academic_development',
        targetDate: '',
        relatedSkills: '',
        actionPlan: '',
        reviewNotes: '',
        completionScale: 1,
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
      case 'academic_development':
        return '🎓';
      case 'personal_development':
        return '🌟';
      case 'professional_development':
        return '💼';
      default:
        return '📌';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New LDF Item</DialogTitle>
            <DialogDescription>
              Set a new Learning Development Framework item to track your growth
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">
                Goal Summary <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Write down a SMART goal (one or two sentences max)"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isSubmitting}
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
                  <SelectItem value="academic_development">
                    <span className="flex items-center gap-2">
                      <span>{getCategoryEmoji('academic_development')}</span>
                      Academic Development
                    </span>
                  </SelectItem>
                  <SelectItem value="personal_development">
                    <span className="flex items-center gap-2">
                      <span>{getCategoryEmoji('personal_development')}</span>
                      Personal Development
                    </span>
                  </SelectItem>
                  <SelectItem value="professional_development">
                    <span className="flex items-center gap-2">
                      <span>{getCategoryEmoji('professional_development')}</span>
                      Professional Development
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Date */}
            <div className="grid gap-2">
              <Label htmlFor="targetDate">
                Target Deadline <span className="text-red-500">*</span>
              </Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                disabled={isSubmitting}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-500">
                Deadline for current term or max 1 year into the future
              </p>
            </div>

            {/* Related LDF Skills & Qualities */}
            <div className="grid gap-2">
              <Label htmlFor="relatedSkills">Related LDF Skills & Qualities</Label>
              <Textarea
                id="relatedSkills"
                placeholder="Note all that apply..."
                value={formData.relatedSkills || ''}
                onChange={(e) => setFormData({ ...formData, relatedSkills: e.target.value })}
                disabled={isSubmitting}
                rows={2}
              />
            </div>

            {/* Action Plan */}
            <div className="grid gap-2">
              <Label htmlFor="actionPlan">Action Plan</Label>
              <Textarea
                id="actionPlan"
                placeholder="How will these skills & qualities help you achieve your goal? What habits, routines, activities and milestones do you need to put in place?"
                value={formData.actionPlan || ''}
                onChange={(e) => setFormData({ ...formData, actionPlan: e.target.value })}
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            {/* Completion Scale */}
            <div className="grid gap-2">
              <Label htmlFor="completionScale">Completion Scale (1-10)</Label>
              <Input
                id="completionScale"
                type="number"
                min="1"
                max="10"
                value={formData.completionScale || 1}
                onChange={(e) =>
                  setFormData({ ...formData, completionScale: parseInt(e.target.value) || 1 })
                }
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">Between 1-10, how complete is this goal?</p>
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
                'Create LDF Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
