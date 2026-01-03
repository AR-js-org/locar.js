import * as THREE from 'three';
import * as LocAR from 'locar';

const camera = new THREE.PerspectiveCamera(80, window.innerWidth/window.innerHeight, 0.001, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("glscene")
});
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();

const locar = new LocAR.LocationBased(scene, camera);

const deviceControls = new LocAR.DeviceOrientationControls(camera);
deviceControls.on("deviceorientationgranted", ev => {
    ev.target.connect();
});

deviceControls.on("deviceorientationerror", error => {
    alert(`Device orientation error: code ${error.code} message ${error.message}`);
});

deviceControls.init();

const cam = new LocAR.Webcam( { 
    video: { facingMode: 'environment' }
}, null);

cam.on("webcamstarted", ev => {
    scene.background = ev.texture;
});

cam.on("webcamerror", error => {
    alert(`Webcam error: code ${error.code} message ${error.message}`);
});

window.addEventListener("resize", e => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

let firstPosition = true;

const indexedObjects = { };

const cube = new THREE.BoxGeometry(20, 20, 20);

locar.on("gpserror", error => {
    alert(`GPS error: code ${error.code}`);
});

locar.on("gpsupdate", async(ev) => {
    
    if(firstPosition || ev.distMoved > 100) {

        const response = await fetch(`https://hikar.org/webapp/map?bbox=${ev.position.coords.longitude-0.02},${ev.position.coords.latitude-0.02},${ev.position.coords.longitude+0.02},${ev.position.coords.latitude+0.02}&layers=poi&outProj=4326`);
        const pois = await response.json();

        pois.features.forEach ( poi => {
            if(!indexedObjects[poi.properties.osm_id]) {
                const mesh = new THREE.Mesh(
                    cube,
                    new THREE.MeshBasicMaterial({color: 0xff0000})
                );                

                locar.add(mesh, poi.geometry.coordinates[0], poi.geometry.coordinates[1], 0, poi.properties);
                indexedObjects[poi.properties.osm_id] = mesh;
            }
        });
        firstPosition = false;
    }

});

document.getElementById("setFakeLoc").addEventListener("click", e => {
    alert("Using fake input GPS, not real GPS location");
    locar.stopGps();
    locar.fakeGps(
        parseFloat(document.getElementById("fakeLon").value),
        parseFloat(document.getElementById("fakeLat").value)
    );
});

locar.startGps();

renderer.setAnimationLoop(animate);

function animate() {
    deviceControls.update();
    renderer.render(scene, camera);
}
