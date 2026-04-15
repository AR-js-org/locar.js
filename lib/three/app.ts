import * as THREE from 'three';
import {
    LocAR,
    Webcam,
    DeviceOrientationControls,
    DeviceOrientationGrantedEvent,
    DeviceOrientationErrorEvent,
    WebcamStartedEvent,
    WebcamErrorEvent,
} from './main';
import { GpsOptions } from './locar';
import EventEmitter from './event-emitter';
import type { DeviceOrientationControlsOptions } from './device-orientation-controls';

export interface AppOptions {
    camera: THREE.PerspectiveCamera;
    canvas?: HTMLCanvasElement;
    gpsOptions?: GpsOptions;
    videoConstraints?: { video: { facingMode: string } };
    deviceOrientationOptions?: DeviceOrientationControlsOptions & { enabled: boolean }; 
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
    constructor({camera, canvas, gpsOptions, videoConstraints, deviceOrientationOptions}: AppOptions) {
        super();

        this.camera = camera;

        if(canvas) {
            this.renderer = new THREE.WebGLRenderer({ canvas });
           
        } else {
            this.renderer = new THREE.WebGLRenderer();
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

        this.locar = new LocAR(this.scene, camera, gpsOptions);

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
     * Emits "ready" event as soon as we can start interacting with the app (when device orientation permissions have been granted, or immediately if device orientation turned off).
     */
    start() {
       
        this.webcam.on("webcamstarted", (ev: WebcamStartedEvent) => {
            this.scene.background = ev.texture;
        });

        /**
         * Webcam error event.
         * @event App#webcamerror
         * @param {WebcamErrorEvent} event object containing code and message properties.
         */
        this.webcam.on("webcamerror", (ev: WebcamErrorEvent) => {
            this.emit("webcamerror", ev);
        });

        if(this.deviceOrientationControls === null) {
             /**
              * Ready event.
              * @event App#ready
              * @param {ReadyEvent} event object containing LocAR object.
              */
             this.emit("ready", { locar: this.locar });
        } else {
            this.deviceOrientationControls?.on("deviceorientationgranted", (ev: DeviceOrientationGrantedEvent) => {
                ev.target.connect();
                /**
                 * Ready event.
                 * @event App#ready
                 * @param {ReadyEvent} event object containing LocAR object.
                 */
                this.emit("ready", { locar: this.locar });
            });

            this.deviceOrientationControls.on("deviceorientationerror", (ev: DeviceOrientationErrorEvent) => {
                this.emit("deviceorientationerror", ev);
            });

            this.deviceOrientationControls.init();
        }
    }
}

export default App;