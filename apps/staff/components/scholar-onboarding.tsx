'use client';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  FileSpreadsheet,
  Send,
  Upload,
  UserPlus,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { createScholar } from '../lib/api-client';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';

interface ScholarOnboardingProps {
  onBack: () => void;
}

interface ScholarData {
  name: string;
  aaiScholarId: string;
  dateOfBirth: string;
  gender: string;
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
}

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
};

export function ScholarOnboarding({ onBack }: ScholarOnboardingProps) {
  const [activeTab, setActiveTab] = useState('single');
  const [scholarData, setScholarData] = useState<ScholarData>(initialScholarData);
  const [csvData, setCsvData] = useState<ScholarData[]>([]);
  const [_csvFile, setCsvFile] = useState<File | null>(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof ScholarData, value: string) => {
    setScholarData((prev) => ({ ...prev, [field]: value }));
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
          gender: 'Male',
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
        },
        {
          name: 'Jane Smith',
          aaiScholarId: 'AAI456',
          dateOfBirth: '2001-02-02',
          gender: 'Female',
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
        },
      ];
      setCsvData(mockCsvData);
    }
  };

  const handleSingleScholarSubmit = async () => {
    setIsSubmitting(true);
    console.log('Submitting scholar data:', scholarData);

    // Clean up the data - remove empty strings for optional fields
    const cleanedData: any = {};
    Object.entries(scholarData).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        cleanedData[key] = value;
      }
    });

    console.log('Cleaned scholar data:', cleanedData);

    try {
      const result = await createScholar(cleanedData);
      console.log('Create scholar result:', result);
      if (result.success) {
        setStep(3); // Skip to success - invitation is already sent
      } else {
        console.error('Failed to create scholar:', result);
        alert('Failed to create scholar. Please try again.');
      }
    } catch (error) {
      console.error('Error creating scholar:', error);
      alert('Error creating scholar. Please check the console for details.');
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
              <h2 className="text-2xl font-bold text-gray-900">Scholars Successfully Onboarded!</h2>
              <p className="text-gray-600">
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
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Invitation Preview</h4>
              <p className="text-sm text-blue-800">
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
                      placeholder="scholar@university.ac.uk"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="aaiScholarId">AAI Scholar ID</Label>
                    <Input
                      id="aaiScholarId"
                      value={scholarData.aaiScholarId}
                      onChange={(e) => handleInputChange('aaiScholarId', e.target.value)}
                      placeholder="Enter AAI Scholar ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={scholarData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={scholarData.gender}
                      onValueChange={(value) => handleInputChange('gender', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={scholarData.nationality}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                      placeholder="Enter nationality"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={scholarData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+44 7123 456789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Address (Country of Study)</Label>
                    <Textarea
                      id="location"
                      value={scholarData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="Scholar's address in the country of study"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="addressHomeCountry">Address (Home Country)</Label>
                    <Textarea
                      id="addressHomeCountry"
                      value={scholarData.addressHomeCountry}
                      onChange={(e) => handleInputChange('addressHomeCountry', e.target.value)}
                      placeholder="Scholar's address in their home country"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="passportExpirationDate">Passport Expiration Date</Label>
                    <Input
                      id="passportExpirationDate"
                      type="date"
                      value={scholarData.passportExpirationDate}
                      onChange={(e) => handleInputChange('passportExpirationDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="visaExpirationDate">Visa Expiration Date</Label>
                    <Input
                      id="visaExpirationDate"
                      type="date"
                      value={scholarData.visaExpirationDate}
                      onChange={(e) => handleInputChange('visaExpirationDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="emergencyContactCountryOfStudy">
                      Emergency Contact (Country of Study)
                    </Label>
                    <Input
                      id="emergencyContactCountryOfStudy"
                      value={scholarData.emergencyContactCountryOfStudy}
                      onChange={(e) =>
                        handleInputChange('emergencyContactCountryOfStudy', e.target.value)
                      }
                      placeholder="Emergency contact in country of study"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyContactHomeCountry">
                      Emergency Contact (Home Country)
                    </Label>
                    <Input
                      id="emergencyContactHomeCountry"
                      value={scholarData.emergencyContactHomeCountry}
                      onChange={(e) =>
                        handleInputChange('emergencyContactHomeCountry', e.target.value)
                      }
                      placeholder="Emergency contact in home country"
                    />
                  </div>
                  <div>
                    <Label htmlFor="program">Program of Study *</Label>
                    <Select
                      value={scholarData.program}
                      onValueChange={(value) => handleInputChange('program', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                        <SelectItem value="Medicine">Medicine</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="International Relations">
                          International Relations
                        </SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Law">Law</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="university">University</Label>
                    <Select
                      value={scholarData.university}
                      onValueChange={(value) => handleInputChange('university', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select university" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Imperial College London">
                          Imperial College London
                        </SelectItem>
                        <SelectItem value="University of Edinburgh">
                          University of Edinburgh
                        </SelectItem>
                        <SelectItem value="LSE">London School of Economics</SelectItem>
                        <SelectItem value="Cambridge University">Cambridge University</SelectItem>
                        <SelectItem value="Oxford University">Oxford University</SelectItem>
                        <SelectItem value="UCL">University College London</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="year">Academic Year</Label>
                    <Select
                      value={scholarData.year}
                      onValueChange={(value) => handleInputChange('year', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
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
                      value={scholarData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="universityId">University Scholar ID</Label>
                    <Input
                      id="universityId"
                      value={scholarData.universityId}
                      onChange={(e) => handleInputChange('universityId', e.target.value)}
                      placeholder="Enter University Scholar ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dietaryInformation">Dietary Information</Label>
                    <Textarea
                      id="dietaryInformation"
                      value={scholarData.dietaryInformation}
                      onChange={(e) => handleInputChange('dietaryInformation', e.target.value)}
                      placeholder="Any dietary restrictions or allergies"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="kokorozashi">Kokorozashi Essay</Label>
                    <Textarea
                      id="kokorozashi"
                      value={scholarData.kokorozashi}
                      onChange={(e) => handleInputChange('kokorozashi', e.target.value)}
                      placeholder="Kokorozashi Essay"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="longTermCareerPlan">Long Term Career Plan</Label>
                    <Textarea
                      id="longTermCareerPlan"
                      value={scholarData.longTermCareerPlan}
                      onChange={(e) => handleInputChange('longTermCareerPlan', e.target.value)}
                      placeholder="Long Term Career Plan"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postGraduationPlan">Post Graduation Plan</Label>
                    <Textarea
                      id="postGraduationPlan"
                      value={scholarData.postGraduationPlan}
                      onChange={(e) => handleInputChange('postGraduationPlan', e.target.value)}
                      placeholder="Post Graduation Plan"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

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
                <div className="border-2 border-dashed border-ashinaga-teal-200 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 text-ashinaga-teal-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                  <p className="text-gray-600 mb-4">
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
