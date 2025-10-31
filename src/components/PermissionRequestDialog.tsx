import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Camera, Mic, Video } from 'lucide-react';

interface PermissionRequestDialogProps {
  open: boolean;
  callType: 'voice' | 'video';
  onGrantPermissions: () => void;
  onCancel: () => void;
}

export function PermissionRequestDialog({
  open,
  callType,
  onGrantPermissions,
  onCancel,
}: PermissionRequestDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {callType === 'video' ? (
              <Video className="w-5 h-5 text-primary" />
            ) : (
              <Mic className="w-5 h-5 text-primary" />
            )}
            Permission Required
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              To make {callType === 'video' ? 'video' : 'voice'} calls, AuroraLink needs access to your:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                <span>Microphone</span>
              </li>
              {callType === 'video' && (
                <li className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  <span>Camera</span>
                </li>
              )}
            </ul>
            <p className="text-sm">
              Your browser will ask you to grant these permissions. Please click "Allow" when prompted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onGrantPermissions}>
            Grant Permissions
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
