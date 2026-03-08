import { useState } from 'react';
import { useData } from '@/context/DataProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';

interface MessageComposerProps {
  receiverId?: string;
  receiverLabel?: string;
  onSent?: () => void;
}

export default function MessageComposer({ receiverId, receiverLabel, onSent }: MessageComposerProps) {
  const { user, profile, isAdmin } = useData();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    if (!user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: receiverId || null,
        sender_name: profile?.hospital_name || profile?.full_name || user.email || 'Unknown',
        sender_role: isAdmin ? 'admin' : 'hospital',
        subject: subject.trim(),
        body: body.trim(),
      });

      if (error) throw error;

      setSubject('');
      setBody('');
      toast.success('Message sent');
      onSent?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-4">
      <h3 className="font-heading text-base font-bold text-foreground">
        New Message {receiverLabel ? `to ${receiverLabel}` : ''}
      </h3>
      <Input
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="bg-secondary/50 border-border"
      />
      <Textarea
        placeholder="Type your message..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="bg-secondary/50 border-border resize-none"
      />
      <div className="flex justify-end">
        <Button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !body.trim()}
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-primary to-cyan hover:opacity-90"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send
        </Button>
      </div>
    </div>
  );
}
