'use client';

import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { signIn } from '../lib/auth-client';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Note: In production, domain validation happens server-side
    // The invitation system ensures only invited emails can sign up

    setIsLoading(true);
    try {
      const { data, error: authError } = await signIn.email({
        email,
        password,
      });

      if (authError) {
        setError(authError.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      if (data) {
        // Redirect to dashboard on successful login
        router.push('/');
        router.refresh();
      }
    } catch (_err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ashinaga-teal-50 to-ashinaga-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your Ashinaga Staff Portal account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Microsoft Sign In - Hidden until OAuth credentials are configured */}
          {/* To enable Microsoft login:
              1. Register an app at https://portal.azure.com
              2. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to your .env file
              3. Uncomment the button below */}
          {/* <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={handleMicrosoftLogin}
            disabled={isMicrosoftLoading}
          >
            {isMicrosoftLoading ? (
              'Signing in...'
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  role="img"
                  aria-label="Microsoft logo"
                >
                  <path fill="#f25022" d="M1 1h10v10H1z" />
                  <path fill="#00a4ef" d="M13 1h10v10H13z" />
                  <path fill="#7fba00" d="M1 13h10v10H1z" />
                  <path fill="#ffb900" d="M13 13h10v10H13z" />
                </svg>
                Continue with Microsoft
              </>
            )}
          </Button> */}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@ashinaga.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">You must have an invitation to sign in</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <div>
              <span className="text-sm text-gray-600">Don't have an account? </span>
              <Button
                variant="link"
                className="p-0 h-auto text-sm font-normal text-ashinaga-teal hover:text-ashinaga-teal/80"
                onClick={() => router.push('/signup')}
              >
                Sign up with invitation
              </Button>
            </div>
            <div>
              <Button 
                variant="link" 
                className="text-sm text-gray-600"
                onClick={() => router.push('/forgot-password')}
              >
                Forgot your password?
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
