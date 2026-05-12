# Location-based AR.js with LocAR.js 0.2

## Part 2 - Using real GPS and listening for updates

Having looked at the basics of the LocAR.js API in the first tutorial, we will now look at how to use the real GPS location. Last time, if you remember, we used a "fake" location with the `LocAR.LocationBased`'s `fakeGps() `call.

### GPS tracking

Here is an example which obtains your real GPS location and listen for updates. As soon as the first update is received, four differently-coloured boxes are placed a short distance to your north, south, east and west.

```typescript
import * as THREE from 'three';
import { 
    App, GpsReceivedEvent
 } from 'locar';

const app = new App({ 
    cameraOptions: { hFov: 80, near: 0.001, far: 1000 }
});

try {
    let firstLocation = true;
    const locar = await app.start();
    locar.on("gpserror", (error : GeolocationPositionError) => {
        alert(`GPS error: ${error.code}`);
    });

    locar.on("gpsupdate", (ev: GpsReceivedEvent) => {
        if(firstLocation) {
            alert(`Got the initial location: longitude ${ev.position.coords.longitude}, latitude ${ev.position.coords.latitude}`);

            const boxProps = [{
                latDis: 0.0005,
                lonDis: 0,
                colour: 0xff0000
            }, {
                latDis: -0.0005,
                lonDis: 0,
                colour: 0xffff00
            }, {
                latDis: 0,
                lonDis: -0.0005,
                colour: 0x00ffff
            }, {
                latDis: 0,
                lonDis: 0.0005,
                colour: 0x00ff00
            }];

            const geom = new THREE.BoxGeometry(10,10,10);

            for(const boxProp of boxProps) {
                const mesh = new THREE.Mesh(
                    geom, 
                    new THREE.MeshBasicMaterial({color: boxProp.colour})
                );

                locar.add(
                    mesh, 
                    ev.position.coords.longitude + boxProp.lonDis, 
                    ev.position.coords.latitude + boxProp.latDis
                );
            }
        
            firstLocation = false;
        }
    });

    locar.startGps();
}
catch(e: any) {
    alert(`${e.code} ${e.message}`);
}
```

Much of the initial code is the same. The first new feature is this event listener:

```typescript
locar.on("gpsupdate", (ev: GpsReceivedEvent) => {
```

The `LocAR` object emits a `gpsupdate` event when we receive a new GPS location. The event object is of type `GpsReceivedEvent`. This contains two properties, `position` which is a standard Geolocation API `GeolocationPosition`, and the distance moved, `distMoved`.

We will look at the `gpsupdate` event handler in more detail below. Before that, we will look at how to start listening to GPS updated. We do this with the `startGps()` method of `LocAR`:
```
arjs.startGps();
```
Using the Geolocation API this will make the application start listening for GPS updates. *The nice thing is we do not need to do anything else. The `LocationBased` object automatically updates the camera x and z coordinates to reflect our current GPS location.* Specifically, the GPS latitude and longitude are converted to Spherical Mercator, the sign of `z` reversed (to match the OpenGL coordinate system), and the resulting coordinates used for the camera coordinates.

### Adding four boxes to north, south, east and west

In our `gpsupdate` event handler, we will add four boxes to north, south, east and west surrounding our initial GPS position. As well as an illustration of the LocAR.js API, this does have practical use too.
One issue on some devices with web AR is that the device's sensors (accelerometer, magnetometer) may be miscalibrated on a small number of devices. A good way of checking this is to write a simple app which displays four boxes to your north, south, east and west when a GPS location is first obtained. You can then check whether those boxes appear in their correct location. (In future we aim to produce a calibration tool to correct any miscalibration on your device).


Looking again at our event handler:

```typescript
locar.on("gpsupdate", (ev: GpsReceivedEvent) => {
	if(firstLocation) {
		alert(`Got the initial location: longitude ${ev.position.coords.longitude}, latitude ${ev.position.coords.latitude}`);

		const boxProps = [{
			latDis: 0.0005,
			lonDis: 0,
			colour: 0xff0000
		}, {
			latDis: -0.0005,
			lonDis: 0,
			colour: 0xffff00
		}, {
			latDis: 0,
			lonDis: -0.0005,
			colour: 0x00ffff
		}, {
			latDis: 0,
			lonDis: 0.0005,
			colour: 0x00ff00
		}];

		const geom = new THREE.BoxGeometry(10,10,10);

		for(const boxProp of boxProps) {
			const mesh = new THREE.Mesh(
				geom, 
				new THREE.MeshBasicMaterial({color: boxProp.colour})
			);

			locar.add(
				mesh, 
				ev.position.coords.longitude + boxProp.lonDis, 
				ev.position.coords.latitude + boxProp.latDis
			);
		}
	
		firstLocation = false;
	}
});
```
The `gpsupdate` event runs whenever we get a new GPS location. This takes an event object with a `position` property containing the standard position object from the Geolocation API, so we can use its `coords` to get the GPS location. when we get a location, we check whether this was the first GPS location obtained (to prevent the same boxes being added each time our GPS location changes). If it was, we add four boxes a short distance to the north (red), south (yellow), west (cyan) and east (green) of us. These are around 50 metres from our original position.

Try it out, and if your sensors are calibrated correctly, you will see a red box to your north, a yellow box to your south, a cyan (light blue) box to your west and a green box to your east. These are relative to your *initial* position so as you move, the boxes' positions relative to you will change. Remember the boxes are around 50 metres from your original position, so you will have to move some distance (maybe around 10 metres) to see a difference.
