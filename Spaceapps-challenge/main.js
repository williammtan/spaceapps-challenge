import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#app') });
renderer.setSize(window.innerWidth, window.innerHeight);



camera.position.z = 0;


const textureLoader = new THREE.TextureLoader();
const panoramaTexture = textureLoader.load('/sky.png'); 
const skyTexture = textureLoader.load('/sky.jpg'); 



const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
skyGeometry.scale(1, 1, 1);  

// Create the material using the loaded texture
const skyMaterial = new THREE.MeshBasicMaterial({
  map: panoramaTexture,
  side: THREE.BackSide  
});

// const skyMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.BackSide });

const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// const geometry = new THREE.BoxGeometry();
// const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
// const cube = new THREE.Mesh(geometry, material);
// scene.add(cube);

const controls = new OrbitControls( camera, renderer.domElement );
controls.listenToKeyEvents( window ); // optional

//controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;

controls.screenSpacePanning = false;

controls.minDistance = 100;
controls.maxDistance = 500;

controls.maxPolarAngle = Math.PI / 2;



function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);

}
renderer.setAnimationLoop( animate );

// Adjust rendering on window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
