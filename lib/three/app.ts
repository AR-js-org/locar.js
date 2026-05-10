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
import { GpsOptions } from './locar';
import EventEmitter from './event-emitter';
import type { DeviceOrientationControlsOptions } from './device-orientation-controls';

export interface AppOptions {
    //camera: THREE.PerspectiveCamera; 
    cameraOptions?: { hFov: number, near: number, far: number }; /** the three.js camera options to use - note however we specify horizontal, not vertical, field of view */
    canvas?: HTMLCanvasElement; /** the canvas to render the AR scene into (one will be created if omitted) */
    gpsOptions?: GpsOptions; /** GPS options */
    videoConstraints?: { video: { facingMode: string } }; /** Video constraints for Media Devices API */
    deviceOrientationOptions?: DeviceOrientationControlsOptions & { enabled: boolean }; /** Device orientation options for DeviceOrientationControls */
    projection?: Projection; /** Projection to use (default: SphMercProjection) */
    serverLogger?: ServerLogger; /** Server logger to use - ensure you gain consent from the user if you are doing this, it's usually a Data Protection legal requirement */
}

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

    //Port : window 392 677; 480 640
    //Land: window 785 284; 640 480
    /**
      * Create an App object.
      * @param {AppOptions} - Startup options. Must contain "camera", a THREE.PerspectiveCamera.
      */
    constructor({ cameraOptions, canvas, gpsOptions, videoConstraints, deviceOrientationOptions, serverLogger, projection }: AppOptions) {
        super();
        this.origHfov = cameraOptions?.hFov || 80;

        const opacity = 0;

        console.log("*** pre44")
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
                /**
                 * Ready event.
                 * @event App#ready
                 * @param {ReadyEvent} event object containing LocAR object.
                 */
            
                resolve(this.locar);
            } else {
                this.deviceOrientationControls?.on("deviceorientationgranted", (ev: DeviceOrientationGrantedEvent) => {
                    ev.target.connect();
                    /**
                     * Ready event.
                     * @event App#ready
                     * @param {ReadyEvent} event object containing LocAR object.
                     */
                   
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
          this.camera.updateProjectionMatrix();
        } else {
          this.camera.fov = this.origHfov / aspectScreen;
        }
    }
}

export default App;