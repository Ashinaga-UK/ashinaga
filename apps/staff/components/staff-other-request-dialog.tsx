'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createStaffRequest, getAllActiveScholars, type Scholar } from '../lib/api-client';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

interface StaffOtherRequestDialogProps {
  onSuccess: () => void;
}

export function StaffOtherRequestDialog({ onSuccess }: StaffOtherRequestDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [scholarId, setScholarId] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [loadingScholars, setLoadingScholars] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || scholars.length > 0) return;

    setLoadingScholars(true);
    getAllActiveScholars()
      .then(setScholars)
      .catch(() => {
        toast({
          title: 'Could not load scholars',
          description: 'Close the dialog and try again.',
          variant: 'destructive',
        });
      })
      .finally(() => setLoadingScholars(false));
  }, [open, scholars.length, toast]);

  const reset = () => {
    setScholarId('');
    setDescription('');
    setPriority('medium');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedDescription = description.trim();

    if (!scholarId || trimmedDescription.length < 20) {
      toast({
        title: 'More information required',
        description: 'Select a scholar and enter a description of at least 20 characters.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await createStaffRequest({
        scholarId,
        description: trimmedDescription,
        priority,
      });
      toast({
        title: 'Request created',
        description: 'The Other request is now available in staff request management.',
      });
      reset();
      setOpen(false);
      onSuccess();
    } catch {
      toast({
        title: 'Could not create request',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && !submitting) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Other request
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Other request</DialogTitle>
          <DialogDescription>
            Create an internal request for a scholar when none of the standard categories apply.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="other-request-scholar">Scholar</Label>
            <Select value={scholarId} onValueChange={setScholarId} disabled={loadingScholars}>
              <SelectTrigger id="other-request-scholar">
                <SelectValue
                  placeholder={loadingScholars ? 'Loading scholars...' : 'Select a scholar'}
                />
              </SelectTrigger>
              <SelectContent>
                {scholars.map((scholar) => (
                  <SelectItem key={scholar.id} value={scholar.id}>
                    {scholar.name} ({scholar.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="other-request-priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as 'high' | 'medium' | 'low')}
            >
              <SelectTrigger id="other-request-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="other-request-description">Description</Label>
            <Textarea
              id="other-request-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explain the request and any action staff should take..."
              maxLength={2000}
              className="min-h-28"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 20 characters · {description.length}/2000
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loadingScholars}>
              {submitting ? 'Creating...' : 'Create request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
