/**
 * Class to handle device orientation.
 * IMPORTANT - this code is a modified version the former official three.js
 * DeviceOrientationControls class, which was formerly provided with the
 * three.js repo
 *
 * Changes:
 *
 * - use "deviceorientationabsolute" rather than "deviceorientation"
 *   where available
 * - many others (see comments and GitHub commit history)
 *
 * Original authors (prior to AR.js and locar.js modifications):
 *
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 * W3C Device Orientation control (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */

import {
  Euler,
  EventDispatcher,
  MathUtils,
  Object3D,
  Quaternion,
  Vector3,
} from "three";

import EventEmitter from "./event-emitter";
import {
  LOCAR_DEVICE_ORIENTATION_PERMISSION_MODAL,
  LOCAR_DEVICE_ORIENTATION_PERMISSION_BUTTON,
  LOCAR_DEVICE_ORIENTATION_PERMISSION_MESSAGE,
  LOCAR_DEVICE_ORIENTATION_PERMISSION_INNER,
  LOCAR_DEVICE_ORIENTATION_PERMISSION_BUTTON_INNER,
} from "../constants/classes.js";

import type { DeviceOrientationControlsOptions } from "../types/locar";

const LOCAR_DEVICE_ORIENTATION_MESSAGE =
  "This immersive website requires access to your device motion sensors.";

const isIOS =
  navigator.userAgent.match(/iPhone|iPad|iPod/i) ||
  (/Macintosh/i.test(navigator.userAgent) &&
    navigator.maxTouchPoints != null &&
    navigator.maxTouchPoints > 1); // for iPad Safari - see #660 in main repo

const _zee = new Vector3(0, 0, 1);
const _euler = new Euler();
const _q0 = new Quaternion();
const _q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis
const _q2 = new Quaternion();
const _forward = new Vector3();
const _up = new Vector3();

const TWO_PI: number = 2 * Math.PI;
const HALF_PI: number = 0.5 * Math.PI;

type DeviceOrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

// iOS only - see issue #36.
// alpha is relative to an arbitrary direction on iOS, so north has to come
// from webkitCompassHeading. Measurements on an iPhone show that
// webkitCompassHeading is neither the heading of the top edge of the device
// nor that of the camera: it is the rotation of the device about the vertical
// which is left once the tilt has been removed by the shortest possible
// rotation, i.e.
//   webkitCompassHeading = -(absolute alpha + tiltTwist(beta, gamma))
// Once the screen faces the ground by more than 45 degrees, iOS calculates
// the same for the device seen from its back (turned over about its long
// axis): this is the faceDown case.

// Vertical component of the screen normal at which iOS switches to faceDown
const FACE_DOWN_LIMIT = -Math.SQRT1_2;
// Range either side of the limit in which we stay with the case we came from
const FACE_DOWN_BAND = 0.05;

const tiltTwist = (beta: number, gamma: number, faceDown: boolean) => {
  const sinB = Math.sin(beta / 2);
  const cosB = Math.cos(beta / 2);
  const sinG = Math.sin(gamma / 2);
  const cosG = Math.cos(gamma / 2);
  return faceDown
    ? 2 * Math.atan2(sinB * cosG, -cosB * sinG)
    : 2 * Math.atan2(sinB * sinG, cosB * cosG);
};

const angleBetween = (a: number, b: number) =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/**
 * Calculate the offset which turns the relative alpha of iOS into an
 * absolute one.
 * @param {number} alpha - alpha from the deviceorientation event (degrees)
 * @param {number} beta - beta from the deviceorientation event (degrees)
 * @param {number} gamma - gamma from the deviceorientation event (degrees)
 * @param {number} webkitCompassHeading - the iOS compass heading (degrees)
 * @param {number|null} previousOffset - the last offset, or null if there is
 * none yet. Only used close to the face-down limit.
 * @returns {number} the offset to add to alpha, in radians
 */
const iosAlphaOffset = (
  alpha: number,
  beta: number,
  gamma: number,
  webkitCompassHeading: number,
  previousOffset: number | null,
) => {
  const b = MathUtils.degToRad(beta);
  const g = MathUtils.degToRad(gamma);
  const untilted = MathUtils.degToRad(360 - webkitCompassHeading - alpha);
  const screenNormal = Math.cos(b) * Math.cos(g);

  let faceDown = screenNormal < FACE_DOWN_LIMIT;
  if (
    previousOffset !== null &&
    Math.abs(screenNormal - FACE_DOWN_LIMIT) < FACE_DOWN_BAND
  ) {
    faceDown =
      angleBetween(untilted - tiltTwist(b, g, true), previousOffset) <
      angleBetween(untilted - tiltTwist(b, g, false), previousOffset);
  }
  return untilted - tiltTwist(b, g, faceDown);
};


