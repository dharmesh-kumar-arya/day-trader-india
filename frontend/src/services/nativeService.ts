import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

export interface TradeAlertPayload {
  symbol: string;
  signal: 'BUY' | 'SELL';
  price: number;
  target?: number;
  stopLoss?: number;
  setup?: string;
  conviction?: number | string;
}

type TradeAlertCallback = (payload: { symbol: string; action?: string }) => void;
const alertListeners: TradeAlertCallback[] = [];

let isInitialized = false;
let isServiceRunning = false;

/**
 * Register a listener for when user taps a trade notification
 */
export function onTradeNotificationTapped(cb: TradeAlertCallback): () => void {
  alertListeners.push(cb);
  return () => {
    const idx = alertListeners.indexOf(cb);
    if (idx >= 0) alertListeners.splice(idx, 1);
  };
}

/**
 * Initialize native notification channels and tap handlers
 */
export async function initNativeFeatures(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[NativeService] Running in web browser; native notifications mock mode active.');
    return false;
  }

  if (isInitialized) return true;

  try {
    // 1. Request notification permissions
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') {
      console.warn('[NativeService] Notification permission not granted:', perm.display);
    }

    // 2. Create high-priority Trade Signals notification channel for Android
    await LocalNotifications.createChannel({
      id: 'trade_signals',
      name: 'Day Trader • Trade Signals',
      description: 'High-conviction intraday trade breakouts and execution alerts',
      importance: 5, // High / Heads-up banner
      visibility: 1, // Public
      vibration: true,
      lights: true,
      lightColor: '#10B981', // Emerald green
    });

    // 3. Register Action Types for actionable notifications (e.g. "Trade Now")
    try {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'TRADE_ALERT_ACTIONS',
            actions: [
              {
                id: 'trade_now',
                title: '⚡ Open Trade Desk',
                foreground: true,
              },
              {
                id: 'dismiss',
                title: 'Dismiss',
                destructive: false,
              },
            ],
          },
        ],
      });
    } catch (e) {
      console.warn('[NativeService] registerActionTypes note:', e);
    }

    // 4. Handle tap on notification or action button
    await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      console.log('[NativeService] Notification clicked:', event);
      const extra = event.notification.extra;
      const symbol = extra?.symbol || 'RELIANCE';
      const action = event.actionId === 'trade_now' ? 'trade' : (extra?.action || 'trade');

      alertListeners.forEach((cb) => cb({ symbol, action }));
    });

    isInitialized = true;
    console.log('[NativeService] Native notifications initialized successfully.');

    // 5. Automatically start background foreground service on Android
    await startBackgroundMonitoring();

    return true;
  } catch (err) {
    console.error('[NativeService] Failed to initialize native features:', err);
    return false;
  }
}

/**
 * Start Android Foreground Service to keep WebSocket & market scanner alive in background
 */
export async function startBackgroundMonitoring(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return false;
  }

  try {
    // Check permission
    const permStatus = await ForegroundService.checkPermissions();
    if (permStatus.display !== 'granted') {
      await ForegroundService.requestPermissions();
    }

    // Create channel for foreground service
    try {
      await ForegroundService.createNotificationChannel({
        id: 'daytrader_bg_service',
        name: 'Market Background Engine',
        description: 'Maintains live market ticker and signal monitoring in background',
        importance: 2, // Low interruption (silent icon in status bar)
      });
    } catch (_) {
      // Channel may already exist
    }

    await ForegroundService.startForegroundService({
      id: 1001,
      title: 'Day Trader • Live Monitor Active',
      body: 'Scanning Indian equities for ORB breakouts & high-conviction trades...',
      smallIcon: 'ic_launcher_foreground',
      notificationChannelId: 'daytrader_bg_service',
      silent: true,
    });

    isServiceRunning = true;
    console.log('[NativeService] Background foreground service started.');
    return true;
  } catch (err) {
    console.warn('[NativeService] Could not start foreground service:', err);
    return false;
  }
}

/**
 * Stop Android Foreground Service
 */
export async function stopBackgroundMonitoring(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
  try {
    await ForegroundService.stopForegroundService();
    isServiceRunning = false;
  } catch (err) {
    console.error('[NativeService] Error stopping foreground service:', err);
  }
}

/**
 * Send a rich heads-up trade alert notification
 */
export async function notifyTradeSignal(payload: TradeAlertPayload): Promise<void> {
  const { symbol, signal, price, target, stopLoss, setup, conviction } = payload;
  const isBuy = signal === 'BUY';
  const iconEmoji = isBuy ? '🟢' : '🔴';
  const targetText = target ? ` • Target: ₹${target.toLocaleString('en-IN')}` : '';
  const slText = stopLoss ? ` • SL: ₹${stopLoss.toLocaleString('en-IN')}` : '';
  const convictionText = conviction ? ` (${conviction}% Conviction)` : '';

  const title = `${iconEmoji} ${signal} SIGNAL: ${symbol} @ ₹${price.toLocaleString('en-IN')}`;
  const body = `${setup || 'Breakout Setup Detected'}${convictionText}${targetText}${slText}. Tap to review and execute!`;

  console.log(`[NativeService] Triggering Notification: ${title} | ${body}`);

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 100000),
            title,
            body,
            channelId: 'trade_signals',
            actionTypeId: 'TRADE_ALERT_ACTIONS',
            extra: {
              symbol,
              action: 'trade',
              price,
              signal,
            },
            schedule: { at: new Date(Date.now() + 100) }, // Fire immediately
            sound: 'default',
          },
        ],
      });
    } catch (err) {
      console.error('[NativeService] Failed to schedule local notification:', err);
    }
  } else {
    // Browser fallback: HTML5 Notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }
}

/**
 * Trigger an immediate test trade notification
 */
export async function testNativeTradeNotification(currentSymbol: string = 'RELIANCE', currentPrice: number = 1335.40): Promise<void> {
  await initNativeFeatures();
  await notifyTradeSignal({
    symbol: currentSymbol,
    signal: 'BUY',
    price: currentPrice,
    target: Math.round(currentPrice * 1.015 * 100) / 100,
    stopLoss: Math.round(currentPrice * 0.992 * 100) / 100,
    setup: '15m ORB Breakout Confirmed',
    conviction: 84,
  });
}

