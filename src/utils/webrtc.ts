// WebRTC configuration and utilities

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'end-call';
  data: any;
  from: string;
  to: string;
  callId: string;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: RTCPeerConnectionState) => void) | null = null;
  private iceCandidateQueue: RTCIceCandidate[] = [];

  constructor() {}

  async checkPermissions(callType: 'voice' | 'video'): Promise<{ granted: boolean; error?: string }> {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          granted: false,
          error: 'Your browser does not support media devices. Please use a modern browser like Chrome, Firefox, or Safari.',
        };
      }

      // Try to query permissions (not all browsers support this)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (callType === 'video') {
            const camPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
            if (micPermission.state === 'denied' || camPermission.state === 'denied') {
              return {
                granted: false,
                error: 'Camera or microphone access was denied. Please update your browser permissions.',
              };
            }
          } else if (micPermission.state === 'denied') {
            return {
              granted: false,
              error: 'Microphone access was denied. Please update your browser permissions.',
            };
          }
        } catch (permError) {
          // Permission API not supported, continue anyway
          console.log('[WebRTC] Permission API not supported, will try getUserMedia directly');
        }
      }

      return { granted: true };
    } catch (error) {
      console.error('[WebRTC] Permission check error:', error);
      return { granted: true }; // Proceed to getUserMedia anyway
    }
  }

  async initializeLocalStream(callType: 'voice' | 'video'): Promise<MediaStream> {
    try {
      console.log('[WebRTC] Requesting media devices...', callType);
      
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[WebRTC] Successfully got media stream');
      console.log('[WebRTC] Audio tracks:', this.localStream.getAudioTracks().length);
      if (callType === 'video') {
        console.log('[WebRTC] Video tracks:', this.localStream.getVideoTracks().length);
      }
      
      return this.localStream;
    } catch (error: any) {
      console.error('[WebRTC] Failed to get user media:', error);
      console.error('[WebRTC] Error name:', error.name);
      console.error('[WebRTC] Error message:', error.message);
      
      // Provide specific error messages based on error type
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Permission denied. Please allow access to your camera and microphone in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No camera or microphone found. Please connect a device and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Camera or microphone is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Camera settings are not supported by your device.');
      } else if (error.name === 'SecurityError') {
        throw new Error('Media access is not allowed on this page. Please use HTTPS.');
      } else if (error.name === 'AbortError') {
        throw new Error('Media access was aborted. Please try again.');
      } else {
        throw new Error(`Failed to access camera/microphone: ${error.message || 'Unknown error'}`);
      }
    }
  }

  createPeerConnection(onIceCandidate: (candidate: RTCIceCandidate) => void): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] New ICE candidate:', event.candidate);
        onIceCandidate(event.candidate);
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      }
      this.remoteStream.addTrack(event.track);
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[WebRTC] Connection state changed:', state);
      if (this.onConnectionStateChangeCallback && state) {
        this.onConnectionStateChangeCallback(state);
      }
    };

    // Handle ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', this.peerConnection?.iceConnectionState);
    };

    // Add local stream tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('[WebRTC] Adding local track:', track.kind);
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    return this.peerConnection;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);
    console.log('[WebRTC] Created and set local offer');
    
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log('[WebRTC] Created and set local answer');
    
    return answer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[WebRTC] Setting remote offer');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Process queued ICE candidates
    if (this.iceCandidateQueue.length > 0) {
      console.log('[WebRTC] Processing queued ICE candidates:', this.iceCandidateQueue.length);
      for (const candidate of this.iceCandidateQueue) {
        await this.peerConnection.addIceCandidate(candidate);
      }
      this.iceCandidateQueue = [];
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[WebRTC] Setting remote answer');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    
    // Process queued ICE candidates
    if (this.iceCandidateQueue.length > 0) {
      console.log('[WebRTC] Processing queued ICE candidates:', this.iceCandidateQueue.length);
      for (const candidate of this.iceCandidateQueue) {
        await this.peerConnection.addIceCandidate(candidate);
      }
      this.iceCandidateQueue = [];
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      if (this.peerConnection.remoteDescription) {
        console.log('[WebRTC] Adding ICE candidate');
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        console.log('[WebRTC] Queueing ICE candidate (no remote description yet)');
        this.iceCandidateQueue.push(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('[WebRTC] Failed to add ICE candidate:', error);
    }
  }

  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
    if (this.remoteStream) {
      callback(this.remoteStream);
    }
  }

  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  cleanup(): void {
    console.log('[WebRTC] Cleaning up...');
    
    // Stop all local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('[WebRTC] Stopped local track:', track.kind);
      });
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.onRemoteStreamCallback = null;
    this.onConnectionStateChangeCallback = null;
    this.iceCandidateQueue = [];
    
    console.log('[WebRTC] Cleanup complete');
  }
}
