'use client';

import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Library,
  LockKeyhole,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

type ResourceCategory = 'LDF' | 'Handbook' | 'Proposal' | 'Support';
type ResourceType = 'Guide' | 'Handbook' | 'Template';

interface ScholarResource {
  title: string;
  description: string;
  category: ResourceCategory;
  type: ResourceType;
  href?: string;
}

const resources: ScholarResource[] = [
  {
    title: 'LDF Guide',
    description:
      'Core guidance for setting, reviewing, and updating Leadership Development Framework goals.',
    category: 'LDF',
    type: 'Guide',
  },
  {
    title: 'Scholar Handbook',
    description:
      'Key programme expectations, support routes, and operational information for scholars.',
    category: 'Handbook',
    type: 'Handbook',
  },
  {
    title: 'Ashinaga Proposal Handbook',
    description: 'Reference material for preparing and submitting Ashinaga proposals.',
    category: 'Proposal',
    type: 'Handbook',
  },
  {
    title: 'Funding Request Guide',
    description:
      'Practical notes for preparing funding requests and required supporting documents.',
    category: 'Support',
    type: 'Guide',
  },
  {
    title: 'Proposal Template',
    description: 'Reusable structure for drafting a complete proposal before submission.',
    category: 'Proposal',
    type: 'Template',
  },
];

const categoryStyles: Record<ResourceCategory, string> = {
  LDF: 'bg-ashinaga-green-50 text-ashinaga-green-700 border-ashinaga-green-200 dark:bg-ashinaga-green-900/20 dark:text-ashinaga-green-300 dark:border-ashinaga-green-800',
  Handbook:
    'bg-ashinaga-teal-50 text-ashinaga-teal-700 border-ashinaga-teal-200 dark:bg-ashinaga-teal-900/20 dark:text-ashinaga-teal-300 dark:border-ashinaga-teal-800',
  Proposal:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  Support:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
};

const resourceIcons: Record<ScholarResource['type'], typeof BookOpen> = {
  Guide: GraduationCap,
  Handbook: BookOpen,
  Template: FileText,
};

const resourceTypeFilters: Array<ResourceType | 'All'> = ['All', 'Guide', 'Handbook', 'Template'];

export default function ResourcesPage() {
  const [selectedType, setSelectedType] = useState<ResourceType | 'All'>('All');

  const filteredResources = useMemo(() => {
    if (selectedType === 'All') return resources;
    return resources.filter((resource) => resource.type === selectedType);
  }, [selectedType]);

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ashinaga-teal-100 bg-white text-ashinaga-teal-700 dark:border-border dark:bg-card dark:text-ashinaga-teal-300 sm:h-10 sm:w-10">
            <Library className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Resources
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Handbooks, guides, and templates for scholar workflows.
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {resourceTypeFilters.map((type) => (
            <Button
              key={type}
              type="button"
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              className="shrink-0"
              onClick={() => setSelectedType(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        {filteredResources.map((resource) => {
          const Icon = resourceIcons[resource.type];
          return (
            <article
              key={resource.title}
              className="flex min-h-[168px] flex-col rounded-lg border border-ashinaga-teal-100 bg-white/50 p-3 transition-colors hover:bg-white/70 dark:border-gray-700 dark:bg-card/40 dark:hover:bg-muted/30 sm:min-h-[250px]"
            >
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:h-10 sm:w-10">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className={`${categoryStyles[resource.category]} shrink-0 px-2 text-[10px] sm:px-2.5 sm:text-xs`}
                  >
                    {resource.category}
                  </Badge>
                </div>
                <div className="min-h-[58px] min-w-0 sm:min-h-[82px]">
                  <h2 className="text-sm font-semibold leading-5 text-foreground sm:text-lg sm:leading-6">
                    {resource.title}
                  </h2>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                    {resource.type}
                  </p>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 sm:gap-4">
                <p className="hidden text-sm leading-6 text-muted-foreground sm:block">
                  {resource.description}
                </p>
                <div className="flex-1" />
                {resource.href ? (
                  <Button asChild size="sm" className="min-h-9 w-full px-2 text-xs sm:text-sm">
                    <a href={resource.href} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open resource
                    </a>
                  </Button>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    size="sm"
                    className="min-h-9 w-full px-2 text-xs sm:text-sm"
                  >
                    <LockKeyhole className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="truncate">Available soon</span>
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
