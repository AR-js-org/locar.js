import * as THREE from "three";

export interface WebcamStartedEvent {
  texture: THREE.VideoTexture;
}
export interface WebcamErrorEvent {
  code: string;
  message: string;
}
