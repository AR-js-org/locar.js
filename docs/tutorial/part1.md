# Location-based AR.js with LocAR.js 0.2

## Part 1 - Hello World!

The first part of this tutorial will show you how to create a "hello world" application using LocAR.js. It is assumed you are aware of basic three.js concepts, such as the scene, renderer and camera as well as geometries, materials and meshes. This example will set your location to a "fake" GPS location and add a box a short distance away.

Let's start with the HTML, which is very simple but does include a viewport meta tag and styling for `html` and `body` to ensure that the camera feed occupies the whole screen and no rescaling is attempted:

```html
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1, minimum-scale=1, maximum-scale=1" />
<style>
html, body {
	width: 100%;
	height: 100%;
}
</style>
<title>LocAR.js example 1</title>
<script type='module' src='src/main.ts'></script>
</head>
<body>
</body>
</html>
```

This example assumes that you have installed LocAR.js via `npm` and are using Vite in dev mode to run the application, as described on the [index page for the tutorial](index.md). We link in our source as an ES6 module from `src/main.ts`, so this is where you should save your code, as `main.ts` inside the `src` directory. Here is the `main.ts` code:

```typescript
import * as THREE from 'three';
import { App } from 'locar';


const app = new App({ 
    cameraOptions: { hFov: 80, near: 0.001, far: 1000 }
});

try {
    const locar = await app.start();
    const geom = new THREE.BoxGeometry(10, 10, 10);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geom, material);
    locar.add(mesh, -0.72, 51.0505);
    locar.fakeGps(-0.72, 51.05);
} catch (e: any) {
    alert(`Error: ${e.code} ${e.message}`);
}
```

In LocAR.js 0.2, there is now an `App` class allowing you to easily setup the application, though you can still use the 0.1 API to setup your three.js scene mannually  if you wish.

So we create an `App` object and pass in the parameters for our three.js camera: the horizontal field of view, the near clip plane and the far clip plane. 

```typescript
const app = new App({ 
    cameraOptions: { hFov: 80, near: 0.001, far: 1000 }
});
```

Internally, these will be used to create a `THREE.PerspectiveCamera`. The `App` object takes many options: see the documentation for more details.

Using the `App` object, we then initialise the app with its `start()` method. This returns a promise which will be resolved once the app is in a ready state, i..e. the device sensors have been initialised and, on iOS devices, the user has granted permission to use the sensors. This promise resolves with an object of class `LocAR` (note that in 0.1 this class was called `LocationBased`).

```typescript
const locar = await app.start();
```

We then set a fake GPS of longitude -0.72 and latitude 51.05:

```typescript
locar.fakeGps(-0.72, 51.05);
```

We can also use `startGps()` to start listening to the real GPS receiver.

We then create a box geometry and a mesh using that box geometry and a red material: this is standard three.js code:

```typescript
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const mesh = new THREE.Mesh(geom, material);
```

and then add it to our `LocAR` object using its `add()` method. This takes three arguments: the mesh to add, the longitude and the latitude.

```typescript
locar.add(mesh, -0.72, 51.05);
```

Rather than setting the box's `position` as we would normally do in standard three.js, we add it to a specific **real-world location** defined by longitude and latitude. The `add()` method of `LocAR.LocationBased` allows us to do that.

Having positioned our box in a specific real-world location, we now need to place **ourselves** (i.e. the camera) at a given real-world location We can do this with `LocAR.LocationBased`s `fakeGps()` method, which takes longitude and latitude as parameters:

```javascript
arjs.fakeGps(-0.72, 51.05);
```

This places us just to the south of the red box. By default, we face north, so the red box will appear in front of us.

The remaining code is the standard three.js code for defining a rendering function and setting it as the animation loop.

### Try it!

Try it on either a desktop machine or an Android device running Chrome. On a mobile device or desktop you should see the feed from the webcam, and a red box just in front of you. Note that the mobile device will not yet respond to changes in orientation: we will add that next time. For this reason you *must ensure the box is to your north* as the default view is to face north.
