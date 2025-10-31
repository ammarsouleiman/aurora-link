export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-12 h-12 bg-muted rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

export function MessageSkeleton({ isSent = false }: { isSent?: boolean }) {
  return (
    <div className={`flex gap-2 mb-2 animate-pulse ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isSent && <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0" />}
      <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        <div className="h-12 bg-muted rounded-2xl w-64" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center p-8 animate-pulse">
      <div className="w-24 h-24 bg-muted rounded-full mb-4" />
      <div className="h-6 bg-muted rounded w-48 mb-2" />
      <div className="h-4 bg-muted rounded w-32" />
    </div>
  );
}
