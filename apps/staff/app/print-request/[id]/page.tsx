'use client';

import { Printer } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getRequests, type Request } from '../../../lib/api-client';
import { Button } from '../../../components/ui/button';

export default function PrintRequestPage() {
  const params = useParams();
  const requestId = params.id as string;
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequest() {
      try {
        const response = await getRequests({});
        const foundRequest = response.data.find((r) => r.id === requestId);
        if (foundRequest) {
          setRequest(foundRequest);
        } else {
          setError('Request not found');
        }
      } catch (err) {
        console.error('Error fetching request:', err);
        setError('Failed to load request details');
      } finally {
        setLoading(false);
      }
    }

    fetchRequest();
  }, [requestId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading request details...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">{error || 'Request not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print Button - Hidden during print */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button onClick={handlePrint} size="lg">
          <Printer className="h-5 w-5 mr-2" />
          Print Document
        </Button>
      </div>

      {/* Printable Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ashinaga Scholar Request</h1>
              <p className="text-sm text-gray-600 mt-1">Official Request Proof</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Request ID</p>
              <p className="text-xs text-gray-600 font-mono">{request.id.substring(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Request Status Badge */}
        <div className="mb-6">
          <div className="inline-block">
            <div
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                request.status === 'approved'
                  ? 'bg-green-100 text-green-800 border-2 border-green-300'
                  : request.status === 'rejected'
                    ? 'bg-red-100 text-red-800 border-2 border-red-300'
                    : 'bg-gray-100 text-gray-800 border-2 border-gray-300'
              }`}
            >
              Status: {request.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Scholar Information */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Scholar Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Scholar Name</p>
              <p className="text-base text-gray-900">{request.scholarName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className="text-base text-gray-900">{request.scholarEmail}</p>
            </div>
          </div>
        </div>

        {/* Request Details */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Request Details
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Request Type</p>
              <p className="text-base text-gray-900 capitalize">
                {request.type.replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Priority</p>
              <p className="text-base text-gray-900 capitalize">{request.priority}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Submitted Date</p>
              <p className="text-base text-gray-900">
                {new Date(request.submittedDate).toLocaleString('en-GB', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Description</p>
              <p className="text-base text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                {request.description}
              </p>
            </div>
          </div>
        </div>

        {/* Review Details */}
        {request.reviewComment && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
              Review Decision
            </h2>
            <div className="space-y-3">
              {request.reviewDate && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Review Date</p>
                  <p className="text-base text-gray-900">
                    {new Date(request.reviewDate).toLocaleString('en-GB', {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">Review Comment</p>
                <p className="text-base text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                  {request.reviewComment}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Attachments */}
        {request.attachments && request.attachments.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
              Attachments
            </h2>
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <ul className="space-y-2">
                {request.attachments.map((attachment, index) => (
                  <li key={index} className="text-sm text-gray-900">
                    <span className="font-medium">{index + 1}.</span> {attachment.name} (
                    {attachment.size})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Audit Log */}
        {request.auditLogs && request.auditLogs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
              Complete Audit Trail
            </h2>
            <div className="space-y-3">
              {request.auditLogs.map((log, index) => (
                <div
                  key={log.id}
                  className="bg-gray-50 p-4 rounded border border-gray-200 break-inside-avoid"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {index + 1}. {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(log.createdAt).toLocaleString('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  {log.previousStatus && log.newStatus && (
                    <p className="text-sm text-gray-700 mb-1">
                      Status changed from <span className="font-medium">{log.previousStatus}</span>{' '}
                      to <span className="font-medium">{log.newStatus}</span>
                    </p>
                  )}
                  {log.comment && (
                    <p className="text-sm text-gray-700 italic">
                      Comment: &quot;{log.comment}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t-2 border-gray-300">
          <div className="text-center text-sm text-gray-600">
            <p>This document serves as official proof of the request and its approval status.</p>
            <p className="mt-1">
              Generated on {new Date().toLocaleString('en-GB', { dateStyle: 'full' })} at{' '}
              {new Date().toLocaleString('en-GB', { timeStyle: 'short' })}
            </p>
            <p className="mt-4 font-medium text-gray-900">
              © {new Date().getFullYear()} Ashinaga. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
