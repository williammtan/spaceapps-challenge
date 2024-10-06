
// the code for 3D rendering

// import * as THREE from 'three';

//current planet
var planet = "24 Boo b"


//an array for all the stars objects
var stars_objs = [];

//the three.js object group for the whole sky (all stars + milky way bg)
var sky_group;

//the floor (a group with a circle geometry)
var ground_group;
var ground_circle;

//the scene and the camera
var scene;
var camera;
var renderer;
var raycaster;
var pointer = new THREE.Vector2();

var INTERSECTED;

//the texture loader
var textue_loader;
//the font loader
var font_loader;

//the sky sphere with the milky way as the background
var sky_texture;
var sky_sphere;

// the particles
var particles;
//ambient light
var amb_light;
//the hemisphere light
var hemi_light;

//the control for the camera
var controls;

//the latitude we're currently on (in degrees)
var cur_lat_deg = 32.18;
//corresping to this object rotation
var cur_rot_rad = lat2rot(cur_lat_deg);

//the speed at which the sky dome rotates
var rot_speed = 0.0005;

var isDrawingMode = false;
var selectedStars = [];
var constellationLines = [];
var constellations = [];


//geo latitude to in program skydome rotation
function lat2rot (lat) {
    return (90 - lat) / 180 * Math.PI;
}

//the glsl code for the shaders
//vertex shader
var _VS = `
uniform vec3 baseColor;
uniform vec3 viewVector;

varying float intensity;
varying vec3 vertexNormal;
varying vec3 objPosition;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    vertexNormal = normal;
    objPosition = normalize(1.0 * position);
    
    //vec3 vNormal = normalize( normalMatrix * normal );
    //vec3 vNormel = normalize( normalMatrix * viewVector );
    //intensity = pow( dot(vNormal, vNormel), 1.5 );

    //vec3 actual_normal = vec3(modelMatrix * vec4(normal, 0.0));
    //intensity = pow( dot(normalize(viewVector), actual_normal), 2.0 );
}
`;
//fragment shader
var _FS = `
uniform vec3 baseColor;
uniform vec3 starObjPosition;

varying float intensity;
varying vec3 vertexNormal;
varying vec3 objPosition;

void main() {
    //float colorIntensity = pow(0.5 - dot(vertexNormal, vec3(0.0, 1.0, 0.0)), 2.0);
    float colorIntensity = pow( - dot(vertexNormal, normalize(-1.0 * starObjPosition)), 2.0);
    //gl_FragColor = vec4( baseColor, 1.0 ) * colorIntensity;

    gl_FragColor = vec4( baseColor, colorIntensity );
}
`;


async function getStars(cur_planet) {
    try {
      // Perform the GET request
      const response = await fetch(`/stars?planet=${cur_planet}`);
      
      // Check if the response is ok (status code in the range 200-299)
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      
      // Parse the JSON response
      const data = await response.json();
      
      // Return the parsed JSON object
      return data["stars"];
    } catch (error) {
      console.error('Error fetching stars data:', error);
      return null; // Return null in case of an error
    }
  }
  

  async function change_planet() {
    console.log("Changing planet...");
    for (let i = stars_objs.length - 1; i >= 0; i--) {
        scene.remove(stars_objs[i]);  // Remove star from the scene
        stars_objs[i].geometry.dispose(); // Dispose of the star geometry
        stars_objs[i].material.dispose(); // Dispose of the star material
        stars_objs.splice(i, 1); 
    }

    

    planet = document.getElementById("planet").value;
    console.log("Changing to planet:", planet);


    await load_stars(planet);

    console.log("New stars loaded for planet:", planet);
}

