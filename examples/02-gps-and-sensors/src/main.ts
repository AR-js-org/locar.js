import * as THREE from 'three';
import { 
    App, GpsReceivedEvent, ReadyEvent
 } from 'locar';

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.001, 100);
const app = new App({ 
    camera,
    canvas: document.getElementById('glscene') as HTMLCanvasElement,
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

     document.getElementById("setFakeLoc")!.addEventListener("click", e => {
        alert("Using fake input GPS, not real GPS location");
        locar.stopGps();
        locar.fakeGps(
            parseFloat((document.getElementById("fakeLon") as HTMLInputElement).value),
            parseFloat((document.getElementById("fakeLat") as HTMLInputElement).value)
        );
    });

    locar.startGps();
}
catch(e: any) {
    alert(`${e.code} ${e.message}`);
}




