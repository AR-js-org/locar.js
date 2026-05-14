import * as THREE from 'three';
import {
    LocAR,
    Webcam,
    DeviceOrientationControls,
    DeviceOrientationGrantedEvent,
    DeviceOrientationErrorEvent,
    WebcamStartedEvent,
    WebcamErrorEvent,
    Projection,
    ServerLogger
} from './main';
import EventEmitter from './event-emitter';
import type { AppOptions } from '../types/locar';



/** Application class to orchestrate the interaction between the individual LocAR classes and the Three.js camera, renderer and scene. */
class App extends EventEmitter {
    locar: LocAR;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    webcam: Webcam;
    deviceOrientationControls: DeviceOrientationControls | null;
    cameraFeedDimensions : { landWidth: number, landHeight: number } | null; /** camera feed dimensions in LANDSCAPE  */
    origHfov: number;

    /**
      * Create an App object.
      * @param {AppOptions} - Startup options.
      */
    constructor({ cameraOptions, canvas, gpsOptions, videoConstraints, deviceOrientationOptions, serverLogger, projection }: AppOptions) {
        super();
        this.origHfov = cameraOptions?.hFov || 80;

        const opacity = 0;
        this.cameraFeedDimensions = null;

        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(this.origHfov / aspect, aspect, cameraOptions?.near || 0.001, cameraOptions?.far || 1000);

        if (canvas) {
            this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
            this.renderer.setClearColor(0x00ff00, opacity);

        } else {
            this.renderer = new THREE.WebGLRenderer({ alpha: true });
            this.renderer.setClearColor(0x00ff00, opacity);
            document.body.appendChild(this.renderer.domElement);
        }

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.scene = new THREE.Scene();

        const orientationOptions = deviceOrientationOptions || { enabled: true };

        window.addEventListener("resize", () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
          
            const aspectScreen  = window.innerWidth / window.innerHeight;
            this.camera.aspect = aspectScreen;
            if(this.cameraFeedDimensions !== null) {
              const videoWidth = aspectScreen > 1 ? this.cameraFeedDimensions.landWidth : this.cameraFeedDimensions.landHeight;
              const videoHeight = aspectScreen > 1 ? this.cameraFeedDimensions.landHeight : this.cameraFeedDimensions.landWidth;
              this.#setActualFov(videoWidth, videoHeight, aspectScreen);
            }
            this.camera.updateProjectionMatrix();
        });

        this.locar = new LocAR(this.scene, this.camera, gpsOptions, serverLogger, projection);

        this.webcam = new Webcam(videoConstraints);

        this.deviceOrientationControls = orientationOptions.enabled === true ? new DeviceOrientationControls(this.camera, orientationOptions) : null;


        this.renderer.setAnimationLoop(() => {
            this.deviceOrientationControls?.update();
            this.renderer.render(this.scene, this.camera);
        });
    }

    /**
     * Start the app.
     * Must be called after construction.
     * @returns {Promise<LocAR>}
     * Promise resolving with LocAR object. Rejects with object containing code and message.
     */
    start(): Promise<LocAR> {

        const promise = new Promise<LocAR>((resolve, reject) => {
            this.webcam.on("webcamstarted", (ev: WebcamStartedEvent) => {
              // Store the camera feed dimensions in LANDSCAPE mode (even if original orientation was portrait)
              const isLand = ev.videoWidth > ev.videoHeight;
              this.cameraFeedDimensions = {
                landWidth: isLand ? ev.videoWidth : ev.videoHeight,
                landHeight: isLand ? ev.videoHeight : ev.videoWidth
              };
              
              this.#setActualFov(ev.videoWidth, ev.videoHeight, window.innerWidth / window.innerHeight);
              this.camera.updateProjectionMatrix();
            });

            /**
             * Webcam error event.
             * @event App#webcamerror
             * @param {WebcamErrorEvent} event object containing code and message properties.
             */
            this.webcam.on("webcamerror", (ev: WebcamErrorEvent) => {
                reject({ code: ev.code, message: ev.message });
            });

            if (this.deviceOrientationControls === null) {
                resolve(this.locar);
            } else {
                this.deviceOrientationControls?.on("deviceorientationgranted", (ev: DeviceOrientationGrantedEvent) => {
                    ev.target.connect();
                    resolve(this.locar);
                });

                this.deviceOrientationControls.on("deviceorientationerror", (ev: DeviceOrientationErrorEvent) => {
                    reject({ code: ev.code, message: ev.message });
                });

                this.deviceOrientationControls.init();
            }

        });
        return promise;
    }

    #setActualFov(videoWidth: number, videoHeight: number, aspectScreen: number)  {
        const aspectVideo = videoWidth / videoHeight;

        // If the screen aspect ratio is less than the camera feed aspect ratio, only part of the camera feed horizontally
        // will be visible, so the hfov of the visible world will be less than the hfov of the camera. So the
        // hfov of the rendered content needs to be adjusted to match.
        if(aspectScreen < aspectVideo) {
          // In this case the video will be scaled to touch the bottom of the screen vertically.
          // So it's scaled by a factor of screenHeight/videoHeight
          // To get the video width after scaling (including the off-screen part), we multiply the original width by this factor.
          const scaledVideoWidth = videoWidth * (window.innerHeight / videoHeight);

          // the fov thus needs to be adjusted by the window width divided by this scaled camera width
          const curHfov = this.origHfov * (window.innerWidth / scaledVideoWidth);

          // Three camera uses vertical, not horizontal, fov
          this.camera.fov = curHfov / aspectScreen;
        } else {
          this.camera.fov = this.origHfov / aspectScreen;
        }
    }
}

export default App;