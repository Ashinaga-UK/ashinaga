'use client';

import {
  AlertCircle,
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Library,
  Loader2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../components/ui/use-toast';
import {
  getResourceDownloadUrl,
  type Resource,
  type ResourceCategory,
  type ResourceType,
} from '../../../lib/api-client';
import { useMyResources } from '../../../lib/hooks/use-queries';

const categoryStyles: Record<ResourceCategory, string> = {
  LDF: 'bg-ashinaga-green-50 text-ashinaga-green-700 border-ashinaga-green-200 dark:bg-ashinaga-green-900/20 dark:text-ashinaga-green-300 dark:border-ashinaga-green-800',
  Handbook:
    'bg-ashinaga-teal-50 text-ashinaga-teal-700 border-ashinaga-teal-200 dark:bg-ashinaga-teal-900/20 dark:text-ashinaga-teal-300 dark:border-ashinaga-teal-800',
  Proposal:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  Support:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
};

const resourceIcons: Record<ResourceType, typeof BookOpen> = {
  Guide: GraduationCap,
  Handbook: BookOpen,
  Template: FileText,
};

const resourceTypeFilters: Array<ResourceType | 'All'> = ['All', 'Guide', 'Handbook', 'Template'];

export default function ResourcesPage() {
  const [selectedType, setSelectedType] = useState<ResourceType | 'All'>('All');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { data: resources = [], isLoading, error } = useMyResources();
  const { toast } = useToast();

  const filteredResources = useMemo(() => {
    if (selectedType === 'All') return resources;
    return resources.filter((resource) => resource.type === selectedType);
  }, [resources, selectedType]);

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

      {isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-ashinaga-teal-100 bg-white/50 text-sm text-muted-foreground dark:border-gray-700 dark:bg-card/40">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading resources...
        </div>
      ) : error && resources.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-4 text-center text-sm text-destructive">
          <AlertCircle className="mb-2 h-5 w-5" />
          Could not load resources.
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-ashinaga-teal-100 bg-white/50 px-4 text-center dark:border-gray-700 dark:bg-card/40">
          <Library className="mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No resources available</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Published resources assigned to you will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
          {filteredResources.map((resource: Resource) => {
            const Icon = resourceIcons[resource.type];
            return (
              <article
                key={resource.id}
                className="group flex min-h-[158px] flex-col rounded-lg border border-ashinaga-teal-100 bg-white/50 p-3 transition-colors hover:border-ashinaga-teal-200 hover:bg-white/70 dark:border-gray-700 dark:bg-card/40 dark:hover:border-gray-600 dark:hover:bg-muted/30 sm:min-h-[190px] sm:p-4"
              >
                <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:h-10 sm:w-10">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground sm:text-base sm:leading-6">
                          {resource.title}
                        </h2>
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                          {resource.type}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${categoryStyles[resource.category]} hidden shrink-0 px-2 text-[10px] sm:inline-flex sm:px-2.5 sm:text-xs`}
                      >
                        {resource.category}
                      </Badge>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${categoryStyles[resource.category]} mt-2 shrink-0 px-2 text-[10px] sm:hidden`}
                    >
                      {resource.category}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 hidden line-clamp-2 text-sm leading-6 text-muted-foreground sm:block">
                  {resource.description}
                </p>
                <div className="flex-1" />
                <div className="mt-3 flex items-center justify-end gap-2">
                  {resource.sourceType === 'file' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-auto min-h-8 px-2 text-xs sm:px-3 sm:text-sm"
                      disabled={downloadingId === resource.id}
                      onClick={async () => {
                        setDownloadingId(resource.id);
                        try {
                          const { downloadUrl } = await getResourceDownloadUrl(resource.id);
                          window.open(downloadUrl, '_blank', 'noopener,noreferrer');
                        } catch {
                          toast({
                            title: 'Could not download resource',
                            description: 'Please try again.',
                            variant: 'destructive',
                          });
                        } finally {
                          setDownloadingId(null);
                        }
                      }}
                    >
                      {downloadingId === resource.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="ml-auto min-h-8 px-2 text-xs sm:px-3 sm:text-sm"
                    >
                      <a href={resource.url ?? undefined} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </a>
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
