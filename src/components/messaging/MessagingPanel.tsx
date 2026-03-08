import MessageComposer from './MessageComposer';
import MessageList from './MessageList';
import { MessageSquare } from 'lucide-react';

interface MessagingPanelProps {
  receiverId?: string;
  receiverLabel?: string;
}

export default function MessagingPanel({ receiverId, receiverLabel }: MessagingPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">Messages</h3>
          <p className="text-xs text-muted-foreground">Communication between hospitals and admin</p>
        </div>
      </div>

      <MessageComposer receiverId={receiverId} receiverLabel={receiverLabel} />
      <MessageList />
    </div>
  );
}
