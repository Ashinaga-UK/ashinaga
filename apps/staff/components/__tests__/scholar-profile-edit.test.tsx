import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScholarProfilePage } from '../scholar-profile';

const mockMutateAsync = jest.fn();
let mockScholar: Record<string, unknown>;

jest.mock(
  'lucide-react',
  () =>
    new Proxy(
      {},
      {
        get: (_target, prop) => (prop === '__esModule' ? true : () => null),
      }
    )
);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('../../lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'staff-1' } } }),
}));

jest.mock('../../lib/api-client', () => ({
  downloadScholarAnnualReviewsCSV: jest.fn(),
  getFileDownloadUrl: jest.fn(),
  getFilterOptions: jest.fn().mockResolvedValue({
    programs: [],
    years: [],
    universities: [],
    intendedUniversities: [],
    intendedCourses: [],
  }),
  getRequiredDocumentDownloadUrl: jest.fn(),
}));

jest.mock('../../lib/hooks/use-queries', () => ({
  useDeleteTask: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useScholarAnnualUpdates: () => ({ data: [], isLoading: false }),
  useScholarProfile: () => ({ data: mockScholar, isLoading: false, error: null }),
  useScholarRequiredDocuments: () => ({ data: undefined, isLoading: false }),
  useUpdateScholarPlatformSetup: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateScholarProfile: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('../comment-thread', () => ({ CommentThread: () => null }));
jest.mock('../coordinator-panel', () => ({ CoordinatorPanel: () => null }));
jest.mock('../platform-setup-card', () => ({ PlatformSetupCard: () => null }));
jest.mock('../proposal-panel', () => ({ ProposalPanel: () => null }));
jest.mock('../task-assignment', () => ({ TaskAssignment: () => null }));
jest.mock('../task-flags-badges', () => ({ TaskFlagsBadges: () => null }));

function buildScholar(overrides: Record<string, unknown> = {}) {
  return {
    id: 'scholar-1',
    userId: 'user-1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+44 1',
    program: 'Ashinaga Africa Initiative',
    year: 'Year 2',
    university: 'University of Oxford',
    location: 'United Kingdom',
    bio: 'Bio',
    status: 'active',
    programStage: 'scholar',
    startDate: '2024-09-01T00:00:00.000Z',
    graduationDate: '2027-06-30T00:00:00.000Z',
    dateOfBirth: '2002-01-01',
    nationality: 'Kenya',
    addressHomeCountry: 'Nairobi',
    passportExpirationDate: '2030-01-01',
    visaExpirationDate: '2028-02-02',
    emergencyContactCountryOfStudy: 'Old study contact',
    emergencyContactHomeCountry: 'Old home contact',
    universityId: 'U-100',
    majorCategory: 'Engineering',
    fieldOfStudy: 'Mathematics',
    dietaryInformation: 'Vegetarian',
    kokorozashi: 'Old kokorozashi',
    longTermCareerPlan: 'Old career plan',
    postGraduationPlan: 'Old post-grad plan',
    goals: [],
    tasks: [],
    documents: [],
    platformSetups: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

async function openEditDialog() {
  render(<ScholarProfilePage scholarId="scholar-1" onBack={jest.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /edit profile/i }));
  return screen.findByRole('dialog');
}

describe('ScholarProfilePage edit profile dialog (ASH-138)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
    mockScholar = buildScholar();
  });

  it('shows the previously missing fields seeded with current values', async () => {
    await openEditDialog();

    expect(screen.getByLabelText('Passport expiration date')).toHaveValue('2030-01-01');
    expect(screen.getByLabelText('Visa expiration date')).toHaveValue('2028-02-02');
    expect(screen.getByLabelText('Emergency contact (country of study)')).toHaveValue(
      'Old study contact'
    );
    expect(screen.getByLabelText('Emergency contact (home country)')).toHaveValue(
      'Old home contact'
    );
    expect(screen.getByLabelText('University ID')).toHaveValue('U-100');
    expect(screen.getByLabelText('Major category')).toHaveValue('Engineering');
    expect(screen.getByLabelText('Field of study')).toHaveValue('Mathematics');
    expect(screen.getByLabelText('Dietary information')).toHaveValue('Vegetarian');
    expect(screen.getByLabelText('Kokorozashi')).toHaveValue('Old kokorozashi');
    expect(screen.getByLabelText('Long-term career plan')).toHaveValue('Old career plan');
    expect(screen.getByLabelText('Post-graduation plan')).toHaveValue('Old post-grad plan');
  });

  it('sends edited ticket fields to the update mutation on Save', async () => {
    await openEditDialog();

    const edits: Record<string, string> = {
      'Passport expiration date': '2031-03-04',
      'Visa expiration date': '2029-05-06',
      'Emergency contact (country of study)': 'New study contact',
      'Emergency contact (home country)': 'New home contact',
      'University ID': 'U-200',
      'Major category': 'Science',
      'Field of study': 'Physics',
      'Dietary information': 'Vegan',
      Kokorozashi: 'New kokorozashi',
      'Long-term career plan': 'New career plan',
      'Post-graduation plan': 'New post-grad plan',
    };
    for (const [label, value] of Object.entries(edits)) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        passportExpirationDate: '2031-03-04',
        visaExpirationDate: '2029-05-06',
        emergencyContactCountryOfStudy: 'New study contact',
        emergencyContactHomeCountry: 'New home contact',
        universityId: 'U-200',
        majorCategory: 'Science',
        fieldOfStudy: 'Physics',
        dietaryInformation: 'Vegan',
        kokorozashi: 'New kokorozashi',
        longTermCareerPlan: 'New career plan',
        postGraduationPlan: 'New post-grad plan',
      })
    );
  });

  it('sends an empty string when a field is cleared', async () => {
    await openEditDialog();

    fireEvent.change(screen.getByLabelText('Passport expiration date'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('University ID'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Kokorozashi'), { target: { value: '' } });

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    const payload = mockMutateAsync.mock.calls[0][0];
    expect(payload.passportExpirationDate).toBe('');
    expect(payload.universityId).toBe('');
    expect(payload.kokorozashi).toBe('');
    // untouched fields are unchanged
    expect(payload.visaExpirationDate).toBe('2028-02-02');
    expect(payload.fieldOfStudy).toBe('Mathematics');
  });

  it('keeps prep-year intended fields unchanged and still exposes the new fields', async () => {
    mockScholar = buildScholar({
      programStage: 'prep_year',
      intendedUniversity: 'University of Tokyo',
      intendedCourse: 'Computer Science',
      degreePathway: 'Undergraduate',
    });
    await openEditDialog();

    expect(screen.getByLabelText('University ID')).toHaveValue('U-100');
    expect(screen.getByLabelText('Major category')).toHaveValue('Engineering');
    expect(screen.getByLabelText('Field of study')).toHaveValue('Mathematics');

    fireEvent.change(screen.getByLabelText('Field of study'), { target: { value: 'Chemistry' } });

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        programStage: 'prep_year',
        intendedUniversity: 'University of Tokyo',
        intendedCourse: 'Computer Science',
        degreePathway: 'Undergraduate',
        universityId: 'U-100',
        majorCategory: 'Engineering',
        fieldOfStudy: 'Chemistry',
      })
    );
  });
});
