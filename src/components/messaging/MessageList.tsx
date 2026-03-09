import { useEffect, useState, useCallback } from 'react';
import { useData } from '@/context/DataProvider';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Mail, MailOpen, MessageSquare, User, ShieldCheck } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  sender_name: string;
  sender_role: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function MessageList() {
  const { user, isAdmin } = useData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    setMessages((data as Message[]) || []);
  }, [user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('messages_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages]);

  const toggleExpand = async (msg: Message) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(msg.id);

    // Mark as read if receiver
    if (!msg.is_read && (msg.receiver_id === user?.id || (isAdmin && msg.sender_role === 'hospital'))) {
      await supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  const unreadCount = messages.filter(m => !m.is_read && m.sender_id !== user?.id).length;

  if (messages.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-muted bg-muted/50">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-lg font-heading font-semibold text-foreground">No messages yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Start a conversation using the composer above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            {unreadCount} unread
          </Badge>
        </div>
      )}

      {messages.slice(0, 5).map((msg) => {
        const isMine = msg.sender_id === user?.id;
        const isExpanded = expandedId === msg.id;
        const isUnread = !msg.is_read && !isMine;

        return (
          <div
            key={msg.id}
            onClick={() => toggleExpand(msg)}
            className={`rounded-2xl border bg-card shadow-card overflow-hidden cursor-pointer transition-all card-hover ${
              isUnread
                ? 'border-primary/40 bg-primary/5'
                : 'border-border hover:border-primary/20'
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {isUnread ? (
                    <Mail className="h-4 w-4 text-primary" />
                  ) : (
                    <MailOpen className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={`font-heading text-sm font-bold ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {msg.subject}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>

              <div className="flex items-center gap-2 ml-6">
                {msg.sender_role === 'admin' ? (
                  <ShieldCheck className="h-3 w-3 text-destructive" />
                ) : (
                  <User className="h-3 w-3 text-primary" />
                )}
                <span className="text-xs text-muted-foreground">
                  {isMine ? 'You' : msg.sender_name}
                </span>
                <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                  {msg.sender_role}
                </Badge>
              </div>

              {isExpanded && (
                <div className="mt-3 ml-6 rounded-xl border border-border bg-secondary/50 p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{msg.body}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
