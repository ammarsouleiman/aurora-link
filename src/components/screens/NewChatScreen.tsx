import { useState } from 'react';
import { ArrowLeft, Search, Users, UserPlus, Phone } from '../ui/icons';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar } from '../Avatar';
import { EmptyState } from '../EmptyState';
import { FindByPhoneDialog } from '../FindByPhoneDialog';
import { toast } from '../../utils/toast';
import { conversationsApi } from '../../utils/api';
import { useLastSeen } from '../../utils/hooks/useLastSeen';
import type { User as UserType } from '../../utils/types';

// Component to show last seen for each contact
function ContactLastSeen({ user }: { user: UserType }) {
  const lastSeenText = useLastSeen(user.last_seen, user.is_online, true);
  
  if (!lastSeenText) return null;
  
  return (
    <span className="text-xs text-muted-foreground">
      {lastSeenText}
    </span>
  );
}

interface NewChatScreenProps {
  currentUser: UserType;
  onBack: () => void;
  onConversationCreated: (conversationId: string) => void;
  onViewProfile?: (userId: string) => void;
}

export function NewChatScreen({
  currentUser,
  onBack,
  onConversationCreated,
  onViewProfile,
}: NewChatScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [contacts, setContacts] = useState<UserType[]>([]);

  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      contact.full_name.toLowerCase().includes(query) ||
      contact.username.toLowerCase().includes(query)
    );
  });

  const handleUserFound = async (user: UserType) => {
    // Add to contacts if not already there
    if (!contacts.some(c => c.id === user.id)) {
      setContacts(prev => [user, ...prev]);
    }
    
    // Auto-create DM conversation with this user
    setCreating(true);
    
    try {
      const result = await conversationsApi.create('dm', [user.id]);
      
      if (result.success && result.data?.conversation) {
        toast.success('Chat started!', {
          description: `You can now message ${user.full_name}`,
        });
        onConversationCreated(result.data.conversation.id);
      } else {
        toast.error('Failed to create chat', {
          description: result.error || 'Please try again',
        });
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create chat', {
        description: 'Please try again',
      });
      // Fallback: just select the user
      toggleUserSelection(user.id);
    } finally {
      setCreating(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0 || creating) return;

    setCreating(true);

    try {
      const isGroup = selectedUsers.length > 1;
      const result = await conversationsApi.create(
        isGroup ? 'group' : 'dm',
        selectedUsers,
        isGroup ? groupName || 'New Group' : undefined
      );

      if (result.success && result.data?.conversation) {
        onConversationCreated(result.data.conversation.id);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setCreating(false);
    }
  };

  const isGroup = selectedUsers.length > 1;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2>New Chat</h2>
        </div>

        {/* Search and Find by Phone */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => setShowPhoneDialog(true)}
            className="w-full"
            size="sm"
          >
            <Phone className="w-4 h-4 mr-2" />
            Find by Phone Number
          </Button>
        </div>

        {/* Group name input */}
        {isGroup && (
          <div className="mt-4">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="mt-2"
            />
          </div>
        )}
      </div>

      {/* Selected users */}
      {selectedUsers.length > 0 && (
        <div className="bg-muted px-4 py-3 border-b border-border">
          <p className="text-sm mb-2">
            Selected: {selectedUsers.length} {selectedUsers.length === 1 ? 'person' : 'people'}
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {selectedUsers.map(userId => {
              const user = contacts.find(c => c.id === userId);
              if (!user) return null;
              
              return (
                <button
                  key={userId}
                  onClick={() => toggleUserSelection(userId)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-background hover:bg-surface transition-colors"
                >
                  <Avatar 
                    src={user.avatar_url} 
                    alt={user.full_name} 
                    size="md"
                    showBorder={true}
                  />
                  <span className="text-xs truncate max-w-[60px]">{user.full_name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Contacts list */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length > 0 ? (
          <div className="p-2">
            {filteredContacts.map((contact) => {
              const isSelected = selectedUsers.includes(contact.id);
              
              return (
                <div
                  key={contact.id}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-lg transition-all duration-200 ${
                    isSelected ? 'bg-primary/10 ring-2 ring-primary/30' : 'hover:bg-[var(--hover-surface)]'
                  }`}
                >
                  <button
                    onClick={() => toggleUserSelection(contact.id)}
                    className="flex items-center gap-4 flex-1 min-w-0 text-left"
                  >
                    <Avatar
                      src={contact.avatar_url}
                      alt={contact.full_name}
                      size="lg"
                      status={contact.is_online ? 'online' : 'offline'}
                      showBorder={true}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="truncate">{contact.full_name}</h4>
                      <div className="flex items-center gap-2">
                        <ContactLastSeen user={contact} />
                        {contact.status_message && !contact.is_online && (
                          <span className="text-sm text-muted-foreground truncate">
                            • {contact.status_message}
                          </span>
                        )}
                        {!contact.status_message && !contact.is_online && (
                          <span className="text-sm text-muted-foreground truncate">
                            @{contact.username}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>

                  {/* View Profile Button */}
                  {onViewProfile && (
                    <button
                      onClick={() => onViewProfile(contact.id)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-accent text-white text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      View Profile
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Phone}
            title={searchQuery ? "No contacts found" : "No contacts yet"}
            description={searchQuery ? "Try a different search term" : "Use 'Find by Phone Number' to add contacts and start chatting"}
          />
        )}
      </div>

      {/* Create button */}
      {selectedUsers.length > 0 && (
        <div className="p-4 border-t border-border bg-surface">
          <Button
            onClick={handleCreateChat}
            disabled={creating}
            className="w-full"
            size="lg"
          >
            {creating ? 'Creating...' : isGroup ? 'Create Group' : 'Start Chat'}
          </Button>
        </div>
      )}

      {/* Find by Phone Dialog */}
      <FindByPhoneDialog
        open={showPhoneDialog}
        onOpenChange={setShowPhoneDialog}
        onUserFound={handleUserFound}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
