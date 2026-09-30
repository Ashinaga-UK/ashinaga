import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchAPI } from '../lib/api-client';
import { SignupPage } from './signup-page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams('token=prep-token'),
}));

jest.mock('../lib/api-client', () => ({
  fetchAPI: jest.fn(),
}));

const mockFetchAPI = fetchAPI as jest.MockedFunction<typeof fetchAPI>;

describe('SignupPage intended course', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchAPI.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/api/scholars/filters') {
        return {
          programs: [],
          universities: [],
          intendedUniversities: [],
          intendedCourses: [],
        };
      }

      return {
        id: 'invitation-1',
        email: 'candidate@example.com',
        userType: 'scholar',
        scholarData: {
          name: 'Prep Candidate',
          programStage: 'prep_year',
          intendedUniversity: 'University of Edinburgh',
          degreePathway: 'Foundation Year',
        },
        expiresAt: '2026-10-01T00:00:00.000Z',
      };
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Expected test response' }),
    }) as jest.Mock;
  });

  it('requires and submits a custom course after selecting Other', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    const coursePicker = await screen.findByLabelText(/Intended Course/);
    await user.click(coursePicker);
    await user.type(screen.getByPlaceholderText('Search courses...'), 'Marine Robotics');
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
    expect(screen.queryByText(/Using "/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Other' }));

    const customCourseInput = screen.getByLabelText('Specific course name');
    expect(customCourseInput).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^Password/), 'password123');
    await user.type(screen.getByLabelText(/Confirm Password/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Intended course is required')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    await user.type(customCourseInput, 'Marine Robotics');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, request] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(request.body as string)).toMatchObject({
      invitationToken: 'prep-token',
      intendedCourse: 'Marine Robotics',
    });
  });

  it('still offers a typed university when that field allows a custom value', async () => {
    mockFetchAPI.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/api/scholars/filters') {
        return {
          programs: [],
          universities: [],
          intendedUniversities: [],
          intendedCourses: [],
        };
      }

      return {
        id: 'invitation-1',
        email: 'candidate@example.com',
        userType: 'scholar',
        scholarData: {
          name: 'Prep Candidate',
          programStage: 'prep_year',
          degreePathway: 'Foundation Year',
        },
        expiresAt: '2026-10-01T00:00:00.000Z',
      };
    });

    const user = userEvent.setup();
    render(<SignupPage />);

    await user.click(await screen.findByLabelText(/Intended University/));
    await user.type(
      screen.getByPlaceholderText('Start typing a university...'),
      'Atlantis Institute'
    );

    expect(await screen.findByText('Using "Atlantis Institute"')).toBeInTheDocument();
  });
});
