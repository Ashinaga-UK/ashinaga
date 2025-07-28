'use client';

import type React from 'react';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Upload, UserPlus, Send, FileSpreadsheet, CheckCircle } from 'lucide-react';

interface StudentOnboardingProps {
  onBack: () => void;
}

interface StudentData {
  firstName: string;
  lastName: string;
  aaiStudentId: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  phoneNumber: string;
  email: string;
  passportExpirationDate: string;
  visaExpirationDate: string;
  addressCountryOfStudy: string;
  addressHomeCountry: string;
  emergencyContactCountryOfStudy: string;
  emergencyContactHomeCountry: string;
  universityStudentId: string;
  dietaryInfo: string;
  kokorozashi: string;
  longTermCareerPlan: string;
  postGraduationPlan: string;
  program: string;
  university: string;
  year: string;
  startDate: string;
}

const initialStudentData: StudentData = {
  firstName: '',
  lastName: '',
  aaiStudentId: '',
  dateOfBirth: '',
  gender: '',
  nationality: '',
  phoneNumber: '',
  email: '',
  passportExpirationDate: '',
  visaExpirationDate: '',
  addressCountryOfStudy: '',
  addressHomeCountry: '',
  emergencyContactCountryOfStudy: '',
  emergencyContactHomeCountry: '',
  universityStudentId: '',
  dietaryInfo: '',
  kokorozashi: '',
  longTermCareerPlan: '',
  postGraduationPlan: '',
  program: '',
  university: '',
  year: '',
  startDate: '',
};

