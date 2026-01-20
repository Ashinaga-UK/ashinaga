'use client';

import { Calendar, ChevronDown, ChevronUp, Download, Paperclip } from 'lucide-react';
import { useState } from 'react';
import type { Request } from '../lib/api-client';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface RequestCardProps {
  request: Request;
}

export function RequestCard({ request }: RequestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reviewed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'commented':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatRequestType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatFormDataLabel = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/_/g, ' ');
  };

  const formatFormDataValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'string') {
      // Format enum-like values
      return value
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return String(value);
  };

  const renderFormData = () => {
    if (!request.formData) return null;

    const entries = Object.entries(request.formData).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    );

    if (entries.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-gray-700">Form Details</h4>
        <div className="grid gap-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
              <span className="text-sm font-medium text-gray-600 sm:min-w-[180px]">
                {formatFormDataLabel(key)}:
              </span>
              <span className="text-sm text-gray-800">{formatFormDataValue(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-ashinaga-teal-100">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{formatRequestType(request.type)}</CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={getPriorityColor(request.priority)}>
                {request.priority} priority
              </Badge>
              <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-gray-700">{request.description}</p>
        </div>

        {/* Submitted Date */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>
            Submitted on{' '}
            {new Date(request.submittedDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t">
            {/* Form Data */}
            {renderFormData()}

            {/* Attachments with download links */}
            {request.attachments && request.attachments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Attachments ({request.attachments.length})
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {request.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{attachment.name}</span>
                        <span className="text-gray-500">({attachment.size})</span>
                      </div>
                      <Download className="h-4 w-4 text-gray-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collapsed view: just show attachment count */}
        {!isExpanded && request.attachments && request.attachments.length > 0 && (
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {request.attachments.length} attachment{request.attachments.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Review Details */}
        {request.status !== 'pending' && request.reviewComment && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Staff Review</span>
              <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
            </div>
            <p className="text-sm text-gray-700">{request.reviewComment}</p>
            {request.reviewDate && (
              <p className="text-xs text-gray-500">
                Reviewed on{' '}
                {new Date(request.reviewDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
