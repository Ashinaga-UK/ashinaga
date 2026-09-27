'use client';

import { AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Faq } from '../lib/api-client';
import { useMyFaqs } from '../lib/hooks/use-queries';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Button } from './ui/button';

export const FAQ_GENERAL_CATEGORY = 'General';

export function groupFaqsByCategory(faqs: Faq[]): Array<{ category: string | null; items: Faq[] }> {
  const groups = new Map<string | null, Faq[]>();

  for (const faq of faqs) {
    const key = faq.category?.trim() ? faq.category.trim() : null;
    const items = groups.get(key) ?? [];
    items.push(faq);
    groups.set(key, items);
  }

  return Array.from(groups, ([category, items]) => ({ category, items }));
}

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

export function ScholarFaqs() {
  const { data: faqs = [], isLoading, error } = useMyFaqs();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const groups = useMemo(() => groupFaqsByCategory(faqs), [faqs]);
  const categoryOptions = useMemo(() => faqCategoryOptions(faqs), [faqs]);
  const hasCategories = groups.some((group) => group.category);
  const showCategoryFilters = categoryOptions.some((option) => option !== FAQ_GENERAL_CATEGORY);
  const visibleGroups = useMemo(() => {
    if (categoryFilter === 'all') return groups;
    if (categoryFilter === FAQ_GENERAL_CATEGORY) {
      return groups.filter((group) => group.category === null);
    }
    return groups.filter((group) => group.category === categoryFilter);
  }, [categoryFilter, groups]);

  useEffect(() => {
    if (categoryFilter !== 'all' && !categoryOptions.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [categoryFilter, categoryOptions]);

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ashinaga-teal-100 bg-white text-ashinaga-teal-700 dark:border-border dark:bg-card dark:text-ashinaga-teal-300 sm:h-10 sm:w-10">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">FAQs</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Answers for your current programme stage.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-ashinaga-teal-100 bg-white/50 text-sm text-muted-foreground dark:border-gray-700 dark:bg-card/40">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading FAQs...
        </div>
      ) : error && faqs.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-4 text-center text-sm text-destructive">
          <AlertCircle className="mb-2 h-5 w-5" />
          Could not load FAQs.
        </div>
      ) : faqs.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-ashinaga-teal-100 bg-white/50 px-4 text-center dark:border-gray-700 dark:bg-card/40">
          <HelpCircle className="mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Frequently asked questions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
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
          {visibleGroups.map((group) => (
            <section key={group.category ?? 'general'} className="space-y-2">
              {hasCategories && group.category ? (
                <h2 className="text-sm font-semibold text-foreground">{group.category}</h2>
              ) : null}
              <Accordion
                type="single"
                collapsible
                className="rounded-lg border border-ashinaga-teal-100 bg-white/50 px-4 dark:border-gray-700 dark:bg-card/40"
              >
                {group.items.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {faq.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
