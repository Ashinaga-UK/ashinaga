'use client';

import { Download, Eye, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toCanonicalAcademicYear } from '../lib/academic-year';
import {
  type AnnualReviewInternshipFilter,
  filterAnnualReviewReportRows,
  getAnnualReviewReportFilterOptions,
} from '../lib/annual-review-report-filters';
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
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [weightedGradeFilter, setWeightedGradeFilter] = useState('all');
  const [leadershipCountFilter, setLeadershipCountFilter] = useState('all');
  const [payItForwardCountFilter, setPayItForwardCountFilter] = useState('all');
  const [subSaharanAfricaCountFilter, setSubSaharanAfricaCountFilter] = useState('all');
  const [internshipFilter, setInternshipFilter] = useState<AnnualReviewInternshipFilter>('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [scholarYearFilter, setScholarYearFilter] = useState('all');
  const [exportingFilteredCsv, setExportingFilteredCsv] = useState(false);
  const [exportingAllCsv, setExportingAllCsv] = useState(false);

  useEffect(() => {
    const fetchAnnualReviews = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getAnnualUpdatesReport();
        setAnnualReviews(
          data.map((review) => ({
            ...review,
            academicYear: toCanonicalAcademicYear(review.academicYear),
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load annual reviews');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnualReviews();
  }, []);

  const filterOptions = useMemo(
    () => getAnnualReviewReportFilterOptions(annualReviews),
    [annualReviews]
  );

  const answerFiltersDisabled = statusFilter === 'draft';

  const filteredAnnualReviews = useMemo(
    () =>
      filterAnnualReviewReportRows(annualReviews, {
        searchTerm,
        academicYear: academicYearFilter,
        status: statusFilter,
        classification: classificationFilter,
        weightedGrade: weightedGradeFilter,
        leadershipCount: leadershipCountFilter,
        payItForwardCount: payItForwardCountFilter,
        subSaharanAfricaCount: subSaharanAfricaCountFilter,
        internship: internshipFilter,
        program: programFilter,
        scholarYear: scholarYearFilter,
      }),
    [
      academicYearFilter,
      annualReviews,
      classificationFilter,
      internshipFilter,
      leadershipCountFilter,
      payItForwardCountFilter,
      programFilter,
      scholarYearFilter,
      searchTerm,
      statusFilter,
      subSaharanAfricaCountFilter,
      weightedGradeFilter,
    ]
  );

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
              {filterOptions.academicYears.map((academicYear) => (
                <SelectItem key={academicYear} value={academicYear}>
                  {academicYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              const nextStatus = value as typeof statusFilter;
              setStatusFilter(nextStatus);
              if (nextStatus === 'draft') {
                setClassificationFilter('all');
                setWeightedGradeFilter('all');
                setLeadershipCountFilter('all');
                setPayItForwardCountFilter('all');
                setSubSaharanAfricaCountFilter('all');
                setInternshipFilter('all');
              }
            }}
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

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <ReportFilterSelect
          label="Academic classification"
          allLabel="All classifications"
          value={classificationFilter}
          onValueChange={setClassificationFilter}
          options={filterOptions.classifications}
          disabled={answerFiltersDisabled}
        />
        <ReportFilterSelect
          label="Weighted grade"
          allLabel="All weighted grades"
          value={weightedGradeFilter}
          onValueChange={setWeightedGradeFilter}
          options={filterOptions.weightedGrades}
          disabled={answerFiltersDisabled}
        />
        <ReportFilterSelect
          label="Leadership roles"
          allLabel="All leadership counts"
          value={leadershipCountFilter}
          onValueChange={setLeadershipCountFilter}
          options={filterOptions.leadershipCounts}
          disabled={answerFiltersDisabled}
        />
        <ReportFilterSelect
          label="Pay-it-forward activities"
          allLabel="All pay-it-forward counts"
          value={payItForwardCountFilter}
          onValueChange={setPayItForwardCountFilter}
          options={filterOptions.payItForwardCounts}
          disabled={answerFiltersDisabled}
        />
        <ReportFilterSelect
          label="Sub-Saharan Africa activities"
          allLabel="All sub-Saharan Africa counts"
          value={subSaharanAfricaCountFilter}
          onValueChange={setSubSaharanAfricaCountFilter}
          options={filterOptions.subSaharanAfricaCounts}
          disabled={answerFiltersDisabled}
        />
        <ReportFilterSelect
          label="Internship"
          allLabel="All internships"
          value={internshipFilter}
          onValueChange={(value) => setInternshipFilter(value as AnnualReviewInternshipFilter)}
          disabled={answerFiltersDisabled}
          options={[
            { value: 'ashinaga_completed', label: 'Completed Ashinaga 8-week internship' },
            { value: 'ashinaga_not_completed', label: 'Ashinaga internship not completed' },
            { value: 'independent', label: 'Has an independent internship' },
            { value: 'described', label: 'Internship described' },
          ]}
        />
        <ReportFilterSelect
          label="Programme"
          allLabel="All programmes"
          value={programFilter}
          onValueChange={setProgramFilter}
          options={filterOptions.programs}
        />
        <ReportFilterSelect
          label="Scholar year"
          allLabel="All scholar years"
          value={scholarYearFilter}
          onValueChange={setScholarYearFilter}
          options={filterOptions.scholarYears}
        />
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

function ReportFilterSelect({
  label,
  allLabel,
  value,
  onValueChange,
  options,
  disabled = false,
}: {
  label: string;
  allLabel: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;

          return (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
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
    return `Submitted ${formatAnnualReviewDateTime(review.submittedAt)}`;
  }

  return `Draft updated ${formatAnnualReviewDateTime(review.updatedAt)}`;
}

function formatAnnualReviewDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(new Date(value));
}