//for rendering the stars 
async function load_stars(planet="earth") {
    //the catalog have a list of stars
    var starcat = await getStars(planet);
    
    for (var ct = 0; ct < starcat.length; ct++) {
        var st = starcat[ct];
        
        
        //calculate the xyz coordinate of this star using modified spherical coordinate system
        //equations here: https://en.wikipedia.org/wiki/Equatorial_coordinate_system
        var sx = st["rel_x"]*10
        var sy = st["rel_y"]*10
        var sz = st["rel_z"]*10
        console.log(sx, sy, sz)
        
        //calculate the size (lower vmag -> brighter -> larger dot visually)
        //var osize = 60 * Math.pow(1.5, -vmag);
        var osize = Math.pow(1.35, Math.min(-st["linear_intensity"], 0.15));
        console.log(osize)
        
        //get the color (from bv index)
        // var bv = parseFloat(st["bv"]);
        // var st_color = bv2rgb(bv);

        var st_color = [st["color_red"], st["color_green"] , st["color_blue"]]
        // var st_color = [1, 1, 1]
        console.log(st_color)
        
        //create the model object
        var geometry = new THREE.SphereGeometry(osize, 18, 10);
        //var material = new THREE.MeshBasicMaterial({color: 0xffffff});
        var material = new THREE.ShaderMaterial({
            uniforms: {
                //base color of the star, could be set to various color later
                baseColor: {type: "c", value: new THREE.Color(st_color[0], st_color[1], st_color[2])},
                //the current position of the camera
                viewVector: { type: "v3", value: camera.position },
                //this star object's position vector within the universe(scene)
                starObjPosition: { type: "v3", value: new THREE.Color(sy, sz, sx) },
            },
            vertexShader: _VS,
            fragmentShader: _FS,
            blending: THREE.AdditiveBlending,
        });

        var starMaterial = material.clone();

        // Assign uniforms separately
        starMaterial.uniforms = THREE.UniformsUtils.clone(material.uniforms);
        starMaterial.uniforms.baseColor.value = new THREE.Color(st_color[0], st_color[1], st_color[2]);
        starMaterial.uniforms.starObjPosition.value = new THREE.Color(sy, sz, sx);

        var star = new THREE.Mesh(geometry, starMaterial);
        
        // var star = new THREE.Mesh(geometry, material);
        
        //set position and add to scene
        star.position.x = sy;
        star.position.y = sz;
        star.position.z = sx;
        scene.add(star);
        // sky_group.add(star);
        stars_objs.push(star);
    }

}



function load_skysphere() {
    var skygeo = new THREE.SphereGeometry(14000, 96, 48);
    
    sky_texture = textue_loader.load("/.jpg");
    
    var material = new THREE.MeshPhongMaterial({ 
        map: sky_texture,
    });
    
    sky_sphere = new THREE.Mesh(skygeo, material);
    sky_sphere.material.side = THREE.BackSide;
    
    // sky_sphere.rotateY(-Math.PI / 2);
    
    //scene.add(sky_sphere);
    sky_group.add(sky_sphere);
}

function load_ground() {
    var geom = new THREE.CylinderGeometry( 50, 50, 0.5, 8 );
    
    var grass_texture = textue_loader.load("grass_textures_seamless_36.jpg");
    grass_texture.wrapS = THREE.RepeatWrapping;
    grass_texture.wrapT = THREE.RepeatWrapping;
    grass_texture.repeat.set( 8, 8 );
    var mat = new THREE.MeshPhongMaterial({ map: grass_texture, });
    var mat = new THREE.MeshStandardMaterial( { color: 0x144a09 } );
    ground_circle = new THREE.Mesh(geom, mat);

    ground_circle.position.y = -3;
    
    ground_group = new THREE.Group();
    ground_group.add(ground_circle);

    //now create the compass (N, E, S, W direction texts)
    var direction_N_geom;
    font_loader.load('helvetiker_regular.typeface.json', function(font) {
        direction_N_geom = new THREE.TextGeometry( 'N', {
		font: font,
		size: 40,
		height: 5,
		curveSegments: 12,
		bevelEnabled: true,
		bevelThickness: 35,
		bevelSize: 8,
		bevelOffset: 0,
		bevelSegments: 5
        });
    });
    
    var direction_N = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 11), new THREE.MeshStandardMaterial({color: 0xe84d4d }));
    var direction_E = new THREE.Mesh(new THREE.BoxGeometry(11, 0.03, 0.03), new THREE.MeshStandardMaterial({color: 0xa6a6a6 }));
    var direction_S = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 11), new THREE.MeshStandardMaterial({color: 0x3d5ccc }));
    var direction_W = new THREE.Mesh(new THREE.BoxGeometry(11, 0.03, 0.03), new THREE.MeshStandardMaterial({color: 0xa6a6a6 }));
    
    direction_N.position.z = 6;
    direction_E.position.x = 6;
    direction_S.position.z = -6;
    direction_W.position.x = -6;
    
    direction_N.position.y = -2.4;
    direction_E.position.y = -2.4;
    direction_S.position.y = -2.4;
    direction_W.position.y = -2.4;
    
    ground_group.add(direction_N);
    ground_group.add(direction_E);
    ground_group.add(direction_S);
    ground_group.add(direction_W);
    
    scene.add(ground_group);
}

