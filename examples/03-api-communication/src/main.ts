import * as THREE from 'three';
import { 
    App,
    GpsReceivedEvent,
 } from 'locar';

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.001, 1000);

const app = new App({ 
    camera,
    canvas: document.getElementById('glscene') as HTMLCanvasElement
});

try {
    let firstPosition = true;
    const locar = await app.start();

    const indexedObjects = new Map<number, THREE.Mesh>();

    const cube = new THREE.BoxGeometry(20, 20, 20);

    locar.on("gpserror", (error: GeolocationPositionError) => {
        alert(`GPS error: code ${error.code}`);
    });

    locar.on("gpsupdate", async(ev: GpsReceivedEvent) => {
    
        if(firstPosition || ev.distMoved > 100) {

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

    document.getElementById("setFakeLoc")!.addEventListener("click", e => {
        alert("Using fake input GPS, not real GPS location");
        locar.stopGps();
        locar.fakeGps(
            parseFloat((document.getElementById("fakeLon") as HTMLInputElement).value),
            parseFloat((document.getElementById("fakeLat") as HTMLInputElement).value)
        );
    });

    locar.startGps();

} catch (e: any) {
    alert(`${e.code} ${e.message}`);
}

