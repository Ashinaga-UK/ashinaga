'use client';

import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  School,
  Calendar,
  MapPin,
  Phone,
  FileText,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import { signUp } from '../lib/auth-client';
import { fetchAPI } from '../lib/api-client';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';

interface ScholarData {
  program?: string;
  year?: string;
  university?: string;
  location?: string;
  phone?: string;
  bio?: string;
}

interface InvitationData {
  id: string;
  email: string;
  userType: string;
  scholarData: ScholarData | null;
  expiresAt: string;
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
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);

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
                program: data.scholarData.program || '',
                year: data.scholarData.year || '',
                university: data.scholarData.university || '',
                location: data.scholarData.location || '',
                phone: data.scholarData.phone || '',
                bio: data.scholarData.bio || '',
              }
            : {}),
        }));
      } catch (err: any) {
        console.error('Token validation error:', err);
        setError(err.message || 'Invalid or expired invitation token.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleSignup = async (e: React.FormEvent) => {
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
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate required scholar fields
    if (!formData.program.trim()) {
      setError('Program is required');
      return;
    }

    if (!formData.year.trim()) {
      setError('Year is required');
      return;
    }

    if (!formData.university.trim()) {
      setError('University is required');
      return;
    }

    setIsLoading(true);
    try {
      // Pass the invitation token with the signup request
      const { data, error: authError } = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        invitationToken: token,
        // Include scholar-specific data
        program: formData.program,
        year: formData.year,
        university: formData.university,
        location: formData.location,
        phone: formData.phone,
        bio: formData.bio,
      });

      if (authError) {
        console.error('Signup error:', authError);
        setError(authError.message || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      if (data) {
        // Account created successfully, redirect to dashboard
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Unexpected signup error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-ashinaga-teal-600 mb-4" />
            <p className="text-gray-600">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || (error && !invitationData)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || 'Invalid invitation link'}</AlertDescription>
            </Alert>
            <p className="text-center mt-4 text-sm text-gray-600">
              Please use the link from your invitation email or contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Complete Your Scholar Registration
          </CardTitle>
          <CardDescription className="text-center">
            Set your password to complete your account setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Personal Information */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  <User className="inline h-4 w-4 mr-1" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email (Pre-filled)
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>

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
                    placeholder="Re-enter your password"
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
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Scholar Information */}
              <div className="space-y-2">
                <Label htmlFor="program">
                  <School className="inline h-4 w-4 mr-1" />
                  Program *
                </Label>
                <Input
                  id="program"
                  type="text"
                  placeholder="e.g., Computer Science"
                  value={formData.program}
                  onChange={handleInputChange('program')}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Year *
                </Label>
                <Input
                  id="year"
                  type="text"
                  placeholder="e.g., 2024"
                  value={formData.year}
                  onChange={handleInputChange('year')}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="university">
                  <School className="inline h-4 w-4 mr-1" />
                  University *
                </Label>
                <Input
                  id="university"
                  type="text"
                  placeholder="Your university name"
                  value={formData.university}
                  onChange={handleInputChange('university')}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Location
                </Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={handleInputChange('location')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="inline h-4 w-4 mr-1" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Bio - Full Width */}
            <div className="space-y-2">
              <Label htmlFor="bio">
                <FileText className="inline h-4 w-4 mr-1" />
                Bio
              </Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={handleInputChange('bio')}
                disabled={isLoading}
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Complete Registration'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
