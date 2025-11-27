# Updates

## `0.1.6` (2025-11-27).

Added option `orientationChangeThreshold` to `LocAR.DeviceOrientationControls` to define a minimal orientation change needed to trigger an update on the `object`. This helps to reduce jittering due to frequent and tiny updates of the device sensors.

## `0.1.5` (2025-11-26).

Added ability to add multiple event handlers to an event, and remove a given event handler with the `off()` method.

## `0.1.4` (2025-11-15).

Added `getLastKnownLocation() `method to `LocAR.LocationBased`, allowing retrieval of last known GPS location. Useful for example if you want to use fake GPS and retrieve the fake GPS location later.

## `0.1.2` (2025-10-31).

Added TypeScript types, closing [PR #14](https://github.com/AR-js-org/locar.js/issues/14).

## `0.1.1` (2025-10-11)

Allow inline styling of the iOS permission dialogs for device orientation, as well as providing a more iOS-native style by default (PR #22). Thanks to [Luigi Mannoni](https://github.com/luigimannoni-smartify) for this.

## `0.1.0` (2025-08-23). 

With significant improvements particularly on the iOS side, it's been decided to move up to an `0.1.0` release. Note that there are a few **breaking changes** with 0.1.0, particularly with initialising the `Webcam` and the `DeviceOrientationControls`. Please see the examples and the tutorial.

- Many iOS enhancements, thanks to [Darian Elias Weiß](https://github.com/darianwwu) through [PR #16](https://github.com/AR-js-org/locar.js/pull/16) which provides a range of enhancements providing fixes for sensor handling on iOS and consistency between iOS and Android.

- Improved event handling system giving developers more flexibility in error handling, fixing [issue #10](https://github.com/AR-js-org/locar.js/issues/10). 

## Older updates

- `0.0.12` (2025-05-25) - `DeviceOrientationControls` now takes `options` object which allows the specification of the `smoothingFactor`, like original AR.js.

- `0.0.11` (2025-04-19) - separated out A-Frame API into own package `locar-aframe` for greater modularity.
 
- `0.0.10` (2025-04-18) - added A-Frame components: `locar-webcam`, `locar-camera` and `locar-entity-place`, with the latter two more or less equivalent to the original AR.js `gps-new-camera` and `gps-new-entity-place` components but with some parameter changes.

- `0.0.9` (2025-04-12) - revised webcam API (**breaking change**). Now uses `LocAR.Webcam` rather than `LocAR.WebcamRenderer`. Different approach setting the `background` of the scene directly to the `THREE.VideoTexture` from the webcam. Docs and tutorial have been updated to match. This is an attempt to tackle the "stretched camera feed" issue from the main repo (#498).

- `0.0.8` (2025-03-24) - added iPad 13+ detection (issue #660 from [main AR.js repo](https://github.com/AR-js-org/AR.js)).

- `0.0.7` (2025-03-23) - added iOS enhancements and bugfixes from [main AR.js repo](https://github.com/AR-js-org/AR.js) including issues/PRs #657 and #659.
