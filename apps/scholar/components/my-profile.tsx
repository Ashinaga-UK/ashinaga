'use client';

import {
  Calendar,
  FileText,
  Globe,
  GraduationCap,
  Loader2,
  Lock,
  Phone,
  Save,
  User,
  AlertTriangle,
  Edit,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getMyProfile,
  updateMyProfile,
  type ScholarProfile,
  type UpdateProfileData,
} from '../lib/api/profile';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';

export function MyProfile() {
  const [profile, setProfile] = useState<ScholarProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileData>({});

  const loadProfile = async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
      // Initialize form data with current profile values
      setFormData({
        phone: data.phone || '',
        dateOfBirth: data.dateOfBirth || '',
        gender: data.gender || undefined,
        nationality: data.nationality || '',
        location: data.location || '',
        addressHomeCountry: data.addressHomeCountry || '',
        passportExpirationDate: data.passportExpirationDate || '',
        visaExpirationDate: data.visaExpirationDate || '',
        emergencyContactCountryOfStudy: data.emergencyContactCountryOfStudy || '',
        emergencyContactHomeCountry: data.emergencyContactHomeCountry || '',
        program: data.program || '',
        university: data.university || '',
        year: data.year || '',
        startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
        graduationDate: data.graduationDate
          ? new Date(data.graduationDate).toISOString().split('T')[0]
          : '',
        universityId: data.universityId || '',
        dietaryInformation: data.dietaryInformation || '',
        kokorozashi: data.kokorozashi || '',
        longTermCareerPlan: data.longTermCareerPlan || '',
        postGraduationPlan: data.postGraduationPlan || '',
        bio: data.bio || '',
      });
    } catch (err) {
      setError('Failed to load profile. Please try again.');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedProfile = await updateMyProfile(formData);
      setProfile(updatedProfile);
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    // Reset form data to current profile values
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || undefined,
        nationality: profile.nationality || '',
        location: profile.location || '',
        addressHomeCountry: profile.addressHomeCountry || '',
        passportExpirationDate: profile.passportExpirationDate || '',
        visaExpirationDate: profile.visaExpirationDate || '',
        emergencyContactCountryOfStudy: profile.emergencyContactCountryOfStudy || '',
        emergencyContactHomeCountry: profile.emergencyContactHomeCountry || '',
        program: profile.program || '',
        university: profile.university || '',
        year: profile.year || '',
        startDate: profile.startDate ? new Date(profile.startDate).toISOString().split('T')[0] : '',
        graduationDate: profile.graduationDate
          ? new Date(profile.graduationDate).toISOString().split('T')[0]
          : '',
        universityId: profile.universityId || '',
        dietaryInformation: profile.dietaryInformation || '',
        kokorozashi: profile.kokorozashi || '',
        longTermCareerPlan: profile.longTermCareerPlan || '',
        postGraduationPlan: profile.postGraduationPlan || '',
        bio: profile.bio || '',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ashinaga-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load profile. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your personal information</p>
        </div>
        {!editing && (
          <Button
            onClick={() => setEditing(true)}
            className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            Profile updated successfully!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Locked Fields */}
        <Card className="border-ashinaga-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              These fields are managed by the system and cannot be edited
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={profile.name} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label htmlFor="aaiScholarId">AAI Scholar ID</Label>
                <Input
                  id="aaiScholarId"
                  value={profile.aaiScholarId || 'Not assigned'}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="border-ashinaga-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value: any) => setFormData({ ...formData, gender: value })}
                  disabled={!editing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  disabled={!editing}
                  placeholder="e.g., Japanese"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!editing}
                  placeholder="+81 90 1234 5678"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="border-ashinaga-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="location">Address (Country of Study)</Label>
              <Textarea
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={!editing}
                rows={2}
                placeholder="Your current address while studying"
              />
            </div>
            <div>
              <Label htmlFor="addressHomeCountry">Address (Home Country)</Label>
              <Textarea
                id="addressHomeCountry"
                value={formData.addressHomeCountry}
                onChange={(e) => setFormData({ ...formData, addressHomeCountry: e.target.value })}
                disabled={!editing}
                rows={2}
                placeholder="Your permanent home address"
              />
            </div>
          </CardContent>
        </Card>

        {/* Document Information */}
        <Card className="border-ashinaga-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="passportExpirationDate">Passport Expiration Date</Label>
                <Input
                  id="passportExpirationDate"
                  type="date"
                  value={formData.passportExpirationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, passportExpirationDate: e.target.value })
                  }
                  disabled={!editing}
                />
              </div>
              <div>
                <Label htmlFor="visaExpirationDate">Visa Expiration Date</Label>
                <Input
                  id="visaExpirationDate"
                  type="date"
                  value={formData.visaExpirationDate}
                  onChange={(e) => setFormData({ ...formData, visaExpirationDate: e.target.value })}
                  disabled={!editing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card className="border-ashinaga-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Emergency Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emergencyContactCountryOfStudy">
                Emergency Contact (Country of Study)
              </Label>
              <Textarea
                id="emergencyContactCountryOfStudy"
                value={formData.emergencyContactCountryOfStudy}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyContactCountryOfStudy: e.target.value })
                }
                disabled={!editing}
                rows={3}
                placeholder="Please include Name, Email, Phone Number"
              />
              <p className="text-xs text-gray-500 mt-1">Please include Name, Email, Phone Number</p>
            </div>
            <div>
              <Label htmlFor="emergencyContactHomeCountry">Emergency Contact (Home Country)</Label>
              <Textarea
                id="emergencyContactHomeCountry"
                value={formData.emergencyContactHomeCountry}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyContactHomeCountry: e.target.value })
                }
                disabled={!editing}
                rows={3}
                placeholder="Please include Name, Email, Phone Number"
              />
              <p className="text-xs text-gray-500 mt-1">Please include Name, Email, Phone Number</p>
            </div>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card className="border-ashinaga-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="program">Program of Study</Label>
              <Input
                id="program"
                value={formData.program}
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                disabled={!editing}
                placeholder="e.g., Bachelor of Science in Computer Science"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="university">University</Label>
                <Select
                  value={formData.university}
                  onValueChange={(value) => setFormData({ ...formData, university: value })}
                  disabled={!editing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select university" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Imperial College London">Imperial College London</SelectItem>
                    <SelectItem value="University of Edinburgh">University of Edinburgh</SelectItem>
                    <SelectItem value="LSE">London School of Economics</SelectItem>
                    <SelectItem value="Cambridge University">Cambridge University</SelectItem>
                    <SelectItem value="Oxford University">Oxford University</SelectItem>
                    <SelectItem value="UCL">University College London</SelectItem>
                    <SelectItem value="University of York">University of York</SelectItem>
                    <SelectItem value="University of Warwick">University of Warwick</SelectItem>
                    <SelectItem value="University of Central Lancashire">
                      University of Central Lancashire
                    </SelectItem>
                    <SelectItem value="University of East Anglia">
                      University of East Anglia
                    </SelectItem>
                    <SelectItem value="University of Manchester">
                      University of Manchester
                    </SelectItem>
                    <SelectItem value="University of Leeds">University of Leeds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="year">Academic Year</Label>
                <Select
                  value={formData.year}
                  onValueChange={(value) => setFormData({ ...formData, year: value })}
                  disabled={!editing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pre-University">Pre-University</SelectItem>
                    <SelectItem value="Foundation">Foundation</SelectItem>
                    <SelectItem value="Year 1">Year 1</SelectItem>
                    <SelectItem value="Year 2">Year 2</SelectItem>
                    <SelectItem value="Year 3">Year 3</SelectItem>
                    <SelectItem value="Year 4">Year 4</SelectItem>
                    <SelectItem value="Year 5">Year 5</SelectItem>
                    <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label htmlFor="graduationDate">Graduation Date</Label>
                <Input
                  id="graduationDate"
                  type="date"
                  value={formData.graduationDate}
                  onChange={(e) => setFormData({ ...formData, graduationDate: e.target.value })}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label htmlFor="universityId">University ID</Label>
                <Input
                  id="universityId"
                  value={formData.universityId}
                  onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                  disabled={!editing}
                  placeholder="Your student ID number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="border-ashinaga-teal-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dietaryInformation">Dietary Information</Label>
              <Textarea
                id="dietaryInformation"
                value={formData.dietaryInformation}
                onChange={(e) => setFormData({ ...formData, dietaryInformation: e.target.value })}
                disabled={!editing}
                rows={2}
                placeholder="Any dietary restrictions or preferences"
              />
            </div>
            <div>
              <Label htmlFor="kokorozashi">Kokorozashi</Label>
              <Textarea
                id="kokorozashi"
                value={formData.kokorozashi}
                onChange={(e) => setFormData({ ...formData, kokorozashi: e.target.value })}
                disabled={!editing}
                rows={4}
                placeholder="Your purpose and aspirations"
              />
            </div>
            <div>
              <Label htmlFor="longTermCareerPlan">Long Term Career Plan</Label>
              <Textarea
                id="longTermCareerPlan"
                value={formData.longTermCareerPlan}
                onChange={(e) => setFormData({ ...formData, longTermCareerPlan: e.target.value })}
                disabled={!editing}
                rows={3}
                placeholder="Your career goals and plans"
              />
            </div>
            <div>
              <Label htmlFor="postGraduationPlan">Post-Graduation Plan</Label>
              <Textarea
                id="postGraduationPlan"
                value={formData.postGraduationPlan}
                onChange={(e) => setFormData({ ...formData, postGraduationPlan: e.target.value })}
                disabled={!editing}
                rows={3}
                placeholder="What you plan to do after graduation"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!editing}
                rows={3}
                placeholder="A brief description about yourself"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {editing && (
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