//when the rotation speed slider is changed
function rot_speed_change (evnt) {
    var value = evnt.target.value;
    rot_speed = value / 10000;
}
//when the set lat button is pressed
function set_lat_pressed() {
    var value = document.getElementById("lat").value;

    //clamp to +-90
    if (value > 90) {
        value = 90;
    } else if (value < -90) {
        value = -90;
    }

    //the new rotation
    var new_rot = lat2rot(value);
    
    //calculate the differnce and rotate that amount
    var rot_diff = new_rot - cur_rot_rad;

    axis_polar.applyAxisAngle(unit_i, rot_diff);
    //sky_group.rotateOnAxis(unit_i, rot_diff);
    sky_group.rotateOnWorldAxis(unit_i, rot_diff);
    
    //update value
    cur_rot_rad = new_rot;
}

function onPointerMove( event ) {
    
    var rect = renderer.domElement.getBoundingClientRect();
    
    // Adjust the mouse coordinates based on the canvas's position
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function onClick(event) {

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(stars_objs, false); // Only check stars

    if (intersects.length > 0) {
        var selectedStar = intersects[0].object;

        if (isDrawingMode) {
            // Add the star to the selection if not already selected
            if (!selectedStars.includes(selectedStar)) {
                selectedStars.push(selectedStar);
                highlightStar(selectedStar, true);

                // Draw line if there are at least two selected stars
                if (selectedStars.length > 1) {
                    drawLineBetweenLastTwoStars();
                }
            }
        } else {
            // Not in drawing mode, you may implement other features here
        }
    }

    renderer.render(scene, camera);
}



function highlightStar(star, highlight) {
    if (highlight) {
        // Store the original color if not already stored
        if (!star.userData.originalColor) {
            star.userData.originalColor = star.material.uniforms.baseColor.value.clone();
        }
        // Change color to indicate selection (e.g., red)
        star.material.uniforms.baseColor.value.set(0xff0000);
    } else {
        // Restore the original color
        if (star.userData.originalColor) {
            star.material.uniforms.baseColor.value.copy(star.userData.originalColor);
        }
    }
}



function drawLineBetweenLastTwoStars() {
    var material = new THREE.LineBasicMaterial({ color: 0xffffff });

    var geometry = new THREE.BufferGeometry().setFromPoints([
        selectedStars[selectedStars.length - 2].position.clone(),
        selectedStars[selectedStars.length - 1].position.clone()
    ]);

    var line = new THREE.Line(geometry, material);
    scene.add(line);
    constellationLines.push(line);
}



function saveConstellations() {
    var data = constellations.map(constellation => ({
        name: constellation.name,
        stars: constellation.stars, // UUIDs of stars
    }));
    localStorage.setItem('constellations', JSON.stringify(data));
}


function clearSelection() {
    // Remove highlights from stars
    selectedStars.forEach(star => highlightStar(star, false));
    selectedStars = [];

    // Clear the temporary constellation lines (do not remove them from the scene)
    constellationLines = [];
}



function addConstellationLabel(constellation) {
    var loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(font) {
        var textGeometry = new THREE.TextGeometry(constellation.name, {
            font: font,
            size: 1,
            height: 0.1,
            curveSegments: 12,
        });

        var textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        var mesh = new THREE.Mesh(textGeometry, textMaterial);

        // Position the label near the first line of the constellation
        var line = constellation.lines[0];
        var positions = line.geometry.attributes.position.array;

        var startPoint = new THREE.Vector3(positions[0], positions[1], positions[2]);
        var endPoint = new THREE.Vector3(positions[3], positions[4], positions[5]);
        var midPoint = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);

        mesh.position.copy(midPoint);
        mesh.lookAt(camera.position); // Make the text face the camera

        scene.add(mesh);
        constellation.label = mesh;
    });
}


