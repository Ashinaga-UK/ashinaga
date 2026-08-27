import { render, screen, waitFor } from '@testing-library/react';
import { ScholarSessionProvider } from '../lib/scholar-session';
import { MyProfile } from './my-profile';

const mockGetMyProfile = jest.fn();

jest.mock('../lib/api/profile', () => ({
  getMyProfile: (...args: unknown[]) => mockGetMyProfile(...args),
  updateMyProfile: jest.fn(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt?: string }) => <span role="img" aria-label={props.alt || ''} />,
}));

describe('MyProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Prep Year Candidate badge and intended pathway card', async () => {
    mockGetMyProfile.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      name: 'Ada Prep',
      email: 'ada@example.com',
      program: 'Prep',
      year: 'TBD',
      university: 'TBD',
      status: 'active',
      startDate: '2026-09-01',
      programStage: 'prep_year',
      intendedUniversity: 'University of Edinburgh',
      intendedCourse: 'Computer Science',
      degreePathway: 'Foundation Year',
      goals: [],
      tasks: [],
      documents: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });

    render(
      <ScholarSessionProvider>
        <MyProfile />
      </ScholarSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prep Year Candidate')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Prep Year Candidate')).toBeInTheDocument();
    expect(screen.queryByText('Ashinaga · Prep Year')).not.toBeInTheDocument();
    expect(screen.getByText('Intended Pathway')).toBeInTheDocument();
    expect(screen.getByText('Not yet enrolled at university.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('University of Edinburgh')).toBeInTheDocument();
    expect(screen.queryByText('Academic Information')).not.toBeInTheDocument();
    expect(screen.queryByText('Academic Year')).not.toBeInTheDocument();
  });

  it('keeps academic information for confirmed scholars', async () => {
    mockGetMyProfile.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      name: 'Ada Scholar',
      email: 'ada@example.com',
      program: 'Engineering',
      year: 'Year 1',
      university: 'MIT',
      status: 'active',
      startDate: '2026-09-01',
      programStage: 'scholar',
      goals: [],
      tasks: [],
      documents: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });

    render(
      <ScholarSessionProvider>
        <MyProfile />
      </ScholarSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Academic Information')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Scholar')).toBeInTheDocument();
    expect(screen.queryByText('Intended Pathway')).not.toBeInTheDocument();
    expect(screen.getByText('Academic Year')).toBeInTheDocument();
    expect(screen.queryByText('Pre-University')).not.toBeInTheDocument();
  });
});