class DeviceOrientationControls extends EventDispatcher {
  eventEmitter: EventEmitter;
  object: Object3D;
  enabled: boolean;
  deviceOrientation: {
    alpha?: number;
    beta?: number;
    gamma?: number;
    webkitCompassHeading?: number;
    absolute?: boolean;
  } | null;
  screenOrientation: number;
  alphaOffset: number;
  orientationOffset: number;
  initialOffset: boolean | null;
  lastQuaternion: Quaternion | null;
  orientationChangeEventName: "deviceorientation" | "deviceorientationabsolute";
  smoothingFactor: number;
  enablePermissionDialog: boolean;
  enableInlineStyling: boolean;
  preferConfirmDialog: boolean;
  orientationChangeThreshold: number;
  connect: () => void;
  disconnect: () => void;
  requestOrientationPermissions: () => void;
  update: () => void;
  getCorrectedHeading: () => number;
  updateAlphaOffset: () => void;
  dispose: () => void;
  getAlpha: () => number;
  getBeta: () => number;
  getGamma: () => number;
  createObtainPermissionGestureDialog: () => void;
  obtainPermissionGesture: () => void;

  /**
   * Create an instance of DeviceOrientationControls.
   * @param {Object} object - the object to attach the controls to
   * (usually your Three.js camera)
   * @param {Object} options - options for DeviceOrientationControls:
   * currently accepts smoothingFactor (< 1), enablePermissionDialog, orientationChangeThreshold (radians)
   */
  constructor(
    object: Object3D,
    options: DeviceOrientationControlsOptions = {},
  ) {
    super();
    this.eventEmitter = new EventEmitter();

    const scope = this;

    this.object = object;
    this.object.rotation.reorder("YXZ");

    this.enabled = true;

    this.deviceOrientation = null;
    this.screenOrientation = 0;

    this.alphaOffset = 0; // radians
    this.orientationOffset = 0; // iOS orientation offset
    this.initialOffset = null; // used in fix provided in issue #466 on main AR.js repo, iOS related

    this.lastQuaternion = null;

    this.orientationChangeEventName =
      "ondeviceorientationabsolute" in window
        ? "deviceorientationabsolute"
        : "deviceorientation";

    // iOS: whether alphaOffset has been derived from a valid compass reading
    let hasCompassOffset = false;

    this.smoothingFactor = options.smoothingFactor || 0.2;
    this.enablePermissionDialog = options.enablePermissionDialog ?? true;
    this.enableInlineStyling = options.enableStyling ?? true;
    this.preferConfirmDialog = options.preferConfirmDialog ?? false;
    this.orientationChangeThreshold = options.orientationChangeThreshold ?? 0; // radians

    const onDeviceOrientationChangeEvent = (
      event: DeviceOrientationEventWithCompass,
    ) => {
      let { alpha, beta, gamma, webkitCompassHeading } = event;
      alpha = alpha ?? 0;
      beta = beta ?? 0;
      gamma = gamma ?? 0;
      webkitCompassHeading = webkitCompassHeading ?? 0;

      if (isIOS) {
        // While the compass has no reading (accuracy -1), iOS reports a
        // heading of 0: keep the last offset rather than using that.
        const compassValid = !((event.webkitCompassAccuracy ?? 0) < 0);
        if (compassValid || !hasCompassOffset) {
          scope.alphaOffset = iosAlphaOffset(
            alpha,
            beta,
            gamma,
            webkitCompassHeading,
            hasCompassOffset ? scope.alphaOffset : null,
          );
          hasCompassOffset = compassValid;
        }
        scope.deviceOrientation = { alpha, beta, gamma, webkitCompassHeading };
      } else {
        if (alpha < 0) alpha += 360;
        scope.deviceOrientation = { alpha, beta, gamma };
      }
      window.dispatchEvent(
        new CustomEvent("camera-rotation-change", {
          detail: { cameraRotation: object.rotation },
        }),
      );
    };

    const onScreenOrientationChangeEvent = () => {
      scope.screenOrientation = window.screen.orientation?.angle ?? 0;
      if (isIOS) {
        // No longer used for the camera as alphaOffset now accounts for any
        // roll (issue #36), but kept up to date for apps which read it.
        // Note that screen.orientation.angle is 270, not -90, on iOS.
        if (scope.screenOrientation === 90) {
          scope.orientationOffset = -HALF_PI;
        } else if (
          scope.screenOrientation === -90 ||
          scope.screenOrientation === 270
        ) {
          scope.orientationOffset = HALF_PI;
        } else {
          scope.orientationOffset = 0;
        }
      }
    };

    const setObjectQuaternion = (
      quaternion: Quaternion,
      alpha: number,
      beta: number,
      gamma: number,
      orient: number,
    ) => {
      _euler.set(beta, alpha, -gamma, "YXZ"); // 'ZXY' for the device, but 'YXZ' for us

      quaternion.setFromEuler(_euler); // orient the device

      quaternion.multiply(_q1); // camera looks out the back of the device, not the top

      quaternion.multiply(_q0.setFromAxisAngle(_zee, -orient)); // adjust for screen orientation
    };

    /**
     * Update the device orientation controls.
     * Should be called from your three.js rendering/animation function.
     * Permission handling now factored out into requestOrientationPermissions()
     * Therefore, connect() should now only be called once permission has been
     * granted, ie after the "deviceorientationgranted" event has been emitted.
     * This is a breaking change and now means that you need to call connect()
     * yourself - previously it was done automatically.
     */
    this.connect = () => {
      onScreenOrientationChangeEvent(); // run once on load

      window.addEventListener(
        "orientationchange",
        onScreenOrientationChangeEvent,
      );
      window.addEventListener(
        scope.orientationChangeEventName,
        onDeviceOrientationChangeEvent,
      );

      scope.enabled = true;
    };

    this.disconnect = () => {
      window.removeEventListener(
        "orientationchange",
        onScreenOrientationChangeEvent,
      );
      window.removeEventListener(
        scope.orientationChangeEventName,
        onDeviceOrientationChangeEvent,
      );

      scope.enabled = false;
      scope.initialOffset = false;
      scope.deviceOrientation = null;
      scope.lastQuaternion = null;
      hasCompassOffset = false;
    };

    // On iOS 13+ devices, request orientation permissions
    // MUST come after a user gesture (e.g. pressing button):
    // see obtainPermissionGesture() below.
    // This is therefore tightly coupled to obtainPermissionGesture(), thus is
    // called directly from it.
    this.requestOrientationPermissions = () => {
      if (
        window.DeviceOrientationEvent !== undefined &&
        typeof (window.DeviceOrientationEvent as any).requestPermission ===
          "function"
      ) {
        (window.DeviceOrientationEvent as any)
          .requestPermission()
          .then((response: string) => {
            if (response === "granted") {
              // Emit the "deviceorientationgranted" event: calls to connect()
              // would typically be done from this event's handler
              /**
               * Device orientation granted event.
               * @event DeviceOrientationControls#deviceorientationgranted
               * @param {Object} event object with 'target' field, referencing the DeviceOrientationControls object.
               */
              this.eventEmitter.emit("deviceorientationgranted", {
                target: this,
              });
            } else {
              /**
               * Device orientation error event.
               * @event DeviceOrientationControls#deviceorientationerror
               * @param {Object} error object with 'code' and 'message' fields.
               */
              this.eventEmitter.emit("deviceorientationerror", {
                code: "LOCAR_DEVICE_ORIENTATION_PERMISSION_DENIED",
                message:
                  "Permission for device orientation denied - AR will not work correctly",
              });
            }
          })
          .catch((error: any) => {
            this.eventEmitter.emit("deviceorientationerror", {
              code: "LOCAR_DEVICE_ORIENTATION_PERMISSION_FAILED",
              message:
                "Permission request for device orientation failed - AR will not work correctly",
              error: JSON.stringify(error, null, 2),
            });
          });
      } else {
        // Should never go here, emit an error if we do
        this.eventEmitter.emit("deviceorientationerror", {
          code: "LOCAR_DEVICE_ORIENTATION_INTERNAL_ERROR",
          message:
            "Internal error: no requestPermission() found although requestOrientationPermissions() was called - please raise an issue on GitHub",
        });
      }
    };

    this.update = () => {
      if (scope.enabled === false) return;
      const device = scope.deviceOrientation;

      if (device) {
        // On iOS, alphaOffset makes the relative alpha absolute (see
        // iosAlphaOffset() above). Elsewhere it is 0 unless set by the app.
        let alpha = MathUtils.degToRad(device.alpha ?? 0) + scope.alphaOffset; // Z

        let beta = device.beta ? MathUtils.degToRad(device.beta) : 0; // X'

        let gamma = device.gamma ? MathUtils.degToRad(device.gamma) : 0; // Y''

        const orient = scope.screenOrientation
          ? MathUtils.degToRad(scope.screenOrientation)
          : 0; // O

        const targetQuaternion = new Quaternion();

        setObjectQuaternion(targetQuaternion, alpha, beta, gamma, orient);

        // Apply threshold check if needed
        if (scope.lastQuaternion && scope.orientationChangeThreshold > 0) {
          const angleDiff = targetQuaternion.angleTo(scope.lastQuaternion);
          if (angleDiff < scope.orientationChangeThreshold) {
            return;
          }
        }

        // Apply smoothing if needed
        if (scope.smoothingFactor < 1 && scope.lastQuaternion) {
          const t = 1 - scope.smoothingFactor;
          scope.object.quaternion.slerp(targetQuaternion, t);
        } else {
          scope.object.quaternion.copy(targetQuaternion);
        }

        scope.lastQuaternion = scope.object.quaternion.clone();

        window.dispatchEvent(
          new CustomEvent("camera-rotation-change", {
            detail: { cameraRotation: scope.object.rotation },
          }),
        );
      }
    };

    this.getCorrectedHeading = () => {
      const { deviceOrientation: device } = scope;
      if (!device) return 0;

      let heading = 0;

      if (isIOS) {
        // iOS: counter-clockwise heading of the direction the camera is
        // looking in. Uses the same orientation as update() gives to the
        // camera, so it does not change if the device is rolled (issue #36)
        setObjectQuaternion(
          _q2,
          scope.getAlpha(),
          scope.getBeta(),
          scope.getGamma(),
          MathUtils.degToRad(scope.screenOrientation || 0),
        );
        _forward.set(0, 0, -1).applyQuaternion(_q2);
        _up.set(0, 1, 0).applyQuaternion(_q2);
        // When looking steeply down or up, the view direction has no usable
        // heading, so fade over to the direction the top of the screen
        // points in (as before, e.g. with the device lying flat)
        const upWeight = MathUtils.smoothstep(Math.abs(_forward.y), 0.87, 0.98);
        if (_forward.y > 0) _up.negate();
        _forward
          .setY(0)
          .normalize()
          .multiplyScalar(1 - upWeight);
        _forward.addScaledVector(_up.setY(0).normalize(), upWeight);
        heading = MathUtils.radToDeg(Math.atan2(-_forward.x, -_forward.z));
        heading = (heading + 360) % 360;
      } else {
        // Android: Check if we have absolute values
        const isAbsolute =
          device.absolute === true ||
          scope.orientationChangeEventName === "deviceorientationabsolute";
        heading = device.alpha ? device.alpha : 0;
        if (isAbsolute) {
          // With absolute values, we can use the alpha value directly as compass heading
          // but possibly with a system-specific offset
          // Reverse like iOS if alpha increases clockwise
          //heading = 360 - heading;
        }
        // Reverse direction for Android
        heading = (360 - heading) % 360;
        if (heading < 0) heading += 360;
      }
      return heading;
    };

    // Provided in fix on issue #466 (main AR.js) - iOS related
    this.updateAlphaOffset = () => {
      scope.initialOffset = false;
    };

    this.dispose = () => {
      scope.disconnect();
    };

    // provided with fix on issue #466 (main AR.js)
    this.getAlpha = () => {
      const { deviceOrientation: device } = scope;
      return device
        ? MathUtils.degToRad(device.alpha ?? 0) + scope.alphaOffset
        : 0;
    };

    // provided with fix on issue #466 (main AR.js)
    this.getBeta = () => {
      const { deviceOrientation: device } = scope;
      return device && device.beta ? MathUtils.degToRad(device.beta) : 0;
    };

    this.getGamma = () => {
      const { deviceOrientation: device } = scope;
      return device && device.gamma ? MathUtils.degToRad(device.gamma) : 0;
    };

    // Provide gesture before initialising device orientation controls
    // From PR #659 on the main AR.js repo
    // Thanks to @ma2yama
    this.createObtainPermissionGestureDialog = () => {
      // Add all the elements and a common class names to all elements
      // to allow external styling
      const startModal = document.createElement("div");
      startModal.classList.add(LOCAR_DEVICE_ORIENTATION_PERMISSION_MODAL);

      const innerDiv = document.createElement("div");
      innerDiv.classList.add(LOCAR_DEVICE_ORIENTATION_PERMISSION_INNER);

      const msgDiv = document.createElement("div");
      msgDiv.classList.add(LOCAR_DEVICE_ORIENTATION_PERMISSION_MESSAGE);

      const btnDiv = document.createElement("div");
      btnDiv.classList.add(LOCAR_DEVICE_ORIENTATION_PERMISSION_BUTTON_INNER);

      const btn = document.createElement("button");
      btn.classList.add(LOCAR_DEVICE_ORIENTATION_PERMISSION_BUTTON);

      document.body.appendChild(startModal);

      // Apply inline styling if required, the styling tries to resemble
      // a native ios dialog as closely as possible
      if (this.enableInlineStyling === true) {
        startModal.style.fontFamily =
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";
        startModal.style.display = "flex";
        startModal.style.position = "fixed";
        startModal.style.zIndex = "100000";
        startModal.style.justifyContent = "center";
        startModal.style.alignItems = "center";
        startModal.style.backgroundColor = "rgba(0,0,0,0.2)";
        startModal.style.inset = "0";
        startModal.style.padding = "20px";

        innerDiv.style.backgroundColor = "rgba(220, 220, 220, 0.85)";
        innerDiv.style.padding = "6px 0";
        innerDiv.style.borderRadius = "10px";
        innerDiv.style.width = "100%";
        innerDiv.style.maxWidth = "400px";

        msgDiv.style.padding = "10px 12px";
        msgDiv.style.textAlign = "center";
        msgDiv.style.fontWeight = "400";
        msgDiv.style.fontSize = "13px";
        msgDiv.style.display = "flex";
        msgDiv.style.justifyContent = "center";
        msgDiv.style.alignItems = "center";

        btnDiv.style.display = "block";
        btnDiv.style.textAlign = "center";
        btnDiv.style.textDecoration = "none";
        btnDiv.style.borderTop = "rgb(180,180,180) solid 1px";

        btn.style.display = "block";
        btn.style.width = "100%";
        btn.style.textAlign = "center";
        btn.style.appearance = "none";
        btn.style.background = "none";
        btn.style.border = "none";
        btn.style.outline = "none";
        btn.style.padding = "10px";
        btn.style.fontWeight = "400";
        btn.style.fontSize = "16px";
        btn.style.color = "#2e7cf1";
        btn.style.cursor = "pointer";
      }

      startModal.appendChild(innerDiv);
      innerDiv.appendChild(msgDiv);
      innerDiv.appendChild(btnDiv);
      msgDiv.appendChild(
        document.createTextNode(LOCAR_DEVICE_ORIENTATION_MESSAGE),
      );

      const onStartClick = () => {
        this.requestOrientationPermissions();
        startModal.style.display = "none";
      };

      btn.addEventListener("click", onStartClick);
      btn.appendChild(document.createTextNode("OK"));

      btnDiv.appendChild(btn);
      document.body.appendChild(startModal);
    };

    this.obtainPermissionGesture = () => {
      // Create a simple ok/cancel confirm() dialog instead of creating an html one
      // if defined in the options, otherwise create the html dialog as above
      if (this.preferConfirmDialog === true) {
        if (window.confirm(LOCAR_DEVICE_ORIENTATION_MESSAGE)) {
          this.requestOrientationPermissions();
        }
      } else {
        this.createObtainPermissionGestureDialog();
      }
    };
  }

