import * as THREE from "three";
import DeviceOrientationControls from "../three/device-orientation-controls";
import LocAR from "../three/locar";

/** Longitude and latitude. */
export interface LonLat {
  longitude: number;
  latitude: number;
}

/** Server logger interface. */
export interface ServerLogger {
  sendData(endpoint: string, data: any): Promise<Response> | Response;
}

/** Generic event. */
export interface Event {
  
}
/** Event emitted when the webcam starts. */
export interface WebcamStartedEvent {
  texture: THREE.VideoTexture;
}

/** Event emitted when the webcam encounters an error. */
export interface WebcamErrorEvent {
  code: string;
  message: string;
}

/** Event emitted when device orientation permission has been granted. */
export interface DeviceOrientationGrantedEvent {
  target: DeviceOrientationControls;
}

/** Event emitted when there is an error with device orientation. */
export interface DeviceOrientationErrorEvent {
  code: string;
  message: string;
}

/** Event emitted when a GPS position is received. */
export interface GpsReceivedEvent {
  position: GeolocationPosition;
  distMoved: number;
}