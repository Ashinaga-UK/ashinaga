import { fetchAPI } from '../api-client';

export interface ScholarProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  phone?: string | null;
  program: string;
  year: string;
  university: string;
  location?: string | null;
  bio?: string | null;
  status: 'active' | 'inactive' | 'on_hold';
  startDate: string;
  lastActivity?: string | null;

  // New profile fields
  aaiScholarId?: string | null;
  dateOfBirth?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  nationality?: string | null;
  addressHomeCountry?: string | null;
  passportExpirationDate?: string | null;
  visaExpirationDate?: string | null;
  emergencyContactCountryOfStudy?: string | null;
  emergencyContactHomeCountry?: string | null;
  graduationDate?: string | null;
  universityId?: string | null;
  dietaryInformation?: string | null;
  kokorozashi?: string | null;
  longTermCareerPlan?: string | null;
  postGraduationPlan?: string | null;

  // Related data
  goals: any[];
  tasks: any[];
  documents: any[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationality?: string;
  location?: string; // Address (Country of Study)
  addressHomeCountry?: string;
  passportExpirationDate?: string;
  visaExpirationDate?: string;
  emergencyContactCountryOfStudy?: string;
  emergencyContactHomeCountry?: string;
  program?: string;
  university?: string;
  year?: string;
  startDate?: string;
  graduationDate?: string;
  universityId?: string;
  dietaryInformation?: string;
  kokorozashi?: string;
  longTermCareerPlan?: string;
  postGraduationPlan?: string;
  bio?: string;
}

export async function getMyProfile(): Promise<ScholarProfile> {
  return fetchAPI<ScholarProfile>('/api/scholars/my-profile');
}

export async function updateMyProfile(data: UpdateProfileData): Promise<ScholarProfile> {
  return fetchAPI<ScholarProfile>('/api/scholars/my-profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
