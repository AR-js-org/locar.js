import * as THREE from "three";
import EventEmitter from "./event-emitter.js";

/** Class to setup the webcam. */
class Webcam extends EventEmitter {
  #video;

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
    videoElementSelector = null,
    findMaxWidthDevice = false
  ) {
    super();
    this.sceneWebcam = new THREE.Scene();
    if (!videoElementSelector) {
      this.#video = document.createElement("video");
      this.#video.setAttribute("autoplay", true);
      this.#video.setAttribute("playsinline", true);
      this.#video.style.display = "none";
      document.body.appendChild(this.#video);
    } else {
      this.#video = document.querySelector(videoElementSelector);
    }
    this.texture = new THREE.VideoTexture(this.#video);
    this.#initCamera(constraints, findMaxWidthDevice);
  }

  async #initCamera(constraints, findMaxWidthDevice) {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        let deviceId = null;
        if(findMaxWidthDevice) {  
          const foundDevices = await navigator.mediaDevices.enumerateDevices();
          const usefulDevices = foundDevices.filter(mediaDevice => mediaDevice.kind === 'videoinput');
          let maxWidth = 0; 
          usefulDevices.forEach(mediaDevice => {
            console.log("Media device info...");
            console.log(JSON.stringify(mediaDevice));
            console.log("Capabilities...");
            const cap = mediaDevice.getCapabilities();
            console.log(JSON.stringify(cap));
            if(cap.facingMode.indexOf("environment") >= 0 && cap.width.max > maxWidth) {
              console.log("***Best so far... selecting");
              maxWidth = cap.width.max;
              deviceId = mediaDevice.deviceId;
            }
          });
        }
        if(deviceId !== null) {
          console.log(`Found the max width device: ${deviceId}... requesting it`);
          constraints = { video: { deviceId: { exact: deviceId } } };
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.#video.addEventListener("loadedmetadata", () => {
          this.#video.setAttribute("width", this.#video.videoWidth);
          this.#video.setAttribute("height", this.#video.videoHeight);
          this.#video.play();
          /**
           * Webcam started event.
           * @event Webcam#webcamstarted
           * @param {Object} event object containing 'texture' - the texture the webcam will stream to.
           */
          this.emit("webcamstarted", { texture: this.texture });
        });
        this.#video.srcObject = stream;
      } catch(e)  {
        /**
         * Webcam error event.
         * @event Webcam#webcamerror
         * @param {Object} event object with 'code' and 'message' fields.
         */
        this.emit("webcamerror", {
          code: e.name,
          message: e.message,
        });
      }
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
    this.texture.dispose();
  }
}

export default Webcam;
