# LocAR.js

Location-based AR from AR.js.

## What is this?

LocAR.js is an AR.js project to develop a library focused specifically on location-based augmented reality in the browser. Currently it consists of the location-based three.js code from [the main AR.js repository](https://github.com/AR-js-org/AR.js), with some minor changes to make it compatible with latest versions (0.175.0 at time of writing) of three.js.

## Why?

Location-based AR has been part of AR.js for a while now, however the location-based component is essentially entirely independent of the marker-based and NFT components. Thus it makes sense to separate it out into its own project so that, for example, its dependencies (primarily three.js) can be updated without breaking the rest of AR.js and likewise, the code can be altered to ensure compatibility with the latest three.js without similarly breaking the remainder of AR.js. It also means that developers can work on the location-based aspect without having to understand the marker-based and NFT side, and also means that there is no need to include jsartoolkit.

## Using the modern build tool Vite

The opportunity has also been taken to move to the modern and user-friendly build tool [Vite](https://vitejs.dev), with the hope that this will improve the development and maintenance experience.

## Roadmap - investigating long standing bugs and issues

For a while there have been some bugs and issues with location-based AR.js which are thus far unresolved (e.g [#278](https://github.com/AR-js-org/AR.js/issues/278) or [#590](https://github.com/AR-js-org/AR.js/issues/590) ), which we hope can be investigated more easily with a standalone project (subject to our time availability of course - which is why we need developers and maintainers!). It's also hoped that the move to the more friendly Vite build system will help resolve some of the occasional issues that occur with importing ES6 modules (e.g. [issue 607](https://github.com/AR-js-org/AR.js/issues/607) ).

Some of these issues, such as incorrect North on some devices, may well be to do with incorrect or mis-calibrated sensors but the hope is that the standalone library will help to verify this and, if certain devices have North wrong by a consistent bearing, to develop a calibration tool.

## Cross-platform Compatibility

It should now work on Chrome and Safari on iOS as well as Android, due to a number of recent iOS fixes by project contributors.

Firefox unfortunately does not appear to fully implement the Device Orientation API so is unlikely to work.

## Using the library

The library has been published to `npm` so you can install with:
```
npm install locar
```

Then you can use the library in your projects with:

```javascript
import * as LocAR from 'locar';
```

as long as you include `locar` as a dependency, e.g. in your `package.json`:
```
"dependencies": {
   "locar" : "^0.1.8",
   "three" : "^0.175.0"
}
```

Including the library bundle directly as an import has issues with duplicate three.js imports which we have not resolved, so we recommend the approach above.

## API documentation

Please see [here](https://ar-js-org.github.io/locar.js/api) for full API documentation.

## Tutorial

Please see [here](https://github.com/AR-js-org/locar.js/blob/master/docs/tutorial/index.md) for a tutorial introducing LocAR.js.

## Contributors

Many thanks to all contributors to the project, in particular [Darian Elias Weiß](https://github.com/darianwwu), [Kazuhiro Matsuyama](https://github.com/ma2yama) and [Luigi Mannoni](https://github.com/luigimannoni-smartify) for providing extremely valuable iOS fixes and enhancements.

## Disclaimer

This is an open-source project licensed under the [MIT License](LICENSE) and thus comes with no warranty. Also it is a volunteer-led project; work on the project by AR.js maintainers or any other contributor will be undertaken *time-permitting* only. For this reason we welcome contributors! The more people working on the project, the more likely it is that it will become full-featured and issues will be resolved.