function toggleDrawingMode() {
    isDrawingMode = !isDrawingMode;

    var button = document.getElementById('toggleDrawingModeButton');
    if (isDrawingMode) {
        button.textContent = 'Stop Drawing Constellation';
        button.style.backgroundColor = 'green';

        // Clear any previous selection
        clearSelection();
    } else {
        button.textContent = 'Start Drawing Constellation';
        button.style.backgroundColor = 'grey';

        if (selectedStars.length > 1) {
            // Name and store the constellation
            nameConstellation();
        } else {
            // Not enough stars selected, clear selection
            clearSelection();
            alert('Constellation must have at least two stars.');
        }
    }
}


function nameConstellation() {
    var constellationName = prompt('Enter a name for your constellation:');
    while (!constellationName) {
        constellationName = prompt('Constellation name cannot be empty. Please enter a name:');
    }

    // Store the constellation data
    var constellation = {
        name: constellationName,
        stars: selectedStars.slice(), // Copy the array
        lines: constellationLines.slice(), // Copy the array
        label: null
    };

    // Add constellation to the array
    constellations.push(constellation);

    // Display the name next to one of the lines
    addConstellationLabel(constellation);

    // Clear the selection for the next constellation
    clearSelection();
}







async function indexjs_setup() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 15000);
    pointer = new THREE.Vector2();
    raycaster = new THREE.Raycaster();
    
    //create the loaders
    textue_loader = new THREE.TextureLoader();
    font_loader = new THREE.FontLoader();
    
    renderer = new THREE.WebGLRenderer({"antialias": true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio( window.devicePixelRatio );
    //enable shadows
    renderer.shadowMap.enabled = true;
    //add to document
    document.body.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    //disable zooming and panning (can only look in different directions)
    controls.enablePan = false;
    controls.enableZoom = false;
    
    //an ambient light
    amb_light = new THREE.AmbientLight(0x909090);
    scene.add(amb_light);
    
    //the hemisphere light
    hemi_light = new THREE.HemisphereLight(0x21266e, 0x080820, 0.2);
    scene.add(hemi_light);
    
    //set camera position
    //camera.position.x = 1;
    //camera.lookAt(-1,0,0);
    camera.position.z = -0.01;

    
    //create the group object
    //the next functions will add objects to it
    sky_group = new THREE.Group();
    console.log("sldkfjls")
    
    //load the stars
    await load_stars();

    // loadConstellations();
    //load the milky way sky sphere
    load_skysphere();

    //add the objects to the scene
    scene.add(sky_group);
    console.log(sky_group)
    
    //add the ground
    // load_ground();

    //rotate whole sky dome to emulate earth on requested lattitude
    //sky_group.rotateOnAxis(unit_i, cur_rot_rad);
    sky_group.rotateOnWorldAxis(unit_i, cur_rot_rad);
    
    animate();
    
    //set the controls' event listener
    // document.getElementById("rot-speed").addEventListener("input", rot_speed_change);
    // document.getElementById("set-lat").addEventListener("click", set_lat_pressed);
    document.addEventListener('mousemove', onPointerMove );
    document.addEventListener('click', onClick );
    window.addEventListener( 'resize', onWindowResize );

    document.getElementById('toggleDrawingModeButton').addEventListener('click', toggleDrawingMode);
    document.getElementById("loadPlanetButton").addEventListener("click", change_planet);

}

//the requested lattitude (default toronto, ON)
//var lat_in_rad = 43.75 / 180 * Math.PI;

var unit_i = new THREE.Vector3(1, 0, 0);
var unit_j = new THREE.Vector3(0, 1, 0);
var unit_k = new THREE.Vector3(0, 0, 1);

//vector pointing to north celestial pole
//this always rotate along with the sky group
var axis_polar = unit_j.clone();
axis_polar.applyAxisAngle(unit_i, cur_rot_rad);

function animate() {
    requestAnimationFrame(animate);
    
    //rotate the sky
    //sky_group.rotateOAxis(unit_j, -rot_speed);
    sky_group.rotateOnWorldAxis(axis_polar, -rot_speed);
    
    controls.update();
    constellations.forEach(constellation => {
        if (constellation.label) {
            constellation.label.lookAt(camera.position);
        }
    });

    
    
    renderer.render(scene, camera);
}

function window_resize() {
    renderer.setSize( window.innerWidth, window.innerHeight );
    camera.aspect = window.innerWidth / window.innerHeight;
}

document.addEventListener("DOMContentLoaded", indexjs_setup);
window.addEventListener('resize', window_resize);
