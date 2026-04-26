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
    camera: THREE.PerspectiveCamera; /** the three.js camera to use */
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

    /**
      * Create an App object.
      * @param {AppOptions} - Startup options. Must contain "camera", a THREE.PerspectiveCamera.
      */
    constructor({ camera, canvas, gpsOptions, videoConstraints, deviceOrientationOptions, serverLogger, projection }: AppOptions) {
        super();

            
        const opacity = 0;

        console.log("*** pre30")
        this.camera = camera;

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

        window.addEventListener("resize", e => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        });

        this.locar = new LocAR(this.scene, camera, gpsOptions, serverLogger, projection);

        this.webcam = new Webcam(videoConstraints);


        this.deviceOrientationControls = orientationOptions.enabled === true ? new DeviceOrientationControls(camera, orientationOptions) : null;


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
             //   this.scene.background = ev.texture;
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
}

export default App;