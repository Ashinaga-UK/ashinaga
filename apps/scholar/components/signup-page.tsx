'use client';

import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { fetchAPI } from '../lib/api-client';
import { signIn } from '../lib/auth-client';
import { cn } from '../lib/utils';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './ui/command';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const DEFAULT_UNIVERSITY_OPTIONS = [
  'Imperial College London',
  'University of Edinburgh',
  'LSE',
  'Cambridge University',
  'Oxford University',
  'UCL',
  'University of York',
  'University of Warwick',
  'University of Central Lancashire',
  'University of East Anglia',
  'University of Manchester',
  'University of Leeds',
] as const;

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
] as const;

const DEGREE_PATHWAY_OPTIONS = [
  'Foundation Year',
  'Direct Entry',
  'Top-up Degree',
  'Other',
] as const;

interface ScholarData {
  name?: string;
  program?: string;
  year?: string;
  university?: string;
  location?: string;
  phone?: string;
  bio?: string;
  intendedUniversity?: string;
  intendedCourse?: string;
  degreePathway?: string;
  /** Programme stage: 'prep_year' or 'scholar' */
  programStage?: 'prep_year' | 'scholar';
  /** Intended destination (only meaningful when programStage = prep_year) */
}
interface InvitationData {
  id: string;
  email: string;
  userType: string;
  scholarData: ScholarData | null;
  expiresAt: string;
}

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

