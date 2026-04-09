'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader } from 'lucide-react';
import { useSessionContext } from '@/components/auth-provider';

interface Reply {
  id: string;
  reply_from: string;
  subject: string;
  body: string;
  detected_objection: string;
  sentiment: string;
  reply_date: string;
  user_responded: boolean;
  suggested_response: string;
}

interface ReplyHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectId: string;
  prospectName: string;
  campaignId: string;
}

export default function ReplyHistoryModal({
  isOpen,
  onClose,
  prospectId,
  prospectName,
  campaignId,
}: ReplyHistoryModalProps) {
  const { session } = useSessionContext();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedReplyId, setExpandedReplyId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadReplies();
    }
  }, [isOpen, prospectId, campaignId]);

  const loadReplies = async () => {
    if (!session?.access_token) {
      setError('Not authenticated');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:4000/campaigns-v2/${campaignId}/prospects/${prospectId}/replies`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error('Failed to load replies');
      }

      const data = await res.json();
      setReplies(data.replies || []);
    } catch (err) {
      console.error('[reply-history] Error loading replies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load replies');
    } finally {
      setLoading(false);
    }
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'question':
        return 'bg-blue-100 text-blue-800';
      case 'objection':
        return 'bg-yellow-100 text-yellow-800';
      case 'not-interested':
        return 'bg-red-100 text-red-800';
      case 'out-of-office':
        return 'bg-gray-100 text-gray-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Reply History</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {prospectName} • {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">Error: {error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={loadReplies}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && replies.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No replies found</p>
            </div>
          )}

          {!loading && !error && replies.length > 0 && (
            replies.map((reply) => (
              <Card
                key={reply.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setExpandedReplyId(
                    expandedReplyId === reply.id ? null : reply.id
                  )
                }
              >
                <div className="space-y-2">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {reply.reply_from}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(reply.reply_date)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`${getIntentColor(reply.detected_objection)}`}>
                        {reply.detected_objection}
                      </Badge>
                      {reply.user_responded && (
                        <Badge variant="outline" className="bg-green-50">
                          ✓ Responded
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Subject */}
                  <p className="text-sm font-medium text-foreground truncate">
                    {reply.subject || '(no subject)'}
                  </p>

                  {/* Body preview / full body */}
                  <div className="bg-muted/50 rounded p-3 text-sm">
                    {expandedReplyId === reply.id ? (
                      <>
                        <p className="text-foreground whitespace-pre-wrap break-words">
                          {reply.body}
                        </p>
                        {reply.user_responded && (
                          <div className="mt-4 pt-4 border-t border-muted space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              You responded to this
                            </p>
                            {reply.suggested_response && (
                              <div className="bg-green-50 rounded p-2 text-xs">
                                <p className="text-green-800">
                                  {reply.suggested_response}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">
                        {reply.body.substring(0, 150)}
                        {reply.body.length > 150 ? '...' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
