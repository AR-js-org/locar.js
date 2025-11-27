import LocationBased from "./location-based";
import SphMercProjection from "./sphmerc-projection";
import DeviceOrientationControls from "./device-orientation-controls";
import ClickHandler from "./click-handler";
import EventEmitter from "./event-emitter";
import Webcam from "./webcam";

export type { WebcamStartedEvent, WebcamErrorEvent } from "../types/Webcam";

const version = "0.1.7";
export {
  LocationBased,
  Webcam,
  SphMercProjection,
  DeviceOrientationControls,
  ClickHandler,
  EventEmitter,
  version,
};
