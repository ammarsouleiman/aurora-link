import { useState } from 'react';
import { Search, UserPlus, Loader2, Phone } from './ui/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { PhoneInput } from './PhoneInput';
import { Avatar } from './Avatar';
import { toast } from '../utils/toast';
import { formatToE164, COUNTRY_CODES } from '../utils/phone';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getAccessToken } from '../utils/supabase/direct-api-client';
import type { User } from '../utils/types';

interface FindByPhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserFound: (user: User) => void;
  currentUserId: string;
}

export function FindByPhoneDialog({
  open,
  onOpenChange,
  onUserFound,
  currentUserId,
}: FindByPhoneDialogProps) {
  const [phone, setPhone] = useState('');
  const [dialCode, setDialCode] = useState(COUNTRY_CODES[0].dialCode);
  const [phoneError, setPhoneError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null>(null);

  const handleSearch = async () => {
    setPhoneError('');
    setFoundUser(null);

    if (!phone || phone.trim().length < 7) {
      setPhoneError('Please enter a valid phone number');
      return;
    }

    setIsSearching(true);

    try {
      const e164Phone = formatToE164(dialCode, phone);
      const accessToken = await getAccessToken();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-29f6739b/users/search-by-phone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken || publicAnonKey}`,
          },
          body: JSON.stringify({
            phone_number: e164Phone,
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to search user';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        if (response.status === 404 || errorMessage.includes('not found')) {
          setPhoneError('No user found with this phone number');
        } else {
          throw new Error(errorMessage);
        }
        return;
      }

      const data = await response.json();
      
      // Check if user was found
      if (!data.found || !data.user) {
        setPhoneError('No user found with this phone number');
        return;
      }

      if (data.user.id === currentUserId) {
        setPhoneError('You cannot add yourself');
        return;
      }

      setFoundUser(data.user);
      toast.success('User found!', {
        description: `Found ${data.user.full_name}`,
      });
    } catch (error) {
      console.error('Phone search error:', error);
      setPhoneError(error instanceof Error ? error.message : 'Failed to search user');
      toast.error('Search failed', {
        description: 'Please check the phone number and try again',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUser = () => {
    if (foundUser) {
      onUserFound(foundUser);
      onOpenChange(false);
      setPhone('');
      setFoundUser(null);
    }
  };

  const handleReset = () => {
    setPhone('');
    setPhoneError('');
    setFoundUser(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Find User by Phone
          </DialogTitle>
          <DialogDescription>
            Enter a phone number to find and connect with AuroraLink users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!foundUser ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <PhoneInput
                  value={phone}
                  dialCode={dialCode}
                  onChange={(newPhone, newDialCode) => {
                    setPhone(newPhone);
                    setDialCode(newDialCode);
                    setPhoneError('');
                  }}
                  error={phoneError}
                  disabled={isSearching}
                  autoFocus
                />
              </div>

              <Button
                onClick={handleSearch}
                disabled={isSearching || !phone}
                className="w-full"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              {/* User Found Card */}
              <div className="rounded-lg border-2 border-[#00A884]/30 bg-[#00A884]/5 p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={foundUser.avatar_url}
                    alt={foundUser.full_name}
                    size="lg"
                    status={foundUser.is_online ? 'online' : 'offline'}
                    showBorder={true}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{foundUser.full_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      @{foundUser.username}
                    </p>
                    {foundUser.status_message && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {foundUser.status_message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleAddUser} className="flex-1">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Start Chat
                </Button>
                <Button onClick={handleReset} variant="outline">
                  Search Again
                </Button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              💡 Search for users by their registered phone number
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
