'use client';

import * as React from 'react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { ScholarOnboarding } from './scholar-onboarding';

interface OnboardScholarDialogProps {
  trigger: React.ReactNode;
}

export function OnboardScholarDialog({ trigger }: OnboardScholarDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-6">
        <ScholarOnboarding onBack={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
