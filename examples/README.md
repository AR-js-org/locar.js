# locar.js examples

This directory provides a series of examples for LocAR.js. 

## Live online examples

Live online versions of these examples are available [on GitHub Pages](https://ar-js-org.github.io/locar.js). If you want to just run the examples, this is the best way of doing it.

## Running the examples on your local machine 

You might wish to modify and play around with the examples, by running them locally. 

LocAR.js is now available on NPM; the `package.json` here is configured to install it.

It is recommended to use [Vite](https://vitejs.dev) in **development** mode to test and experiment with them, and access them via the Vite dev server:

```
http://localhost:5173/locar.js
```

The `package.json` contains scripts for running Vite in dev mode and building with Vite (`npm run dev` and `npm run build` respectively).

You need to add `locar.js` onto the URL as vite is configured to use that as the base.

This also works nicely if you are using port forwarding with the Chrome Dev Tools on a real Android device.

The Vite config for **build mode** is configured for deploying to GitHub Pages, so you will need to tweak it if you want to build and run the examples locally.

## List of examples

The examples are as follows:

1. [Hello World](01-helloworld) : Displays a red box just to the north of a fake GPS location. This can be tested on a desktop or laptop; the default view direction is North so the red box will be visible in front of you.

2. [GPS and Sensors](02-gps-and-sensors) : Requires a real mobile device with GPS and sensors (accelerometer, magnetometer). Obtains your real GPS location and then adds four coloured boxes a short distance in each direction:
    - North: red
    - South: yellow
    - West: blue (cyan)
    - East: green


These boxes will always be close to your *initial* location, so if you move, the boxes will disappear. This example is a good test of whether your accelerometer and magnetometer are calibrated correctly. If they are, this example will work as expected. Unfortunately some Android devices seem to have them miscalibrated resulting in incorrect North (see [this issue](https://github.com/mrdoob/three.js/pull/22654)). We plan to investigate the extent of this problem and to see if it is consistent for certain devices (e.g. does a specific device model always have North wrong by 80 degrees anticlockwise?) 

3. [API Communication](03-api-communication): shows how you can communicate with a live GeoJSON API (OpenStreetMap-based). The GeoJSON is parsed, and AR objects created from each GeoJSON feature in the feed. Uses your current real GPS location and the device sensors, so **requires a real mobile device.** It also uses each object's OpenStreetMap ID to cache objects in memory as they are added, preventing the same object being added twice. Note that a new request to the server is performed if you move 100 metres; a better solution to minimise the number of server requests would be to implement a tiling system. This will hopefully appear soon! **Only works in Europe and Turkey due to the area of coverage of the underlying API**, but you can easily adapt the example to work with any GeoJSON API in other parts of the world simply by changing the URL.
