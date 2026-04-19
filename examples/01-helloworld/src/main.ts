import * as THREE from 'three';
import { LocAR, App, ReadyEvent} from 'locar';



const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.001, 100);
const app = new App({ camera });

app.on("ready", (ev: ReadyEvent) => {
    const { locar } = ev;
    locar.fakeGps(-0.72, 51.05);
    const geom = new THREE.BoxGeometry(10, 10, 10);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const material2 = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geom, material);
    locar.add(mesh, -0.72, 51.0505);

    const line: Array<[number, number, number]> = [
        [-0.72, 51.05, -50],
        [-0.721, 51.0502, -20],
        [-0.72, 51.0505, -50],
        [-0.719, 51.0507, -50]
    ];
    locar.addGeoLine(line, material2, 5);
    
});
app.start();



