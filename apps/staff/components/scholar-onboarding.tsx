'use client';

import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  ChevronsUpDown,
  FileSpreadsheet,
  Send,
  Upload,
  UserPlus,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { type CreateScholarData, createScholar } from '../lib/api-client';
import { DEFAULT_UNIVERSITY_OPTIONS, type Gender } from '../lib/constants';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface ScholarOnboardingProps {
  onBack: () => void;
}

const DEGREE_PATHWAY_OPTIONS = ['Foundation Year', 'Direct Entry', 'Top-up Degree', 'Other'];
const COURSE_OPTIONS = [
  'Computer Science',
  'Medicine',
  'Engineering',
  'Economics',
  'Law',
  'Business',
  'Psychology',
  'Environmental Science',
  'Mathematics',
  'International Relations',
];

function SearchableValueField({
  id,
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);

  useEffect(() => {
    if (!open) {
      setSearch(value);
    }
  }, [open, value]);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.toLowerCase().includes(term));
  }, [options, search]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setSearch(value);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          aria-expanded={open}
          aria-haspopup="listbox"
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={(nextValue) => {
              setSearch(nextValue);
              onChange(nextValue);
            }}
          />
          <CommandList>
            <CommandEmpty>{search.trim() ? `Use "${search.trim()}"` : emptyText}</CommandEmpty>
            {filteredOptions.map((option) => (
              <CommandItem
                key={option}
                value={option}
                onSelect={() => {
                  setSearch(option);
                  onChange(option);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn('mr-2 h-4 w-4', value === option ? 'opacity-100' : 'opacity-0')}
                />
                {option}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface ScholarData {
  name: string;
  aaiScholarId: string;
  dateOfBirth: string;
  gender: Gender | '';
  nationality: string;
  phone: string;
  email: string;
  passportExpirationDate: string;
  visaExpirationDate: string;
  location: string; // Address Country of Study
  addressHomeCountry: string;
  emergencyContactCountryOfStudy: string;
  emergencyContactHomeCountry: string;
  universityId: string;
  dietaryInformation: string;
  kokorozashi: string;
  longTermCareerPlan: string;
  postGraduationPlan: string;
  program: string;
  university: string;
  year: string;
  startDate: string;
  graduationDate: string;
  bio: string;
  majorCategory: string;
  fieldOfStudy: string;
  programStage: 'prep_year' | 'scholar';
  intendedUniversity: string;
  intendedCourse: string;
  degreePathway: string;
}

// Validation functions
const validatePhone = (phone: string): string | null => {
  if (!phone) return null; // Optional field
  if (!/^[\d\s+\-()]*$/.test(phone)) {
    return 'Phone number must contain only digits and valid phone characters (+, -, spaces, parentheses)';
  }
  return null;
};

const validateDOB = (dob: string): string | null => {
  if (!dob) return null; // Optional field
  const date = new Date(dob);
  const today = new Date();
  if (date >= today) {
    return 'Date of birth must be in the past';
  }
  const age = Math.floor((today.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 16 || age > 80) {
    return 'Scholar age must be between 16 and 80 years';
  }
  return null;
};

const validatePassportExpiry = (expiry: string): string | null => {
  if (!expiry) return null; // Optional field
  const date = new Date(expiry);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    return 'Passport expiration date must not be in the past';
  }
  return null;
};

const initialScholarData: ScholarData = {
  name: '',
  aaiScholarId: '',
  dateOfBirth: '',
  gender: '',
  nationality: '',
  phone: '',
  email: '',
  passportExpirationDate: '',
  visaExpirationDate: '',
  location: '',
  addressHomeCountry: '',
  emergencyContactCountryOfStudy: '',
  emergencyContactHomeCountry: '',
  universityId: '',
  dietaryInformation: '',
  kokorozashi: '',
  longTermCareerPlan: '',
  postGraduationPlan: '',
  program: '',
  university: '',
  year: '',
  startDate: '',
  graduationDate: '',
  bio: '',
  majorCategory: '',
  fieldOfStudy: '',
  programStage: 'scholar',
  intendedUniversity: '',
  intendedCourse: '',
  degreePathway: '',
};

export function ScholarOnboarding({ onBack }: ScholarOnboardingProps) {
  const [activeTab, setActiveTab] = useState('single');
  const [scholarData, setScholarData] = useState<ScholarData>(initialScholarData);
  const [csvData, setCsvData] = useState<ScholarData[]>([]);
  const [_csvFile, setCsvFile] = useState<File | null>(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof ScholarData, value: string) => {
    setScholarData((prev) => ({ ...prev, [field]: value }));

    // Live validation for specific fields
    let error: string | null = null;
    if (field === 'phone') error = validatePhone(value);
    if (field === 'dateOfBirth') error = validateDOB(value);
    if (field === 'passportExpirationDate') error = validatePassportExpiry(value);

    // Update validation errors for this field
    if (error) {
      setValidationErrors((prev) => ({ ...prev, [field]: error }));
    } else {
      setValidationErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      // Mock CSV parsing - in real app, you'd parse the actual CSV
      const mockCsvData: ScholarData[] = [
        {
          name: 'John Doe',
          aaiScholarId: 'AAI123',
          dateOfBirth: '2000-01-01',
          gender: 'male',
          nationality: 'British',
          phone: '+44 7123 456789',
          email: 'john.doe@scholar.ac.uk',
          passportExpirationDate: '2026-01-01',
          visaExpirationDate: '2025-01-01',
          location: '123 Scholar St, London',
          addressHomeCountry: '456 Home St, London',
          emergencyContactCountryOfStudy: 'Jane Doe',
          emergencyContactHomeCountry: 'John Smith',
          universityId: 'UNI123',
          dietaryInformation: 'None',
          kokorozashi: 'To become a software engineer',
          longTermCareerPlan: 'Work in AI',
          postGraduationPlan: 'Get a job',
          program: 'Computer Science',
          university: 'Imperial College London',
          year: 'Pre-University',
          startDate: '2025-09-01',
          graduationDate: '2029-06-01',
          bio: 'Computer Science student',
          majorCategory: 'Engineering and Technology',
          fieldOfStudy: 'Computer Science',
          programStage: 'scholar',
          intendedUniversity: '',
          intendedCourse: '',
          degreePathway: '',
        },
        {
          name: 'Jane Smith',
          aaiScholarId: 'AAI456',
          dateOfBirth: '2001-02-02',
          gender: 'female',
          nationality: 'American',
          phone: '+44 7234 567890',
          email: 'jane.smith@scholar.ac.uk',
          passportExpirationDate: '2027-02-02',
          visaExpirationDate: '2026-02-02',
          location: '456 Scholar Ave, Edinburgh',
          addressHomeCountry: '789 Home Ave, New York',
          emergencyContactCountryOfStudy: 'John Smith',
          emergencyContactHomeCountry: 'Jane Doe',
          universityId: 'UNI456',
          dietaryInformation: 'Vegetarian',
          kokorozashi: 'To become a doctor',
          longTermCareerPlan: 'Work in healthcare',
          postGraduationPlan: 'Go to medical school',
          program: 'Medicine',
          university: 'University of Edinburgh',
          year: 'Foundation',
          startDate: '2025-09-01',
          graduationDate: '2030-06-01',
          bio: 'Medicine student',
          majorCategory: 'Medical, Science, and Math-related',
          fieldOfStudy: 'Medicine',
          programStage: 'scholar',
          intendedUniversity: '',
          intendedCourse: '',
          degreePathway: '',
        },
      ];
      setCsvData(mockCsvData);
    }
  };

  const handleSingleScholarSubmit = async () => {
    // Validate fields
    const errors: Record<string, string> = {};

    const phoneError = validatePhone(scholarData.phone);
    if (phoneError) errors.phone = phoneError;

    const dobError = validateDOB(scholarData.dateOfBirth);
    if (dobError) errors.dateOfBirth = dobError;

    const passportError = validatePassportExpiry(scholarData.passportExpirationDate);
    if (passportError) errors.passportExpirationDate = passportError;

    // If there are validation errors, show them and don't submit
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear any previous errors
    setValidationErrors({});
    setIsSubmitting(true);
    console.log('Submitting scholar data:', scholarData);

    // Clean up the data - remove empty strings for optional fields
    const cleanedData = Object.fromEntries(
      Object.entries(scholarData).filter(([, value]) => value !== '' && value !== undefined)
    ) as CreateScholarData;

    console.log('Cleaned scholar data:', cleanedData);

    try {
      const result = await createScholar(cleanedData);
      console.log('Create scholar result:', result);
      if (result.success) {
        setStep(3); // Skip to success - invitation is already sent
      } else {
        console.error('Failed to create scholar:', result);
        // Show specific error message if available
        const errorMessage = result.message || 'Failed to create scholar. Please try again.';
        setValidationErrors({ submit: errorMessage });
      }
    } catch (error: unknown) {
      console.error('Error creating scholar:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Error creating scholar. Please try again.';
      setValidationErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async () => {
    setIsSubmitting(true);
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setStep(2);
    setIsSubmitting(false);
  };

  const sendInvitation = async () => {
    setIsSubmitting(true);
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setStep(3);
    setIsSubmitting(false);
  };

  if (step === 3) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">
                Scholars Successfully Onboarded!
              </h2>
              <p className="text-muted-foreground">
                {activeTab === 'single'
                  ? `${scholarData.name} has been added to the system and invitation sent.`
                  : `${csvData.length} scholars have been added to the system and invitations sent.`}
              </p>
              <Button onClick={onBack} className="mt-4">
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setStep(1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Form
          </Button>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Send Invitation</CardTitle>
            <CardDescription>
              {activeTab === 'single'
                ? 'Send an invitation email to the new scholar'
                : 'Send invitation emails to all new scholars'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Invitation Preview</h4>
              <p className="text-sm text-muted-foreground">
                Scholars will receive an email with login credentials and instructions to access the
                Ashinaga platform. They'll be able to set up their profile and start tracking their
                goals.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={sendInvitation}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </Button>
              <Button variant="outline" onClick={onBack}>
                Skip for Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Onboard New Scholars
          </CardTitle>
          <CardDescription>Add new scholars to the Ashinaga platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Scholar</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import (CSV)</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={scholarData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter scholar's full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={scholarData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="scholar@example.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The invitation link will be sent to this email address.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="aaiScholarId">AAI Scholar ID</Label>
                    <Input
                      id="aaiScholarId"
                      value={scholarData.aaiScholarId}
                      onChange={(e) => handleInputChange('aaiScholarId', e.target.value)}
                      placeholder="e.g. AAI-00012345"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The predefined identifier for this scholar.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="programStage">Invite As</Label>
                    <Select
                      value={scholarData.programStage}
                      onValueChange={(value) =>
                        handleInputChange('programStage', value as 'prep_year' | 'scholar')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scholar">Uni Student</SelectItem>
                        <SelectItem value="prep_year">Prep-Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      The scholar completes the rest of their profile after signing up.
                    </p>
                  </div>
                  {scholarData.programStage === 'prep_year' && (
                    <>
                      <div>
                        <Label htmlFor="intendedUniversity">Intended University</Label>
                        <SearchableValueField
                          id="intendedUniversity"
                          value={scholarData.intendedUniversity}
                          options={DEFAULT_UNIVERSITY_OPTIONS}
                          placeholder="Select or type a university"
                          searchPlaceholder="Start typing a university..."
                          emptyText="No universities match. Keep typing to enter a custom one."
                          onChange={(value) => handleInputChange('intendedUniversity', value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="intendedCourse">Intended Course</Label>
                        <SearchableValueField
                          id="intendedCourse"
                          value={scholarData.intendedCourse}
                          options={COURSE_OPTIONS}
                          placeholder="Select or type a course"
                          searchPlaceholder="Start typing a course..."
                          emptyText="No courses match. Keep typing to enter a custom one."
                          onChange={(value) => handleInputChange('intendedCourse', value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="degreePathway">Degree Pathway</Label>
                        <Select
                          value={scholarData.degreePathway}
                          onValueChange={(value) => handleInputChange('degreePathway', value)}
                        >
                          <SelectTrigger id="degreePathway">
                            <SelectValue placeholder="Select degree pathway" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEGREE_PATHWAY_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {validationErrors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm">{validationErrors.submit}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSingleScholarSubmit}
                  disabled={!scholarData.name || !scholarData.email || isSubmitting}
                  className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
                >
                  {isSubmitting ? 'Creating...' : 'Create Scholar'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-6">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 text-ashinaga-teal-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload a CSV file with student information. Make sure it includes: name, email,
                    program, university, year.
                  </p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="max-w-xs mx-auto"
                    id="csv-upload"
                  />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <Button variant="outline" className="mt-2 bg-transparent" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose CSV File
                      </span>
                    </Button>
                  </Label>
                </div>

                {csvData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Preview ({csvData.length} students)</CardTitle>
                      <CardDescription>Review the students that will be imported</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Program</TableHead>
                              <TableHead>University</TableHead>
                              <TableHead>Year</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {csvData.map((scholar) => (
                              <TableRow key={scholar.email}>
                                <TableCell>{scholar.name}</TableCell>
                                <TableCell>{scholar.email}</TableCell>
                                <TableCell>{scholar.program}</TableCell>
                                <TableCell>{scholar.university}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{scholar.year}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button
                          onClick={handleBulkSubmit}
                          disabled={isSubmitting}
                          className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
                        >
                          {isSubmitting ? 'Importing...' : `Import ${csvData.length} Scholars`}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
