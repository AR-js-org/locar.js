import * as THREE from "three";
import EventEmitter from "./event-emitter";

export type { WebcamStartedEvent, WebcamErrorEvent } from "../types/Webcam";

/** Class to setup the webcam. */
class Webcam extends EventEmitter {
  #video: HTMLVideoElement | null;
  sceneWebcam: THREE.Scene;
  texture: THREE.VideoTexture | null;

  /**
   * Create a Webcam.
   * @param constraints {Object} - options to use for initialising the camera.
   * This is the same constraints object as used by standard MediaDevices API.
   * @param {string} videoElementSelector - selector to obtain the HTML video
   * element to render the webcam feed. If a falsy value (e.g. null or
   * undefined), a video element will be created.
   */

  constructor(
    constraints = { video: { facingMode: "environment" } },
    videoElementSelector?: string,
  ) {
    super();
    this.sceneWebcam = new THREE.Scene();
    if (!videoElementSelector) {
      this.#video = document.createElement("video");
      this.#video.setAttribute("autoplay", "true");
      this.#video.setAttribute("playsinline", "true");
      this.#video.style.display = "none";
      document.body.appendChild(this.#video);
    } else {
      this.#video = document.querySelector(videoElementSelector);
    }
    this.texture = this.#video ? new THREE.VideoTexture(this.#video) : null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          this.#video?.addEventListener("loadedmetadata", () => {
            this.#video?.setAttribute(
              "width",
              this.#video?.videoWidth.toString() ?? "0",
            );
            this.#video?.setAttribute(
              "height",
              this.#video?.videoHeight.toString() ?? "0",
            );
            this.#video?.play();
            /**
             * Webcam started event.
             * @event Webcam#webcamstarted
             * @param {Object} event object containing 'texture' - the texture the webcam will stream to.
             */
            this.emit("webcamstarted", { texture: this.texture });
          });
          if (this.#video) {
            this.#video.srcObject = stream;
          }
        })
        .catch((e) => {
          /**
           * Webcam error event.
           * @event Webcam#webcamerror
           * @param {Object} event object with 'code' and 'message' fields.
           */
          this.emit("webcamerror", {
            code: e.name,
            message: e.message,
          });
        });
    } else {
      this.emit("webcamerror", {
        code: "LOCAR_NO_MEDIA_DEVICES_API",
        message: "Media devices API not supported",
      });
    }
  }

  /**
   * Free up the memory associated with the webcam.
   * Should be called when your application closes.
   */
  dispose() {
    this.texture?.dispose();
  }
}

export default Webcam;
