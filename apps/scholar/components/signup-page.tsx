'use client';

import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import { signIn } from '../lib/auth-client';
import { fetchAPI } from '../lib/api-client';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

interface ScholarData {
  name?: string;
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
                name: data.scholarData.name || '',
                program: data.scholarData.program || '',
                year: data.scholarData.year || '',
                university: data.scholarData.university || '',
                location: data.scholarData.location || '',
                phone: data.scholarData.phone || '',
                bio: data.scholarData.bio || '',
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
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'An error occurred during sign up');
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