export function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    program: '',
    year: '',
    university: '',
    location: '',
    phone: '',
    bio: '',
    intendedUniversity: '',
    intendedCourse: '',
    degreePathway: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const prefilledScholarData = invitationData?.scholarData;

  // Validate token and pre-fill form on mount
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided. Please use the link from your invitation email.');
      return;
    }

    const validateToken = async () => {
      setIsValidating(true);
      try {
        const data = await fetchAPI<InvitationData>(`/api/invitations/validate/${token}`);

        if (data.userType !== 'scholar') {
          setError('This invitation is not for a scholar account.');
          return;
        }

        setInvitationData(data);

        // Pre-fill form with invitation data
        setFormData((prev) => ({
          ...prev,
          email: data.email,
          ...(data.scholarData
            ? {
                name: data.scholarData.name || '',
                program: data.scholarData.program || '',
                year: data.scholarData.year || '',
                university: data.scholarData.university || '',
                location: data.scholarData.location || '',
                phone: data.scholarData.phone || '',
                bio: data.scholarData.bio || '',
                intendedUniversity: data.scholarData.intendedUniversity || '',
                intendedCourse: data.scholarData.intendedCourse || '',
                degreePathway: data.scholarData.degreePathway || '',
              }
            : {}),
        }));
      } catch (err) {
        console.error('Token validation error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Invalid invitation link';
        if (errorMessage.includes('expired')) {
          setError(
            'This invitation has expired. Please contact your administrator for a new invitation.'
          );
        } else if (errorMessage.includes('404')) {
          setError('Invalid invitation link. Please check your email for the correct link.');
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (prefilledScholarData?.programStage === 'prep_year') {
      if (!formData.intendedUniversity.trim()) {
        setError('Intended university is required for prep-year invitations');
        return;
      }

      if (!formData.intendedCourse.trim()) {
        setError('Intended course is required for prep-year invitations');
        return;
      }

      if (!formData.degreePathway.trim()) {
        setError('Degree pathway is required for prep-year invitations');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Make direct API call to signup endpoint to properly handle invitation
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const signupResponse = await fetch(`${apiUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          invitationToken: token,
          intendedUniversity: formData.intendedUniversity || undefined,
          intendedCourse: formData.intendedCourse || undefined,
          degreePathway: formData.degreePathway || undefined,
          // No need to send scholar data - it's already in the invitation
        }),
      });

      const signupData = await signupResponse.json();
      console.log('Signup response:', signupData);

      if (signupResponse.ok && signupData.user) {
        // Auto-login after successful signup
        const loginResult = await signIn({
          email: formData.email,
          password: formData.password,
        });

        if (loginResult.data) {
          router.push('/dashboard');
        } else {
          // If auto-login fails, redirect to login page
          router.push('/login?registered=true');
        }
      } else {
        setError(signupData.error || 'Failed to create account. Please try again.');
      }
    } catch (error: unknown) {
      console.error('Signup error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-ashinaga-teal-600" />
              <p className="mt-2 text-sm text-gray-600">Validating your invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || (error && !invitationData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error || 'Invalid invitation link'}
              </AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/login')} className="w-full mt-4" variant="outline">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Your Account</CardTitle>
          <CardDescription>
            Welcome to Ashinaga Scholar Portal! Please set your password to complete registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Locked Fields */}
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="inline h-4 w-4 mr-1" />
                Full Name <span className="text-sm text-muted-foreground">(Locked)</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                readOnly
                disabled={isLoading}
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="inline h-4 w-4 mr-1" />
                Email <span className="text-sm text-muted-foreground">(Locked)</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                readOnly
                disabled={isLoading}
                className="bg-muted"
              />
            </div>

            {prefilledScholarData?.programStage === 'prep_year' && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <User className="h-4 w-4" />
                  Prep-Year Details
                </div>
                <p className="text-sm text-muted-foreground">
                  {prefilledScholarData.intendedUniversity ||
                  prefilledScholarData.intendedCourse ||
                  prefilledScholarData.degreePathway
                    ? 'These details have been pre-set by your administrator.'
                    : 'Complete the fields below to finish onboarding.'}
                </p>

                {/* Intended University */}
                <div className="space-y-2">
                  <Label htmlFor="intendedUniversity">
                    Intended University{' '}
                    {prefilledScholarData.intendedUniversity ? (
                      <span className="text-sm text-muted-foreground">(Locked)</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">*</span>
                    )}
                  </Label>
                  {prefilledScholarData.intendedUniversity ? (
                    <Input
                      id="intendedUniversity"
                      value={formData.intendedUniversity}
                      readOnly
                      disabled={isLoading}
                      className="bg-muted"
                    />
                  ) : (
                    <SearchableValueField
                      id="intendedUniversity"
                      value={formData.intendedUniversity}
                      options={DEFAULT_UNIVERSITY_OPTIONS}
                      placeholder="Select or type a university"
                      searchPlaceholder="Start typing a university..."
                      emptyText="No universities match. Keep typing to enter a custom one."
                      onChange={(value) =>
                        setFormData((prev) => ({ ...prev, intendedUniversity: value }))
                      }
                    />
                  )}
                </div>

                {/* Intended Course */}
                <div className="space-y-2">
                  <Label htmlFor="intendedCourse">
                    Intended Course{' '}
                    {prefilledScholarData.intendedCourse ? (
                      <span className="text-sm text-muted-foreground">(Locked)</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">*</span>
                    )}
                  </Label>
                  {prefilledScholarData.intendedCourse ? (
                    <Input
                      id="intendedCourse"
                      value={formData.intendedCourse}
                      readOnly
                      disabled={isLoading}
                      className="bg-muted"
                    />
                  ) : (
                    <SearchableValueField
                      id="intendedCourse"
                      value={formData.intendedCourse}
                      options={COURSE_OPTIONS}
                      placeholder="Select or type a course"
                      searchPlaceholder="Start typing a course..."
                      emptyText="No courses match. Keep typing to enter a custom one."
                      onChange={(value) =>
                        setFormData((prev) => ({ ...prev, intendedCourse: value }))
                      }
                    />
                  )}
                </div>

                {/* Degree Pathway */}
                <div className="space-y-2">
                  <Label htmlFor="degreePathway">
                    Degree Pathway{' '}
                    {prefilledScholarData.degreePathway ? (
                      <span className="text-sm text-muted-foreground">(Locked)</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">*</span>
                    )}
                  </Label>
                  {prefilledScholarData.degreePathway ? (
                    <Input
                      id="degreePathway"
                      value={formData.degreePathway}
                      readOnly
                      disabled={isLoading}
                      className="bg-muted"
                    />
                  ) : (
                    <Select
                      value={formData.degreePathway}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, degreePathway: value }))
                      }
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
                  )}
                </div>
              </div>
            )}

            {/* Password Fields */}
            <div className="space-y-2">
              <Label htmlFor="password">
                <Lock className="inline h-4 w-4 mr-1" />
                Password *
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                <Lock className="inline h-4 w-4 mr-1" />
                Confirm Password *
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
