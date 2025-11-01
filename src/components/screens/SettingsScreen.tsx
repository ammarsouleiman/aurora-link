import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Lock, 
  Info, 
  Camera, 
  ChevronRight,
  Volume2,
  Eye,
  CheckCheck,
  Clock,
  Phone,
  Mail
} from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Avatar } from '../Avatar';
import { toast } from '../../utils/toast';
import { uploadApi, profileApi } from '../../utils/api';
import { requestNotificationPermission, getNotificationPermission } from '../../utils/notifications';
import type { User as UserType } from '../../utils/types';

interface SettingsScreenProps {
  currentUser: UserType;
  onBack: () => void;
  onUserUpdate: (user: UserType) => void;
}

export function SettingsScreen({ currentUser, onBack, onUserUpdate }: SettingsScreenProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission());
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [tempName, setTempName] = useState(currentUser.full_name);
  const [tempStatus, setTempStatus] = useState(currentUser.status_message || currentUser.status || 'Hey there! I am using AuroraLink.');
  const [uploading, setUploading] = useState(false);
  
  // Load preferences from localStorage
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [readReceipts, setReadReceipts] = useState(() => {
    const saved = localStorage.getItem('readReceipts');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [lastSeen, setLastSeen] = useState(() => {
    const saved = localStorage.getItem('lastSeen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [profilePhotoVisibility, setProfilePhotoVisibility] = useState(() => {
    const saved = localStorage.getItem('profilePhotoVisibility');
    return saved || 'Everyone';
  });

  useEffect(() => {
    const checkPermission = () => {
      setNotificationPermission(getNotificationPermission());
    };
    const interval = setInterval(checkPermission, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const result = await uploadApi.uploadFile(file, 'avatar');

    if (result.success && result.data?.url) {
      setAvatarUrl(result.data.url);
      const updateResult = await profileApi.update({ avatar_url: result.data.url });
      if (updateResult.success) {
        onUserUpdate({
          ...currentUser,
          avatar_url: result.data.url,
        });
        toast.success('Profile photo updated');
      } else {
        toast.error('فشل تحديث البروفايل بالصورة الجديدة.');
      }
    } else {
      toast.error(result.error || 'فشل رفع صورة البروفايل.');
    }

    setUploading(false);
  };

  const handleNameSave = async () => {
    if (tempName.trim() && tempName !== currentUser.full_name) {
      const result = await profileApi.update({ full_name: tempName });
      if (result.success) {
        onUserUpdate({
          ...currentUser,
          full_name: tempName,
        });
        toast.success('Name updated');
      }
    }
    setIsEditingName(false);
  };

  const handleStatusSave = async () => {
    const currentStatus = currentUser.status_message || currentUser.status || 'Hey there! I am using AuroraLink.';
    if (tempStatus !== currentStatus) {
      const result = await profileApi.update({ status_message: tempStatus });
      if (result.success) {
        onUserUpdate({
          ...currentUser,
          status: tempStatus,
          status_message: tempStatus,
          status_updated_at: new Date().toISOString(),
        });
        toast.success('About updated');
      }
    }
    setIsEditingStatus(false);
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem('soundEnabled', JSON.stringify(enabled));
  };

  const handleReadReceiptsToggle = (enabled: boolean) => {
    setReadReceipts(enabled);
    localStorage.setItem('readReceipts', JSON.stringify(enabled));
  };

  const handleLastSeenToggle = (enabled: boolean) => {
    setLastSeen(enabled);
    localStorage.setItem('lastSeen', JSON.stringify(enabled));
  };

  const handleProfilePhotoVisibilityChange = (value: string) => {
    setProfilePhotoVisibility(value);
    localStorage.setItem('profilePhotoVisibility', value);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-primary px-4 py-4 flex items-center gap-4 shadow-sm">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack} 
          className="text-primary-foreground hover:bg-primary-foreground/10"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-primary-foreground text-xl">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="bg-surface px-6 py-8">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar
                src={avatarUrl}
                alt={currentUser.full_name}
                size="2xl"
                showBorder={true}
              />
              <label className="absolute bottom-0 right-0 p-3 bg-gradient-to-br from-accent to-primary text-white rounded-full cursor-pointer hover:shadow-xl transition-all shadow-lg hover:scale-110">
                <Camera className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1">
              {isEditingName ? (
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  className="w-full bg-transparent border-b-2 border-primary outline-none pb-1"
                  autoFocus
                />
              ) : (
                <h2 
                  className="cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setIsEditingName(true)}
                >
                  {currentUser.full_name}
                </h2>
              )}
              {isEditingStatus ? (
                <input
                  type="text"
                  value={tempStatus}
                  onChange={(e) => setTempStatus(e.target.value)}
                  onBlur={handleStatusSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleStatusSave()}
                  placeholder="Hey there! I am using AuroraLink."
                  className="w-full bg-transparent border-b border-muted-foreground outline-none text-sm text-muted-foreground mt-1"
                  autoFocus
                />
              ) : (
                <p 
                  className="text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors mt-1"
                  onClick={() => setIsEditingStatus(true)}
                >
                  {currentUser.status_message || currentUser.status || 'Hey there! I am using AuroraLink.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-6">
          <div className="px-6 py-2">
            <p className="text-sm text-primary">Account</p>
          </div>
          
          <div className="bg-surface">
            <div className="px-6 py-4 flex items-center gap-4 border-b border-border">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="mt-0.5">{currentUser.phone_number || 'Not set'}</p>
              </div>
            </div>
            
            <div className="px-6 py-4 flex items-center gap-4 border-b border-border">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="mt-0.5">{currentUser.email}</p>
              </div>
            </div>
            
            <div className="px-6 py-4 flex items-center gap-4">
              <User className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="mt-0.5">@{currentUser.username}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="mt-6">
          <div className="px-6 py-2">
            <p className="text-sm text-primary">Notifications</p>
          </div>
          
          <div className="bg-surface">
            <div className="px-6 py-4 flex items-center gap-4 border-b border-border">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p>Browser Notifications</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {notificationPermission === 'granted' 
                    ? 'Enabled' 
                    : notificationPermission === 'denied'
                    ? 'Blocked in browser settings'
                    : 'Not enabled'}
                </p>
              </div>
              {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
                <Button
                  size="sm"
                  onClick={async () => {
                    const granted = await requestNotificationPermission();
                    if (granted) {
                      toast.success('Notifications enabled');
                      setNotificationPermission('granted');
                    }
                  }}
                >
                  Enable
                </Button>
              )}
            </div>
            
            <div className="px-6 py-4 flex items-center gap-4">
              <Volume2 className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p>Sound</p>
                <p className="text-sm text-muted-foreground mt-0.5">Play sound for messages</p>
              </div>
              <Switch 
                checked={soundEnabled} 
                onCheckedChange={handleSoundToggle}
              />
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="mt-6">
          <div className="px-6 py-2">
            <p className="text-sm text-primary">Privacy</p>
          </div>
          
          <div className="bg-surface">
            <div className="px-6 py-4 flex items-center gap-4 border-b border-border">
              <CheckCheck className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p>Read Receipts</p>
                <p className="text-sm text-muted-foreground mt-0.5">Show when you've read messages</p>
              </div>
              <Switch
                checked={readReceipts}
                onCheckedChange={handleReadReceiptsToggle}
              />
            </div>
            
            <div className="px-6 py-4 flex items-center gap-4 border-b border-border">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p>Last Seen</p>
                <p className="text-sm text-muted-foreground mt-0.5">Show when you were last active</p>
              </div>
              <Switch 
                checked={lastSeen}
                onCheckedChange={handleLastSeenToggle}
              />
            </div>
            
            <button 
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[var(--hover-surface)] transition-colors"
              onClick={() => {
                const options = ['Everyone', 'My Contacts', 'Nobody'];
                const currentIndex = options.indexOf(profilePhotoVisibility);
                const nextValue = options[(currentIndex + 1) % options.length];
                handleProfilePhotoVisibilityChange(nextValue);
              }}
            >
              <Eye className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 text-left">
                <p>Profile Photo</p>
                <p className="text-sm text-muted-foreground mt-0.5">{profilePhotoVisibility}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* About */}
        <div className="mt-6 mb-6">
          <div className="px-6 py-2">
            <p className="text-sm text-primary">About</p>
          </div>
          
          <div className="bg-surface">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-4">
                <Info className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p>Version</p>
                  <p className="text-sm text-muted-foreground mt-0.5">AuroraLink v1.0.0</p>
                </div>
              </div>
            </div>
            
            <button className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[var(--hover-surface)] transition-colors border-b border-border">
              <div className="w-5" />
              <p className="flex-1 text-left">Terms of Service</p>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <button className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[var(--hover-surface)] transition-colors">
              <div className="w-5" />
              <p className="flex-1 text-left">Privacy Policy</p>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 text-center text-sm text-muted-foreground">
          © 2024 AuroraLink. All rights reserved.
        </div>
      </div>
    </div>
  );
}
