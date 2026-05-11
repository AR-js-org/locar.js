import * as THREE from 'three';
import { App } from 'locar';


const app = new App({ 
    cameraOptions: { hFov: 80, near: 0.001, far: 1000 }
});

try {
    const locar = await app.start();
    locar.fakeGps(-0.72, 51.05);
    const geom = new THREE.BoxGeometry(10, 10, 10);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geom, material);
    locar.add(mesh, -0.72, 51.0505);
} catch (e: any) {
    alert(`Error: ${e.code} ${e.message}`);
}



