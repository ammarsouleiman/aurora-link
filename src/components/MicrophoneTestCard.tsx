import { useState } from 'react';
import { Mic, CheckCircle, XCircle, AlertCircle } from './ui/icons';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from '../utils/toast';

export function MicrophoneTestCard() {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const testMicrophone = async () => {
    setTesting(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone access');
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Success!
      setStatus('success');
      toast.success('Microphone working!', {
        description: 'Your microphone is properly configured',
      });
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      setStatus('error');
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setErrorMessage('Microphone access denied. Please allow access in your browser settings.');
        } else if (error.name === 'NotFoundError') {
          setErrorMessage('No microphone found. Please connect a microphone.');
        } else if (error.name === 'NotReadableError') {
          setErrorMessage('Microphone is already in use by another application.');
        } else {
          setErrorMessage(error.message || 'Failed to access microphone');
        }
      } else {
        setErrorMessage('Failed to access microphone');
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Microphone Test
        </CardTitle>
        <CardDescription>
          Test your microphone to ensure voice messages work properly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={testMicrophone}
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Testing...' : 'Test Microphone'}
        </Button>

        {status === 'success' && (
          <Alert className="border-success bg-success/10">
            <CheckCircle className="w-4 h-4 text-success" />
            <AlertDescription className="text-success">
              Your microphone is working correctly!
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert className="border-destructive bg-destructive/10">
            <XCircle className="w-4 h-4 text-destructive" />
            <AlertDescription className="text-destructive">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Troubleshooting Tips:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Check if your microphone is connected and turned on</li>
            <li>Close other apps that might be using your microphone</li>
            <li>Check browser permissions: Settings → Privacy & Security → Microphone</li>
            <li>Try restarting your browser</li>
            <li>Make sure you're using HTTPS or localhost</li>
          </ul>
        </div>

        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <strong>Browser Permissions:</strong> Click the lock icon in your browser's address bar 
            to manage microphone permissions for this site.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
