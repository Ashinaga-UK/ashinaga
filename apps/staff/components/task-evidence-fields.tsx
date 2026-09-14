'use client';

import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function TaskEvidenceFields({
  phase,
  onPhaseChange,
  requiresResponse,
  requiresAttachment,
  requiresLink,
  onRequiresResponseChange,
  onRequiresAttachmentChange,
  onRequiresLinkChange,
}: {
  phase: string;
  onPhaseChange: (value: string) => void;
  requiresResponse: boolean;
  requiresAttachment: boolean;
  requiresLink: boolean;
  onRequiresResponseChange: (value: boolean) => void;
  onRequiresAttachmentChange: (value: boolean) => void;
  onRequiresLinkChange: (value: boolean) => void;
}) {
  const completeOnly = !requiresResponse && !requiresAttachment && !requiresLink;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="taskPhase">Programme phase</Label>
        <Input
          id="taskPhase"
          value={phase}
          onChange={(e) => onPhaseChange(e.target.value)}
          placeholder="Optional, e.g. English or Orientation"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">What does this task need?</p>
        <p className="text-sm text-muted-foreground">
          Leave all unchecked if the candidate only needs to mark it complete.
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              id="task-requires-response"
              checked={requiresResponse}
              onCheckedChange={(checked) => onRequiresResponseChange(checked === true)}
            />
            <Label htmlFor="task-requires-response">Written response</Label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              id="task-requires-attachment"
              checked={requiresAttachment}
              onCheckedChange={(checked) => onRequiresAttachmentChange(checked === true)}
            />
            <Label htmlFor="task-requires-attachment">File upload</Label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              id="task-requires-link"
              checked={requiresLink}
              onCheckedChange={(checked) => onRequiresLinkChange(checked === true)}
            />
            <Label htmlFor="task-requires-link">Link</Label>
          </div>
        </div>
        {completeOnly && (
          <p className="text-xs text-muted-foreground">Complete-only: no evidence fields shown.</p>
        )}
      </div>
    </div>
  );
}
