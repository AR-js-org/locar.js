# Location-based AR.js with LocAR.js 0.2

## Part 3 - Connecting to a web API 

Having looked at how to use the LocAR.js API, we will now consider an example which connects to a web API providing points of interest. This example does not actually introduce any new LocAR.js concepts, but shows you how you can work with a web API.

```typescript
import * as THREE from 'three';
import { 
    App,
    GpsReceivedEvent,
 } from 'locar';

const app = new App({ 
    cameraOptions: { hFov: 80, near: 0.001, far: 1000 }
});

try {
    let firstPosition = true;

    let lastLonLat: LonLat | null = null;
    let distSinceUpdate = Number.MAX_VALUE;
   
    const locar = await app.start();

    const indexedObjects = new Map<number, THREE.Mesh>();

    const cube = new THREE.BoxGeometry(20, 20, 20);

    locar.on("gpserror", (error: GeolocationPositionError) => {
        alert(`GPS error: code ${error.code}`);
    });

    locar.on("gpsupdate", async(ev: GpsReceivedEvent) => {

        const lonLat = new LonLat(
            ev.position.coords.longitude,
            ev.position.coords.latitude
        );

        if(lastLonLat !== null) {
            distSinceUpdate = LocAR.haversineDist(lonLat, lastLonLat);
        }    

        if(firstPosition || distSinceUpdate > 500) {
            lastLonLat = lonLat;

            const response = await fetch(`https://hikar.org/webapp/map?bbox=${ev.position.coords.longitude-0.02},${ev.position.coords.latitude-0.02},${ev.position.coords.longitude+0.02},${ev.position.coords.latitude+0.02}&layers=poi&outProj=4326`);
            const pois = await response.json();

            pois.features.forEach ( (poi: any) => {
                if(!indexedObjects.get(poi.properties.osm_id)) {
                    const mesh = new THREE.Mesh(
                        cube,
                        new THREE.MeshBasicMaterial({color: 0xff0000})
                    );                

                    locar.add(mesh, poi.geometry.coordinates[0], poi.geometry.coordinates[1], 0, poi.properties);
                    indexedObjects.set(poi.properties.osm_id, mesh);
                }
            });
            firstPosition = false;
        } 
    });

    locar.startGps();

} catch (e: any) {
    alert(`${e.code} ${e.message}`);
}
```

How is this working? The key thing is we **handle the `gpsupdate` event** once more.

Here, we trigger a download from a web API when we get the update. As we saw in [Part 2](part2.md), the `gpsupdate` event handler receives the standard position object of the Geolocation API, so that, for example, its `coords` property contains the longitude and latitude. We implement some logic to only fetch from the server if we have moved a certain distance since the last update (500m here) by storing the position of the last download in `lastLonLat` and checking the distance between the current position and `lastLonLat` using LocAR's inbuilt `haversineDist()` method. This calculates the distance in metres between two `LonLat` objects. 

We then download data in a 0.02 x 0.02 degree box centred on our current location from the API at https://hikar.org. This provides [OpenStreetMap](https://openstreetmap.org) POI data, but only for Europe and Turkey due to server capacity constraints. The data is provided as [GeoJSON](https://geojson.org).

So having received the data, we simply loop through it and create one `THREE.Mesh` for each POI, adding it at the appropriate location (accessible via the `coordinates` of the `geometry` of each GeoJSON object).

Note the boolean variable `firstPosition` which is set to false as soon as we have fetched the data. This prevents data being continuously downloaded from the server every time we get a position update, as it's set to `false` as soon as data has been downloaded. In a real application you could implement code to download data by tile, so that new data is downloaded whenever you move into a new tile.

We also store our OSM POIs in a `Map` called `indexedObjects`, indexing them with their `osm_id` (unique OpenStreetMap ID). This means that if we download overlapping areas each time we contact the API, the same objects will not be added to our scene twice, as we check `indexedObjects` to ensure that the object with that ID is not already present.

Note that this is not the most efficient way of downloading data from an API. It would be much better to keep track of which boxes of data we have downloaded already, to prevent downloading the same data twice. We can do this using a *tiling system*, which will be explored in a later tutorial.
