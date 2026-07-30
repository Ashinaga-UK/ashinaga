'use client';

import { Download, Eye, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  type AnnualUpdateReportRow,
  downloadAnnualReviewsCSV,
  getAnnualUpdatesReport,
} from '../lib/api-client';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface AnnualReviewsReportProps {
  onViewScholarAnnualReviews: (scholarId: string) => void;
}

export function AnnualReviewsReport({ onViewScholarAnnualReviews }: AnnualReviewsReportProps) {
  const [annualReviews, setAnnualReviews] = useState<AnnualUpdateReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted'>('all');
  const [exportingFilteredCsv, setExportingFilteredCsv] = useState(false);
  const [exportingAllCsv, setExportingAllCsv] = useState(false);

  useEffect(() => {
    const fetchAnnualReviews = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getAnnualUpdatesReport();
        setAnnualReviews(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load annual reviews');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnualReviews();
  }, []);

  const academicYears = useMemo(
    () => [...new Set(annualReviews.map((review) => review.academicYear))].sort().reverse(),
    [annualReviews]
  );

  const filteredAnnualReviews = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return annualReviews.filter((review) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        review.scholarName.toLowerCase().includes(normalizedSearch) ||
        review.scholarEmail.toLowerCase().includes(normalizedSearch) ||
        (review.aaiScholarId ?? '').toLowerCase().includes(normalizedSearch) ||
        review.university.toLowerCase().includes(normalizedSearch);
      const matchesAcademicYear =
        academicYearFilter === 'all' || review.academicYear === academicYearFilter;
      const matchesStatus = statusFilter === 'all' || review.status === statusFilter;

      return matchesSearch && matchesAcademicYear && matchesStatus;
    });
  }, [academicYearFilter, annualReviews, searchTerm, statusFilter]);

  const submittedCount = filteredAnnualReviews.filter(
    (review) => review.status === 'submitted'
  ).length;
  const draftCount = filteredAnnualReviews.filter((review) => review.status === 'draft').length;

  const handleExportFilteredAnnualReviewsCsv = async () => {
    setExportingFilteredCsv(true);
    try {
      await downloadAnnualReviewsCSV(filteredAnnualReviews.map((review) => review.id));
    } catch (err) {
      console.error(err);
      alert('Failed to download filtered annual reviews CSV. Please try again.');
    } finally {
      setExportingFilteredCsv(false);
    }
  };

  const handleExportAllAnnualReviewsCsv = async () => {
    setExportingAllCsv(true);
    try {
      await downloadAnnualReviewsCSV();
    } catch (err) {
      console.error(err);
      alert('Failed to download annual reviews CSV. Please try again.');
    } finally {
      setExportingAllCsv(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading annual reviews...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <AnnualReviewStat label="Visible reviews" value={filteredAnnualReviews.length} />
        <AnnualReviewStat label="Submitted" value={submittedCount} />
        <AnnualReviewStat label="Drafts" value={draftCount} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_160px] lg:max-w-3xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search scholar, email, AAI ID, university"
              className="pl-9"
            />
          </div>
          <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Academic year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {academicYears.map((academicYear) => (
                <SelectItem key={academicYear} value={academicYear}>
                  {academicYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-fit"
            onClick={handleExportFilteredAnnualReviewsCsv}
            disabled={exportingFilteredCsv || filteredAnnualReviews.length === 0}
          >
            {exportingFilteredCsv ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export filtered
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-fit"
            onClick={handleExportAllAnnualReviewsCsv}
            disabled={exportingAllCsv || annualReviews.length === 0}
          >
            {exportingAllCsv ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export all
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scholar</TableHead>
              <TableHead>Academic year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted / updated</TableHead>
              <TableHead>Scholar year</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAnnualReviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                  No annual reviews match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredAnnualReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium">{review.scholarName}</p>
                      <p className="text-xs text-muted-foreground">{review.scholarEmail}</p>
                      {review.aaiScholarId && (
                        <p className="text-xs text-muted-foreground">AAI {review.aaiScholarId}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{review.academicYear}</TableCell>
                  <TableCell>
                    <Badge variant={review.status === 'submitted' ? 'default' : 'secondary'}>
                      {review.status === 'submitted' ? 'Submitted' : 'Draft in progress'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getAnnualReviewDateLabel(review)}
                  </TableCell>
                  <TableCell>{review.scholarYear}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`View ${review.scholarName}'s annual reviews`}
                      onClick={() => onViewScholarAnnualReviews(review.scholarId)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AnnualReviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function getAnnualReviewDateLabel(review: AnnualUpdateReportRow) {
  if (review.status === 'submitted' && review.submittedAt) {
    return new Date(review.submittedAt).toLocaleDateString('en-GB');
  }

  return `Draft updated ${new Date(review.updatedAt).toLocaleDateString('en-GB')}`;
}
