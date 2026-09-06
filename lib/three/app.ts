import * as THREE from 'three';
import {
    LocAR,
    Webcam,
    DeviceOrientationControls,
    DeviceOrientationGrantedEvent,
    DeviceOrientationErrorEvent,
    WebcamStartedEvent,
    WebcamErrorEvent,
    ClickHandler
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
    cameraFeedDimensions: { landWidth: number, landHeight: number } | null; /** camera feed dimensions in LANDSCAPE  */
    origHfov: number;
    #clickHandler: ClickHandler | null;

    /**
     * Create an App object.
     * @param {AppOptions} - Startup options.
     * Note that you can only specify ONE of cameraOptions and threeObjects, as cameraOptions is intended to configure a new three.js camera,
     * while threeObjects allows you to specify an existing camera, renderer and scene.
     */
    constructor({ cameraOptions, canvas, gpsOptions, videoConstraints, deviceOrientationOptions, serverLogger, projection, threeObjects }: AppOptions) {
        if (threeObjects && cameraOptions) {
            throw new Error("LocAR.App: ERROR: can only specify one of cameraOptions and threeObjects");
        }
        super();
        const aspect = window.innerWidth / window.innerHeight;
        this.origHfov = threeObjects?.camera ? threeObjects.camera.fov * aspect : cameraOptions?.hFov || 80;

        const opacity = 0;
        this.cameraFeedDimensions = null;

        
        this.camera = threeObjects?.camera || new THREE.PerspectiveCamera(this.origHfov / aspect, aspect, cameraOptions?.near || 0.001, cameraOptions?.far || 1000);

        this.scene = threeObjects?.scene || new THREE.Scene();

        // To allow us to use LocAR.App from environments such as react-three-fiber which provide three.js objects for us, 
        // we only perform three.js setup if a "threeObjects" option was NOT specified.
        if (!threeObjects) {
            if (canvas) {
                this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
                this.renderer.setClearColor(0x00ff00, opacity);

            } else {
                this.renderer = new THREE.WebGLRenderer({ alpha: true });
                this.renderer.setClearColor(0x00ff00, opacity);
                // Ensure canvas is stacked on top of other elements so it can receive click events
                this.renderer.domElement.style.position = 'relative';
                this.renderer.domElement.style.zIndex = '999';

                document.body.appendChild(this.renderer.domElement);
            }

            this.renderer.setSize(window.innerWidth, window.innerHeight);

            this.renderer.setAnimationLoop(() => {
                this.deviceOrientationControls?.update();
                this.renderer.render(this.scene, this.camera);

                const objects = this.#clickHandler?.raycast(this.camera, this.scene) ?? [];

                if (objects.length > 0) {
                    /**
                     * Objects intersected event (from click handler/raycaster)
                     * @event LocAR#objectsIntersected
                     * @param {object} event object containing 'intersections' - THREE.Intersection[] array containing all intersections
                     */
                    this.emit("objectsIntersected", { intersections: objects });
                }

            });

            window.addEventListener("resize", () => {
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.syncFovWithWebcam(this.camera.aspect);
            });

        } else {
            this.renderer = threeObjects.renderer;
        }



        const orientationOptions = deviceOrientationOptions || { enabled: true };

        this.locar = new LocAR(this.scene, this.camera, gpsOptions, serverLogger, projection);

        this.webcam = new Webcam(videoConstraints);

        this.deviceOrientationControls = orientationOptions.enabled === true ? new DeviceOrientationControls(this.camera, orientationOptions) : null;

        this.#clickHandler = null;
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

                this.matchFovToWebcam(ev.videoWidth, ev.videoHeight, window.innerWidth / window.innerHeight);
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

    /**
     * Sync the Three.js fov with the webcam.
     * It may be necessary to adjust the Three fov to match the proportion of the world currently visible through the webcam,
     * which will vary depending on orientation (portrait or landscape)
     * For example, if the device is in portrait, less of the world horizontally will be visible.
     * Mostly intended to be called internally: if you are developing a pure LocAR app you will not need to call this.
     * However it will be necessary to call this on each frame if another library/framework (typically R3F) has provided the 
     * three.js objects (i.e the threeObjects option has been provided to the constructor). 
     * 
     */
    syncFovWithWebcam(aspectScreen?: number) {
        if(aspectScreen === undefined) aspectScreen = window.innerWidth / window.innerHeight;
    
        if (this.cameraFeedDimensions !== null) {
            const videoWidth = aspectScreen > 1 ? this.cameraFeedDimensions.landWidth : this.cameraFeedDimensions.landHeight;
            const videoHeight = aspectScreen > 1 ? this.cameraFeedDimensions.landHeight : this.cameraFeedDimensions.landWidth;
            this.matchFovToWebcam(videoWidth, videoHeight, aspectScreen);
        }
        this.camera.updateProjectionMatrix();
    }

    /**
     * Set the correct three.js camera field of view based on the proportion of the webcam feed currently visible.
     * 
     * @param {number} videoWidth - the current video feed width
     * @param {number} videoHeight  - the current video feed height
     * @param {number} aspectScreen  - the current screen aspect ratio
     */
    matchFovToWebcam(videoWidth: number, videoHeight: number, aspectScreen: number) {
        const aspectVideo = videoWidth / videoHeight;

        // If the screen aspect ratio is less than the camera feed aspect ratio, only part of the webcam feed horizontally
        // will be visible, so the hfov of the visible world will be less than the hfov of the Three camera. So the
        // hfov of the rendered content needs to be adjusted to match.
        if (aspectScreen < aspectVideo) {
            // In this case the webcam video will be scaled to touch the bottom of the screen vertically.
            // So it's scaled by a factor of screenHeight/videoHeight
            // To get the webcam video width after scaling (including the off-screen part), we multiply the original width by this factor.
            const scaledVideoWidth = videoWidth * (window.innerHeight / videoHeight);

            // the fov thus needs to be adjusted by the window width divided by this scaled camera width
            const curHfov = this.origHfov * (window.innerWidth / scaledVideoWidth);

            // Three camera uses vertical, not horizontal, fov
            this.camera.fov = curHfov / aspectScreen;
        } else {
            this.camera.fov = this.origHfov / aspectScreen;
        }
    }

    /**
    * Add an event handler.
    * Overridden from EventEmitter to create a ClickHandler for objectsIntersected event.
    * @param {string} eventName - the event to handle.
    * @param {Function} eventHandler - the event handler function.
    */
    on(eventName: string, eventHandler: (...args: any[]) => void) {
        if (eventName == "objectsIntersected" && this.#clickHandler === null) {
            this.#clickHandler = new ClickHandler(this.renderer);
        }
        super.on(eventName, eventHandler);
    }
}

export default App;