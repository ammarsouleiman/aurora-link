import { X } from 'lucide-react';
import type { Message } from '../utils/types';

interface ReplyPreviewProps {
  message: Message;
  onCancel: () => void;
}

export function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  return (
    <div className="bg-white dark:bg-[#2a3942] border-l-4 border-[#00a884] px-4 py-2 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-full bg-[#00a884] rounded" />
          <p className="text-[13px] text-[#00a884] font-medium">
            {message.sender_id ? message.sender?.full_name : 'You'}
          </p>
        </div>
        <p className="text-[13.5px] text-[#667781] dark:text-[#8696a0] truncate">
          {message.type === 'image' ? '📷 Photo' :
           message.type === 'video' ? '🎥 Video' :
           message.type === 'voice' ? '🎤 Voice message' :
           message.type === 'file' ? '📎 File' :
           message.body || 'Message'}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <X className="w-5 h-5 text-[#667781] dark:text-[#8696a0]" />
      </button>
    </div>
  );
}
