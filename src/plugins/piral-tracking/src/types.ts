import type {} from 'piral-core';

declare module 'piral-core/lib/types/custom' {
  interface PiralCustomEventMap {
    'track-event': PiralTrackEventEvent;
    'track-error': PiralTrackErrorEvent;
    'track-frame-start': PiralTrackStartFrameEvent;
    'track-frame-end': PiralTrackEndFrameEvent;
  }

  interface PiletCustomApi extends PiletTrackingApi {}
}

/**
 * The severity level of the tracking information.
 */
export enum SeverityLevel {
  /**
   * Verbose severity level.
   */
  verbose = 0,
  /**
   * Information severity level.
   */
  information = 1,
  /**
   * Warning severity level.
   */
  warning = 2,
  /**
   * Error severity level.
   */
  error = 3,
  /**
   * Critical severity level.
   */
  critical = 4,
}

export interface Tracker {
  /**
   * Finishes the created frame by optionally passing the given properties and measurements.
   */
  (properties?: any, measurements?: any): void;
}

export interface PiralTrackEventEvent {
  /**
   * The name of the event.
   */
  name: string;
  /**
   * The name of the pilet emitting the event, if any.
   */
  pilet?: string;
  /**
   * The properties to collect.
   */
  properties: any;
  /**
   * The measurements to record.
   */
  measurements: any;
}

export interface PiralTrackErrorEvent {
  /**
   * The error to report.
   */
  error: any;
  /**
   * The name of the pilet emitting the event, if any.
   */
  pilet?: string;
  /**
   * The properties to collect.
   */
  properties: any;
  /**
   * The measurements to record.
   */
  measurements: any;
  /**
   * The severity level of the error to report.
   */
  severityLevel: SeverityLevel;
}

export interface PiralTrackStartFrameEvent {
  /**
   * The name of the event.
   */
  name: string;
  /**
   * The name of the pilet emitting the event, if any.
   */
  pilet?: string;
}

export interface PiralTrackEndFrameEvent {
  /**
   * The name of the event.
   */
  name: string;
  /**
   * The name of the pilet emitting the event, if any.
   */
  pilet?: string;
  /**
   * The properties to collect.
   */
  properties: any;
  /**
   * The measurements to record.
   */
  measurements: any;
}

/**
 * Defines the provided set of tracking and telemetry Pilet API extensions.
 */
export interface PiletTrackingApi {
  /**
   * Tracks a simple (singular) event at the current point in time.
   * @param name The name of the event to track.
   * @param properties The optional tracking properties to submit.
   * @param measurements The optional tracking measurements to submit.
   */
  trackEvent(name: string, properties?: any, measurements?: any): void;
  /**
   * Tracks an exception event at the current point in time.
   * @param exception The Error from a catch clause, or the string error message.
   * @param properties The optional tracking properties to submit.
   * @param measurements The optional tracking measurements to submit.
   * @param severityLevel The optional severity level of error.
   */
  trackError(error: Error | string, properties?: any, measurements?: any, severityLevel?: SeverityLevel): void;
  /**
   * Starts tracking an event frame at the current point in time.
   * @param name The name of the event to start tracking.
   * @returns The method to use for ending the current event frame.
   */
  trackFrame(name: string): Tracker;
}