  on(eventName: string, eventHandler: (event: any) => void) {
    this.eventEmitter.on(eventName, eventHandler);
  }

  /**
   * Initialise device orientation controls.
   * Should be called after you have created the DeviceOrientationControls
   * object and set up the deviceorientationgranted and deviceorientationerror
   * event handlers.
   */

  init = () => {
    if (window.DeviceOrientationEvent === undefined) {
      this.eventEmitter.emit("deviceorientationerror", {
        code: "LOCAR_DEVICE_ORIENTATION_NOT_SUPPORTED",
        message: "Device orientation API not supported",
      });
    } else if (window.isSecureContext === false) {
      this.eventEmitter.emit("deviceorientationerror", {
        code: "LOCAR_DEVICE_ORIENTATION_NO_HTTPS",
        message:
          "DeviceOrientationEvent is only available in secure contexts (https)",
      });
    } else {
      // Option to handle iOS permissions and connecting elsewhere
      const isiOSWithReq =
        typeof (window.DeviceOrientationEvent as any).requestPermission ===
        "function";

      if (isiOSWithReq && this.enablePermissionDialog) {
        this.obtainPermissionGesture();
      } else {
        // if not iOS we don't have to request permission so emit the
        // "deviceorientationgranted" event straight away
        this.eventEmitter.emit("deviceorientationgranted", { target: this });
      }
    }
  };
}
export default DeviceOrientationControls;