export function StudentOnboarding({ onBack }: StudentOnboardingProps) {
  const [activeTab, setActiveTab] = useState('single');
  const [studentData, setStudentData] = useState<StudentData>(initialStudentData);
  const [csvData, setCsvData] = useState<StudentData[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof StudentData, value: string) => {
    setStudentData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      // Mock CSV parsing - in real app, you'd parse the actual CSV
      const mockCsvData: StudentData[] = [
        {
          firstName: 'John',
          lastName: 'Doe',
          aaiStudentId: 'AAI123',
          dateOfBirth: '2000-01-01',
          gender: 'Male',
          nationality: 'British',
          phoneNumber: '+44 7123 456789',
          email: 'john.doe@student.ac.uk',
          passportExpirationDate: '2026-01-01',
          visaExpirationDate: '2025-01-01',
          addressCountryOfStudy: '123 Student St, London',
          addressHomeCountry: '456 Home St, London',
          emergencyContactCountryOfStudy: 'Jane Doe',
          emergencyContactHomeCountry: 'John Smith',
          universityStudentId: 'UNI123',
          dietaryInfo: 'None',
          kokorozashi: 'To become a software engineer',
          longTermCareerPlan: 'Work in AI',
          postGraduationPlan: 'Get a job',
          program: 'Computer Science',
          university: 'Imperial College London',
          year: 'Pre-University',
          startDate: '2025-09-01',
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          aaiStudentId: 'AAI456',
          dateOfBirth: '2001-02-02',
          gender: 'Female',
          nationality: 'American',
          phoneNumber: '+44 7234 567890',
          email: 'jane.smith@student.ac.uk',
          passportExpirationDate: '2027-02-02',
          visaExpirationDate: '2026-02-02',
          addressCountryOfStudy: '456 Scholar Ave, Edinburgh',
          addressHomeCountry: '789 Home Ave, New York',
          emergencyContactCountryOfStudy: 'John Smith',
          emergencyContactHomeCountry: 'Jane Doe',
          universityStudentId: 'UNI456',
          dietaryInfo: 'Vegetarian',
          kokorozashi: 'To become a doctor',
          longTermCareerPlan: 'Work in healthcare',
          postGraduationPlan: 'Go to medical school',
          program: 'Medicine',
          university: 'University of Edinburgh',
          year: 'Foundation',
          startDate: '2025-09-01',
        },
      ];
      setCsvData(mockCsvData);
    }
  };

  const handleSingleStudentSubmit = async () => {
    setIsSubmitting(true);
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setStep(2);
    setIsSubmitting(false);
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
              <h2 className="text-2xl font-bold text-gray-900">Students Successfully Onboarded!</h2>
              <p className="text-gray-600">
                {activeTab === 'single'
                  ? `${studentData.firstName} ${studentData.lastName} has been added to the system and invitation sent.`
                  : `${csvData.length} students have been added to the system and invitations sent.`}
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
                ? 'Send an invitation email to the new student'
                : 'Send invitation emails to all new students'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Invitation Preview</h4>
              <p className="text-sm text-blue-800">
                Students will receive an email with login credentials and instructions to access the
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
            Onboard New Students
          </CardTitle>
          <CardDescription>Add new students to the Ashinaga platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Student</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import (CSV)</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={studentData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter student's first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={studentData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter student's last name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="aaiStudentId">AAI Student ID</Label>
                    <Input
                      id="aaiStudentId"
                      value={studentData.aaiStudentId}
                      onChange={(e) => handleInputChange('aaiStudentId', e.target.value)}
                      placeholder="Enter AAI Student ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={studentData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={studentData.gender}
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
                      value={studentData.nationality}
                      onChange={(e) => handleInputChange('nationality', e.target.value)}
                      placeholder="Enter nationality"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={studentData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      placeholder="+44 7123 456789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={studentData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="student@university.ac.uk"
                    />
                  </div>
                  <div>
                    <Label htmlFor="addressCountryOfStudy">Address (Country of Study)</Label>
                    <Textarea
                      id="addressCountryOfStudy"
                      value={studentData.addressCountryOfStudy}
                      onChange={(e) => handleInputChange('addressCountryOfStudy', e.target.value)}
                      placeholder="Student's address in the country of study"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="addressHomeCountry">Address (Home Country)</Label>
                    <Textarea
                      id="addressHomeCountry"
                      value={studentData.addressHomeCountry}
                      onChange={(e) => handleInputChange('addressHomeCountry', e.target.value)}
                      placeholder="Student's address in their home country"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="passportExpirationDate">Passport Expiration Date</Label>
                    <Input
                      id="passportExpirationDate"
                      type="date"
                      value={studentData.passportExpirationDate}
                      onChange={(e) => handleInputChange('passportExpirationDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="visaExpirationDate">Visa Expiration Date</Label>
                    <Input
                      id="visaExpirationDate"
                      type="date"
                      value={studentData.visaExpirationDate}
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
                      value={studentData.emergencyContactCountryOfStudy}
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
                      value={studentData.emergencyContactHomeCountry}
                      onChange={(e) =>
                        handleInputChange('emergencyContactHomeCountry', e.target.value)
                      }
                      placeholder="Emergency contact in home country"
                    />
                  </div>
                  <div>
                    <Label htmlFor="program">Program of Study *</Label>
                    <Select
                      value={studentData.program}
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
                      value={studentData.university}
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
                      value={studentData.year}
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
                      value={studentData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="universityStudentId">University Student ID</Label>
                    <Input
                      id="universityStudentId"
                      value={studentData.universityStudentId}
                      onChange={(e) => handleInputChange('universityStudentId', e.target.value)}
                      placeholder="Enter University Student ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dietaryInfo">Dietary Information</Label>
                    <Textarea
                      id="dietaryInfo"
                      value={studentData.dietaryInfo}
                      onChange={(e) => handleInputChange('dietaryInfo', e.target.value)}
                      placeholder="Any dietary restrictions or allergies"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="kokorozashi">Kokorozashi Essay</Label>
                    <Textarea
                      id="kokorozashi"
                      value={studentData.kokorozashi}
                      onChange={(e) => handleInputChange('kokorozashi', e.target.value)}
                      placeholder="Kokorozashi Essay"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="longTermCareerPlan">Long Term Career Plan</Label>
                    <Textarea
                      id="longTermCareerPlan"
                      value={studentData.longTermCareerPlan}
                      onChange={(e) => handleInputChange('longTermCareerPlan', e.target.value)}
                      placeholder="Long Term Career Plan"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postGraduationPlan">Post Graduation Plan</Label>
                    <Textarea
                      id="postGraduationPlan"
                      value={studentData.postGraduationPlan}
                      onChange={(e) => handleInputChange('postGraduationPlan', e.target.value)}
                      placeholder="Post Graduation Plan"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSingleStudentSubmit}
                  disabled={
                    !studentData.firstName ||
                    !studentData.lastName ||
                    !studentData.email ||
                    !studentData.program ||
                    isSubmitting
                  }
                  className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
                >
                  {isSubmitting ? 'Creating...' : 'Create Student'}
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
                            {csvData.map((student, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {student.firstName} {student.lastName}
                                </TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>{student.program}</TableCell>
                                <TableCell>{student.university}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{student.year}</Badge>
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
                          {isSubmitting ? 'Importing...' : `Import ${csvData.length} Students`}
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
