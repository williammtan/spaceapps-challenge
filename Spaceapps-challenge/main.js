import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#app') });
renderer.setSize(window.innerWidth, window.innerHeight);



camera.position.z = 0;
camera.position.set(0, 0, 50);


const textureLoader = new THREE.TextureLoader();
const panoramaTexture = textureLoader.load('/sky.png'); 

// const light = new THREE.PointLight(0xffffff, 100, 1000);
// light.position.set(0, 0, 0);  // Light source at the center of the scene
// scene.add(light);


const skyGeometry = new THREE.SphereGeometry(1100, 64, 44);
skyGeometry.scale(1, 1, 1);  

const skyMaterial = new THREE.MeshBasicMaterial({
  map: panoramaTexture,
  side: THREE.BackSide  
});

const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);


function galacticToCartesian(lon, lat, distance = 1) {
  const lonRad = THREE.MathUtils.degToRad(lon);
  const latRad = THREE.MathUtils.degToRad(lat);
  
  // Compute the Cartesian coordinates
  const x = distance * Math.cos(latRad) * Math.cos(lonRad);
  const y = distance * Math.cos(latRad) * Math.sin(lonRad);
  const z = distance * Math.sin(latRad);
  
  return new THREE.Vector3(x, y, z); 
}

const ComBLoc = galacticToCartesian(78.28322, 264.13954,100)

const starGeometry = new THREE.SphereGeometry(5, 32, 32); 
const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

const starMesh = new THREE.Mesh(starGeometry, starMaterial);
starMesh.position.set(ComBLoc.x, ComBLoc.y, ComBLoc.z);

scene.add(starMesh);



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
