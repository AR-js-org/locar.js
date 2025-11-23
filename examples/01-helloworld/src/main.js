import * as THREE from 'three';
import * as LocAR from 'locar';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.001, 100);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);


const box = new THREE.BoxGeometry(2, 2, 2);
const cube = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
const locar = new LocAR.LocationBased(scene, camera);
const cam = new LocAR.Webcam( { 
    video: {
        facingMode: 'environment'
    }
}, null, true);

cam.on("webcamstarted", ev => {
    scene.background = ev.texture;
});

cam.on("webcamerror", error => {
    alert(`Webcam error: code ${error.code} message ${error.message}`);
});

window.addEventListener("resize", e => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

locar.fakeGps(-0.72, 51.05);
locar.add(cube, -0.72, 51.0501);

renderer.setAnimationLoop(animate);


function animate() {
    renderer.render(scene, camera);
}
