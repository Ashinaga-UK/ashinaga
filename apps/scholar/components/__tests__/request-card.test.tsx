import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Request } from '../../lib/api-client';
import { RequestCard } from '../request-card';

function renderCard(request: Request) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <RequestCard request={request} />
    </QueryClientProvider>
  );
}

function baseRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req-1',
    scholarId: 'scholar-1',
    scholarName: 'Ada Scholar',
    scholarEmail: 'ada@example.com',
    type: 'extenuating_circumstances',
    description: 'I need extra time for exams.',
    formData: null,
    priority: 'medium',
    status: 'pending',
    submittedDate: '2026-08-01T00:00:00.000Z',
    attachments: [],
    auditLogs: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('RequestCard expanded details', () => {
  it('hides the chevron when there is nothing extra to expand', () => {
    renderCard(baseRequest());

    expect(screen.queryByRole('button', { name: 'Show extra details' })).not.toBeInTheDocument();
    expect(
      screen.queryByText('No further information to show at the moment')
    ).not.toBeInTheDocument();
  });

  it('shows form details when the chevron is opened', () => {
    renderCard(
      baseRequest({
        type: 'summer_funding_request',
        formData: { activityType: 'internship_ssa' },
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show extra details' }));

    expect(screen.getByText('Form Details')).toBeInTheDocument();
    expect(screen.getByText('Activity Type')).toBeInTheDocument();
    expect(
      screen.getByText('An 8-week+ internship in sub-Saharan Africa')
    ).toBeInTheDocument();
  });

  it('shows attachment downloads when the chevron is opened', () => {
    renderCard(
      baseRequest({
        attachments: [
          {
            id: 'att-1',
            name: 'evidence.pdf',
            size: '12 KB',
            url: 'https://example.com/evidence.pdf',
            mimeType: 'application/pdf',
            uploadedAt: '2026-08-01T00:00:00.000Z',
          },
        ],
      })
    );

    expect(screen.getByText('1 attachment')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show extra details' }));
    expect(screen.getByText('evidence.pdf')).toBeInTheDocument();
  });
});
