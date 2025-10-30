// Notification utilities for AuroraLink

/**
 * Request permission for browser notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show a browser notification for a new message
 */
export function showMessageNotification(
  senderName: string,
  messageBody: string,
  senderAvatar?: string,
  onClick?: () => void
) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notification = new Notification(`${senderName}`, {
      body: messageBody,
      icon: senderAvatar || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'auroralink-message',
      renotify: true,
      requireInteraction: false,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

/**
 * Play a notification sound
 */
export function playNotificationSound() {
  try {
    // Create a simple notification beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure sound
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';

    // Volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    // Play
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

/**
 * Show notification for new message with sound
 */
export function notifyNewMessage(
  senderName: string,
  messageBody: string,
  senderAvatar?: string,
  playSound: boolean = true,
  onClick?: () => void
) {
  // Play sound
  if (playSound && !document.hidden) {
    playNotificationSound();
  }

  // Show browser notification if page is not focused
  if (document.hidden) {
    showMessageNotification(senderName, messageBody, senderAvatar, onClick);
  }
}

/**
 * Check if notifications are supported and enabled
 */
export function areNotificationsEnabled(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Get notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}
