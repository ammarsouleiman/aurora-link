import { useState } from 'react';
import { Search, UserPlus, Loader2, Phone } from 'lucide-react';
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
import { getAccessToken } from '../utils/supabase/client';
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
      <DialogContent className="w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] xs:w-[calc(100%-3rem)] xs:max-w-[calc(100%-3rem)] sm:w-full sm:max-w-md p-3 xs:p-4 sm:p-6 gap-3 sm:gap-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 sm:space-y-2 pr-6">
          <DialogTitle className="flex items-center gap-2 text-sm xs:text-base sm:text-lg">
            <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span className="truncate">Find User by Phone</span>
          </DialogTitle>
          <DialogDescription className="text-[11px] xs:text-xs sm:text-sm leading-relaxed">
            Enter a phone number to find and connect with AuroraLink users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 xs:space-y-4 sm:space-y-5 py-1 xs:py-2 sm:py-3">
          {!foundUser ? (
            <>
              <div>
                <label className="block mb-2 sm:mb-3 text-xs sm:text-sm font-medium px-0.5">
                  Phone Number
                </label>
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

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !phone}
                  className="flex-1 h-11 sm:h-10 touch-manipulation text-sm sm:text-base"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-1.5 sm:mr-2 h-4 w-4 animate-spin flex-shrink-0" />
                      <span className="truncate">Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="mr-1.5 sm:mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Search</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* User Found Card */}
              <div className="rounded-lg border border-success/50 bg-success/10 p-2.5 xs:p-3 sm:p-4 hover:bg-success/15 transition-colors touch-manipulation">
                <div className="flex items-center gap-2.5 xs:gap-3 sm:gap-4">
                  <div className="flex-shrink-0">
                    <Avatar
                      src={foundUser.avatar_url}
                      alt={foundUser.full_name}
                      size="lg"
                      status={foundUser.is_online ? 'online' : 'offline'}
                      showBorder={true}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate text-sm sm:text-base">{foundUser.full_name}</h3>
                    <p className="text-[11px] xs:text-xs sm:text-sm text-muted-foreground truncate">
                      @{foundUser.username}
                    </p>
                    {foundUser.status_message && (
                      <p className="text-[10px] xs:text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">
                        {foundUser.status_message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col xs:flex-row gap-2">
                <Button
                  onClick={handleAddUser}
                  className="flex-1 h-11 sm:h-10 touch-manipulation order-1 text-sm sm:text-base"
                >
                  <UserPlus className="mr-1.5 sm:mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Start Chat</span>
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="h-11 sm:h-10 touch-manipulation order-2 xs:w-auto text-sm sm:text-base"
                >
                  <span className="truncate">Search Again</span>
                </Button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="rounded-lg border border-border bg-muted/30 p-2 xs:p-2.5 sm:p-3">
            <p className="text-[10px] xs:text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              💡 Search for users by their registered phone number
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
