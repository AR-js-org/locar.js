
import DeviceOrientationControls from "../three/device-orientation-controls";
import * as THREE from 'three';


/** Longitude and latitude. */
export interface LonLat {
  longitude: number;
  latitude: number;
}

/** Projection interface, you can create your own custom projection by implementing project() and unproject(). */
export interface Projection {
  project: (lon: number, lat: number) => [number, number];
  unproject: (projected: [number, number]) => [number, number];
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
  videoWidth: number;
  videoHeight: number;
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
  /** The new GPS position */
  position: GeolocationPosition;
  /** distance moved in metres since last GpsReceivedEvent */
  distMoved: number;
}

/** GPS intialisation options. */
export interface GpsOptions {
  gpsMinDistance?: number;
  gpsMinAccuracy?: number;
}

/** Options to pass into DeviceOrientationControls. */
export type DeviceOrientationControlsOptions = {
  /** smoothingFactor - default 0.2. If too high, AR content movement will lag behind the sensors. If too low, the scene will be jittery. */
  smoothingFactor?: number;
  /** Movement threshold to detect an orientation change (radians). */
  orientationChangeThreshold?: number;
  /** On iOS, enable permission dialog to seek permission to use device orientation through a user gesture. Recommended to set to true */
  enablePermissionDialog?: boolean;
  /** Set iOS-look and feel styling for the permission dialog for device orientation */
  enableStyling?: boolean;
  /** Use a standard confirm dialog rather than a custom element to grant device orientation permissions */
  preferConfirmDialog?: boolean;
};

/** Interface representing existing three.js objects if you want to pass them in from elsewhere (e.g. react-three-fiber) */
export interface ThreeObjects {
  /** the three.js camera */
  camera: THREE.PerspectiveCamera;
  /** the three.js renderer */
  renderer: THREE.WebGLRenderer;
  /** the three.js scene */
  scene: THREE.Scene;
}

/** Basic options to pass into the App object, excluding options specific to configuring three.js. 
 * If you already have three.js camera, scene and renderer objects set up (e.g. via react-three-fiber), you can just pass 
 * in BasicAppOptions to App.
 */

export interface BasicAppOptions {
  /** GPS options, see GpsOptions documentation for details */
  gpsOptions?: GpsOptions;
  /** Video constraints for Media Devices API */
  videoConstraints?: { video: { facingMode: string } };
  /** Device orientation options for DeviceOrientationControls */
  deviceOrientationOptions?: DeviceOrientationControlsOptions & { enabled: boolean };
  /** Projection to use (default: SphMercProjection) */
  projection?: Projection;
  /** Server logger to use - ensure you gain consent from the user if you are doing this, it's usually a Data Protection legal requirement */
  serverLogger?: ServerLogger;
  /** Existing three.js objects, set up elsewhere - e.g. react-three-fiber */
  threeObjects?: ThreeObjects;
  
}

/** Full options including three.js configuration options. */
export interface AppOptions extends BasicAppOptions {
  /** the three.js camera options to use - note however we specify horizontal, not vertical, field of view */
  cameraOptions?: { hFov: number, near: number, far: number };
  /** the canvas to render the AR scene into (one will be created if omitted) */
  canvas?: HTMLCanvasElement;
}