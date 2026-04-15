import * as THREE from 'three';
import { LocAR, App, ReadyEvent} from 'locar';



const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.001, 100);
const app = new App({ camera });

const locar1 = new LocAR(new THREE.Scene(), camera);
locar1.fakeGps(1,1);

app.on("ready", (ev: ReadyEvent) => {
    const { locar } = ev;
    console.log("ready callback");
    console.log(locar);
    locar.fakeGps(-0.72, 51.05);
    const geom = new THREE.BoxGeometry(10, 10, 10);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geom, material);
    locar.add(mesh, -0.72, 51.0505);
});
app.start();



