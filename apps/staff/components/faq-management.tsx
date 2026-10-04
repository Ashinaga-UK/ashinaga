'use client';

import { useQueryClient } from '@tanstack/react-query';
import { HelpCircle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createFaq,
  deleteFaq,
  type Faq,
  type FaqAudience,
  type SaveFaqData,
  updateFaq,
} from '../lib/api-client';
import { useFaqs } from '../lib/hooks/use-queries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Badge } from './ui/badge';
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
import { useToast } from './ui/use-toast';

type AudienceFilter = 'all' | FaqAudience;

export const FAQ_GENERAL_CATEGORY = 'General';

export function faqCategoryOptions(faqs: Array<{ category: string | null }>): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  let hasGeneral = false;

  for (const faq of faqs) {
    const key = faq.category?.trim();
    if (!key) {
      hasGeneral = true;
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      options.push(key);
    }
  }

  if (hasGeneral) {
    options.push(FAQ_GENERAL_CATEGORY);
  }

  return options;
}

const audienceLabels: Record<FaqAudience, string> = {
  prep_year: 'Prep Year',
  scholar: 'Scholar',
};

const emptyForm: SaveFaqData = {
  audience: 'prep_year',
  category: '',
  question: '',
  answer: '',
  sortOrder: 0,
};

function audienceBadgeClass(audience: FaqAudience) {
  return audience === 'prep_year'
    ? 'border-ashinaga-teal-200 bg-ashinaga-teal-50 text-ashinaga-teal-700'
    : 'border-ashinaga-green-200 bg-ashinaga-green-50 text-ashinaga-green-700';
}

export function FaqManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const {
    data: faqs = [],
    isLoading,
    error,
  } = useFaqs(audienceFilter === 'all' ? undefined : audienceFilter);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [form, setForm] = useState<SaveFaqData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedFaqs = useMemo(
    () =>
      [...faqs].sort((left, right) => {
        if (left.audience !== right.audience) {
          return left.audience.localeCompare(right.audience);
        }
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }
        return left.question.localeCompare(right.question);
      }),
    [faqs]
  );
  const categoryOptions = useMemo(() => faqCategoryOptions(sortedFaqs), [sortedFaqs]);
  const showCategoryFilters = categoryOptions.some((option) => option !== FAQ_GENERAL_CATEGORY);
  const visibleFaqs = useMemo(() => {
    if (categoryFilter === 'all') return sortedFaqs;
    if (categoryFilter === FAQ_GENERAL_CATEGORY) {
      return sortedFaqs.filter((faq) => !faq.category?.trim());
    }
    return sortedFaqs.filter((faq) => faq.category?.trim() === categoryFilter);
  }, [categoryFilter, sortedFaqs]);

  useEffect(() => {
    if (categoryFilter !== 'all' && !categoryOptions.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [categoryFilter, categoryOptions]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (faq: Faq) => {
    setEditing(faq);
    setForm({
      audience: faq.audience,
      category: faq.category ?? '',
      question: faq.question,
      answer: faq.answer,
      sortOrder: faq.sortOrder,
    });
    setDialogOpen(true);
  };

  const invalidateFaqs = async () => {
    await queryClient.invalidateQueries({ queryKey: ['faqs'] });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const question = form.question.trim();
    const answer = form.answer.trim();
    if (!question || !answer) {
      toast({
        title: 'Question and answer are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload: SaveFaqData = {
        audience: form.audience,
        category: form.category?.trim() ? form.category.trim() : null,
        question,
        answer,
        sortOrder: form.sortOrder ?? 0,
      };
      if (editing) {
        await updateFaq(editing.id, payload);
        toast({ title: 'FAQ updated' });
      } else {
        await createFaq(payload);
        toast({ title: 'FAQ added' });
      }
      setDialogOpen(false);
      await invalidateFaqs();
    } catch {
      toast({
        title: editing ? 'Could not update FAQ' : 'Could not add FAQ',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (faqId: string) => {
    setDeletingId(faqId);
    try {
      await deleteFaq(faqId);
      toast({ title: 'FAQ deleted' });
      await invalidateFaqs();
    } catch {
      toast({
        title: 'Could not delete FAQ',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={audienceFilter}
          onValueChange={(value) => setAudienceFilter(value as AudienceFilter)}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Filter FAQs by audience">
            <SelectValue placeholder="Audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All audiences</SelectItem>
            <SelectItem value="prep_year">Prep Year</SelectItem>
            <SelectItem value="scholar">Scholar</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add FAQ
        </Button>
      </div>
      {showCategoryFilters ? (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="toolbar"
          aria-label="Filter FAQs by category"
        >
          {['all', ...categoryOptions].map((option) => {
            const label = option === 'all' ? 'All' : option;
            const selected = categoryFilter === option;
            return (
              <Button
                key={option}
                type="button"
                variant={selected ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 rounded-full"
                aria-pressed={selected}
                onClick={() => setCategoryFilter(option)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading FAQs...
        </div>
      ) : error ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          Could not load FAQs.
        </div>
      ) : sortedFaqs.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-4 text-center">
          <HelpCircle className="mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No FAQs yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add programme-specific questions when staff copy is ready.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {visibleFaqs.map((faq) => (
            <li key={faq.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={audienceBadgeClass(faq.audience)}>
                    {audienceLabels[faq.audience]}
                  </Badge>
                  {faq.category ? (
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {faq.category}
                    </span>
                  ) : null}
                </div>
                <p className="break-words font-medium text-foreground">{faq.question}</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
              <div className="flex shrink-0 gap-2 self-end sm:self-start">
                <Button type="button" variant="outline" size="sm" onClick={() => openEdit(faq)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deletingId === faq.id}
                    >
                      {deletingId === faq.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this FAQ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Students will no longer see this question.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void handleDelete(faq.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl flex-col overflow-y-auto pb-8">
          <form onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-col pb-2">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
              <DialogDescription>
                Published immediately to the matching student audience. Do not invent programme
                policy.
              </DialogDescription>
            </DialogHeader>
            <div className="grid min-w-0 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="faq-audience">Audience</Label>
                <Select
                  value={form.audience}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, audience: value as FaqAudience }))
                  }
                >
                  <SelectTrigger id="faq-audience" className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prep_year">Prep Year</SelectItem>
                    <SelectItem value="scholar">Scholar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-category">Category (optional)</Label>
                <Input
                  id="faq-category"
                  value={form.category ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                  placeholder="Tasks, Documents, Annual review"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-question">Question</Label>
                <Input
                  id="faq-question"
                  value={form.question}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, question: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-answer">Answer</Label>
                <Textarea
                  id="faq-answer"
                  value={form.answer}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, answer: event.target.value }))
                  }
                  rows={5}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-sort-order">Sort order</Label>
                <Input
                  id="faq-sort-order"
                  type="number"
                  min={0}
                  max={9999}
                  value={form.sortOrder ?? 0}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2 sm:space-x-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editing ? 'Save FAQ' : 'Add FAQ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
