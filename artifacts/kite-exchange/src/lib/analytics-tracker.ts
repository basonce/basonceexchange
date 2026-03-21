import { supabase } from './supabase';
import { geolocationService } from './geolocation-service';

interface AnalyticsEvent {
  event_type: string;
  page_path: string;
  element_id?: string;
  element_text?: string;
  event_data?: Record<string, any>;
  duration_seconds?: number;
}

interface DeviceInfo {
  browser: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  os: string;
}

class AnalyticsTracker {
  private sessionId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private currentPage: string = '';
  private pageStartTime: number = Date.now();
  private batchInterval: NodeJS.Timeout | null = null;
  private activityInterval: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();
  private isInitialized: boolean = false;

  private readonly BATCH_INTERVAL = 30000; // 30 seconds
  private readonly ACTIVITY_UPDATE_INTERVAL = 60000; // 1 minute
  private readonly MAX_QUEUE_SIZE = 50;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.createSession();
      this.startBatchProcessing();
      this.startActivityTracking();
      this.setupEventListeners();
      this.isInitialized = true;
    } catch (error) {
      console.error('Analytics initialization error:', error);
    }
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private async createSession(): Promise<void> {
    try {
      console.log('Analytics session created (logging disabled)');
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }

  private getDeviceInfo(): DeviceInfo {
    const ua = navigator.userAgent;

    const browser = (() => {
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'Unknown';
    })();

    const device_type: 'mobile' | 'tablet' | 'desktop' = (() => {
      if (/mobile/i.test(ua)) return 'mobile';
      if (/tablet|ipad/i.test(ua)) return 'tablet';
      return 'desktop';
    })();

    const os = (() => {
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Mac')) return 'macOS';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iOS')) return 'iOS';
      return 'Unknown';
    })();

    return { browser, device_type, os };
  }

  trackPageView(path: string): void {
    if (!this.isInitialized) {
      this.initialize().then(() => this.trackPageView(path));
      return;
    }

    if (this.currentPage && this.currentPage !== path) {
      const duration = Math.floor((Date.now() - this.pageStartTime) / 1000);
      this.addEvent({
        event_type: 'page_view',
        page_path: this.currentPage,
        duration_seconds: duration
      });
    }

    this.currentPage = path;
    this.pageStartTime = Date.now();
    this.lastActivityTime = Date.now();

    this.addEvent({
      event_type: 'page_view',
      page_path: path,
      duration_seconds: 0
    });
  }

  trackClick(elementId: string, elementText?: string, extraData?: Record<string, any>): void {
    if (!this.isInitialized) return;

    this.lastActivityTime = Date.now();
    this.addEvent({
      event_type: 'button_click',
      page_path: this.currentPage,
      element_id: elementId,
      element_text: elementText,
      event_data: extraData
    });
  }

  trackModalOpen(modalName: string): void {
    if (!this.isInitialized) return;

    this.lastActivityTime = Date.now();
    this.addEvent({
      event_type: 'modal_open',
      page_path: this.currentPage,
      element_id: modalName
    });
  }

  trackModalClose(modalName: string, duration?: number): void {
    if (!this.isInitialized) return;

    this.lastActivityTime = Date.now();
    this.addEvent({
      event_type: 'modal_close',
      page_path: this.currentPage,
      element_id: modalName,
      duration_seconds: duration
    });
  }

  trackFormSubmit(formName: string, data?: Record<string, any>): void {
    if (!this.isInitialized) return;

    this.lastActivityTime = Date.now();
    this.addEvent({
      event_type: 'form_submit',
      page_path: this.currentPage,
      element_id: formName,
      event_data: data
    });
  }

  private addEvent(event: AnalyticsEvent): void {
    this.eventQueue.push(event);

    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flushEvents();
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      console.log(`Analytics: ${eventsToSend.length} events tracked (logging disabled)`);
    } catch (error) {
      console.error('Failed to flush events:', error);
      this.eventQueue.unshift(...eventsToSend);
    }
  }

  private startBatchProcessing(): void {
    this.batchInterval = setInterval(() => {
      this.flushEvents();
    }, this.BATCH_INTERVAL);
  }

  private startActivityTracking(): void {
    this.activityInterval = setInterval(async () => {
      try {
        console.log('Activity tracked');
      } catch (error) {
        console.error('Failed to update activity:', error);
      }
    }, this.ACTIVITY_UPDATE_INTERVAL);
  }

  private setupEventListeners(): void {
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushEvents();
      }
    });
  }

  cleanup(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
    }

    if (this.currentPage) {
      const duration = Math.floor((Date.now() - this.pageStartTime) / 1000);
      this.addEvent({
        event_type: 'page_view',
        page_path: this.currentPage,
        duration_seconds: duration
      });
    }

    this.flushEvents();
  }

  updateUserRegistration(userId: string): void {
    console.log('User registration tracked:', userId);
    this.addEvent({
      event_type: 'user_registered',
      page_path: this.currentPage
    });
  }
}

export const analyticsTracker = new AnalyticsTracker();
