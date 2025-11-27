import SphMercProjection from "./sphmerc-projection";
import EventEmitter from "./event-emitter";
import * as THREE from "three";
import type { LonLat } from "../types/LonLat";
import type { ServerLogger } from "../types/ServerLogger";

export interface GpsOptions {
  gpsMinDistance?: number;
  gpsMinAccuracy?: number;
}

/** The main class for the LocAR.js system.  */
class LocationBased extends EventEmitter {
  scene: THREE.Scene;
  camera: THREE.Camera;
  #proj: SphMercProjection;
  #lastCoords: LonLat | null;
  #gpsMinDistance: number;
  #gpsMinAccuracy: number;
  #watchPositionId: number | null;
  #initialPosition: [number, number] | null;
  #gpsCount: number;
  #session: number;
  #serverLogger: ServerLogger | null;

  /**
   * @param {THREE.Scene} scene - The Three.js scene to use.
   * @param {THREE.Camera} camera - The Three.js camera to use. Should usually
   * be a THREE.PerspectiveCamera.
   * @param {Object} options - Initialisation options for the GPS; see
   * setGpsOptions() below.
   * @param {Object} serverLogger - an object which can optionally log GPS position to a server for debugging. null by default, so no logging will be done. This object should implement a sendData() method to send data (2nd arg) to a given endpoint (1st arg). Please see source code for details. Ensure you comply with privacy laws (GDPR or equivalent) if implementing this.
   */
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: GpsOptions = {},
    serverLogger: ServerLogger | null = null,
  ) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.#proj = new SphMercProjection();
    this.#lastCoords = null;
    this.#gpsMinDistance = 0;
    this.#gpsMinAccuracy = 100;
    this.#watchPositionId = null;
    this.setGpsOptions(options);
    this.#initialPosition = null;
    this.#gpsCount = 0;
    this.#session = 0;
    this.#serverLogger = serverLogger;
  }

  /**
   * Set the projection to use.
   * @param {Object} any object which includes a project() method
   * taking longitude and latitude as arguments and returning an array
   * containing easting and northing.
   */
  setProjection(proj: SphMercProjection) {
    this.#proj = proj;
  }

  /**
   * Set the GPS options.
   * @param {Object} object containing gpsMinDistance and/or gpsMinAccuracy
   * properties. The former specifies the number of metres which the device
   * must move to process a new GPS reading, and the latter specifies the
   * minimum accuracy, in metres, for a GPS reading to be counted.
   */
  setGpsOptions(options: GpsOptions = {}) {
    if (options.gpsMinDistance !== undefined) {
      this.#gpsMinDistance = options.gpsMinDistance;
    }
    if (options.gpsMinAccuracy !== undefined) {
      this.#gpsMinAccuracy = options.gpsMinAccuracy;
    }
  }

  /**
   * Start the GPS on a real device
   * @return {boolean} code indicating whether the GPS was started successfully.
   * GPS errors can be handled by handling the gpserror event.
   */
  async startGps() {
    if (this.#serverLogger) {
      const response = await this.#serverLogger.sendData("/gps/start", {
        gpsMinDistance: this.#gpsMinDistance,
        gpsMinAccuracy: this.#gpsMinAccuracy,
      });
      const json = await response.json();
      this.#session = json.session;
    }
    if (this.#watchPositionId === null) {
      this.#watchPositionId = navigator.geolocation.watchPosition(
        (position) => {
          this.#gpsReceived(position);
        },
        (error) => {
          /**
           * GPS error event.
           * @event LocationBased#gpserror
           * @param {Object} error - the Geolocation API error object.
           */
          this.emit("gpserror", error);
        },
        {
          enableHighAccuracy: true,
        },
      );
      return true;
    }
    return false;
  }

  /**
   * Stop the GPS on a real device
   * @return {boolean} true if the GPS was stopped, false if it could not be
   * stopped (i.e. it was never started).
   */
  stopGps() {
    if (this.#watchPositionId !== null) {
      navigator.geolocation.clearWatch(this.#watchPositionId);
      this.#watchPositionId = null;
      return true;
    }
    return false;
  }

  /**
   * Send a fake GPS signal. Useful for testing on a desktop or laptop.
   * @param {number} lon - The longitude.
   * @param {number} lat - The latitude.
   * @param {number} elev - The elevation in metres. (optional, set to null
   * for no elevation).
   * @param {number} acc - The accuracy of the GPS reading in metres. May be
   * ignored if lower than the specified minimum accuracy.
   */
  fakeGps(
    lon: number,
    lat: number,
    elev: number | null = null,
    acc: number = 0,
  ) {
    if (elev !== null) {
      this.setElevation(elev);
    }

    this.#gpsReceived({
      coords: {
        longitude: lon,
        latitude: lat,
        accuracy: acc,
      },
    } as GeolocationPosition);
  }

  /**
   * Convert longitude and latitude to three.js/WebGL world coordinates.
   * Uses the specified projection, and negates the northing (in typical
   * projections, northings increase northwards, but in the WebGL coordinate
   * system, we face negative z if the camera is at the origin with default
   * rotation).
   * Must not be called until an initial position is determined.
   * @param {number} lon - The longitude.
   * @param {number} lat - The latitude.
   * @return {Array} a two member array containing the WebGL x and z coordinates
   */
  lonLatToWorldCoords(lon: number, lat: number) {
    const projectedPos = this.#proj.project(lon, lat);
    if (this.#initialPosition) {
      projectedPos[0] -= this.#initialPosition[0];
      projectedPos[1] -= this.#initialPosition[1];
    } else {
      throw "No initial position determined";
    }
    return [projectedPos[0], -projectedPos[1]];
  }

  /**
   * Add a new AR object at a given latitude, longitude and elevation.
   * @param {THREE.Mesh} object the object
   * @param {number} lon - the longitude.
   * @param {number} lat - the latitude.
   * @param {number} elev - the elevation in metres
   * (if not specified, 0 is assigned)
   * @param {Object} properties - properties describing the object (for example,
   * the contents of the GeoJSON properties field).
   */
  add(
    object: THREE.Object3D,
    lon: number,
    lat: number,
    elev: number | undefined,
    properties: Record<string, any> = {},
  ) {
    (object as any).properties = properties;
    this.#setWorldPosition(object, lon, lat, elev);
    this.scene.add(object);
    this.#serverLogger?.sendData("/object/new", {
      position: object.position,
      x: object.position.x,
      z: object.position.z,
      session: this.#session,
      properties,
    });
  }

  #setWorldPosition(
    object: THREE.Object3D,
    lon: number,
    lat: number,
    elev?: number,
  ) {
    const worldCoords = this.lonLatToWorldCoords(lon, lat);
    if (elev !== undefined) {
      object.position.y = elev;
    }
    [object.position.x, object.position.z] = worldCoords;
  }

  /**
   * Set the elevation (y coordinate) of the camera.
   * @param {number} elev - the elevation in metres.
   */
  setElevation(elev: number) {
    this.camera.position.y = elev;
  }

  #setWorldOrigin(lon: number, lat: number) {
    this.#initialPosition = this.#proj.project(lon, lat);
  }

  #gpsReceived(position: GeolocationPosition) {
    let distMoved = Number.MAX_VALUE;
    this.#gpsCount++;
    this.#serverLogger?.sendData("/gps/new", {
      gpsCount: this.#gpsCount,
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      acc: position.coords.accuracy,
      session: this.#session,
    });
    if (position.coords.accuracy <= this.#gpsMinAccuracy) {
      if (this.#lastCoords === null) {
        this.#lastCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } else {
        distMoved = this.#haversineDist(this.#lastCoords, position.coords);
      }
      if (distMoved >= this.#gpsMinDistance) {
        this.#lastCoords.longitude = position.coords.longitude;
        this.#lastCoords.latitude = position.coords.latitude;

        if (!this.#initialPosition) {
          this.#setWorldOrigin(
            position.coords.longitude,
            position.coords.latitude,
          );
          this.#serverLogger?.sendData("/worldorigin/new", {
            gpsCount: this.#gpsCount,
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            session: this.#session,
            initialPosition: this.#initialPosition,
          });
        }

        this.#setWorldPosition(
          this.camera,
          position.coords.longitude,
          position.coords.latitude,
        );

        this.#serverLogger?.sendData("/gps/accepted", {
          gpsCount: this.#gpsCount,
          cameraX: this.camera.position.x,
          cameraZ: this.camera.position.z,
          session: this.#session,
          distMoved,
        });

        /**
         * GPS update event.
         * @event LocationBased#gpsupdate
         * @param {object} event object containing 'position' -the Geolocation API position object and 'distMoved' - the distance moved in metres since the last GPS update.
         */
        this.emit("gpsupdate", { position, distMoved });
      }
    }
  }

  /**
   * Calculate haversine distance between two lat/lon pairs.
   *
   * Taken from original A-Frame AR.js location-based components
   */
  #haversineDist(src: LonLat, dest: LonLat) {
    const dlongitude = THREE.MathUtils.degToRad(dest.longitude - src.longitude);
    const dlatitude = THREE.MathUtils.degToRad(dest.latitude - src.latitude);

    const a =
      Math.sin(dlatitude / 2) * Math.sin(dlatitude / 2) +
      Math.cos(THREE.MathUtils.degToRad(src.latitude)) *
        Math.cos(THREE.MathUtils.degToRad(dest.latitude)) *
        (Math.sin(dlongitude / 2) * Math.sin(dlongitude / 2));
    const angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return angle * 6371000;
  }

  /**
   * Obtain the last known GPS location.
   *
   * @return {Object} object containing latitude and longitude fields, or null if no previous GPS location.
   */
  getLastKnownLocation() {
    return this.#lastCoords;
  }
}

export default LocationBased;
