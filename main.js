import * as THREE from 'three';

import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

let camera, scene, renderer, controls;

const objects = [];

let raycaster;

// player movement variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const moveSpeed = 100;
const mass = 100;
const gravity = 9.8;
const jumpSpeed = 300;
let targetSpeed = 100;

const vertex = new THREE.Vector3();
const color = new THREE.Color();

init();
animate();

function init() {

  /*
  BASIC THREE JS SETUP GUIDE

  https://threejs.org/docs/?q=scene#manual/en/introduction/Creating-a-scene
  */

  /*
  SETUP CAMERA

  PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
  fov — Camera frustum vertical field of view.
  aspect — Camera frustum aspect ratio.
  near — Camera frustum near plane.
  far — Camera frustum far plane.

  camera's viewing frustum: https://en.wikipedia.org/wiki/Viewing_frustum
  */
  camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.y = 50;

  /*
  SETUP SCENE

  A scene is a container for the objects you want to render and display.

  you can find scene properties at:
  three.js scene docs: https://threejs.org/docs/?q=scene#api/en/scenes/Scene
  */
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x75C3E0);
  // scene.fog = new THREE.Fog(0xffffff, 0, 750);


  /*
  SETUP LIGHTS

  HemisphereLight( skyColor : Integer, groundColor : Integer, intensity : Float )
  skyColor - (optional) hexadecimal color of the sky. Default is 0xffffff.
  groundColor - (optional) hexadecimal color of the ground. Default is 0xffffff.
  intensity - (optional) numeric value of the light's strength/intensity. Default is 1.

  There are many types of lights, hemisphere light is a
  "light source positioned directly above the scene, with color fading from the sky color to the ground color."
  
  three.js light docs: https://threejs.org/docs/?q=light#api/en/lights/HemisphereLight
  */

  const light = new THREE.HemisphereLight(0x75C3E0, 0x5EC0E1, 2.5);
  // const light = new THREE.AmbientLight(0x404040); // soft white light
  light.position.set(0.5, 1, 0.75);
  scene.add(light);

  /*
  SETUP POINTER LOCK CONTROLS

  PointerLockControls( camera : Camera, domElement : HTMLDOMElement )
  camera: The camera of the rendered scene.
  domElement: The HTML element used for event listeners.

  Essentially, this is a first person camera control that locks the mouse to the center of the screen.
  "It gives you access to raw mouse movement, locks the target of mouse events to a single element, 
  eliminates limits on how far mouse movement can go in a single direction, 
  and removes the cursor from view. 
  It is ideal for first-person 3D games, for example."
  ^ from the official pointer lock api, not three js specific.

  Events
  change
  Fires when the user moves the mouse.

  lock
  Fires when the pointer lock status is "locked" (in other words: the mouse is captured).

  unlock
  Fires when the pointer lock status is "unlocked" (in other words: the mouse is not captured anymore).

  normal pointer lock api: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
  three.js pointer lock controls: https://threejs.org/docs/#examples/en/controls/PointerLockControls

  fun fact: this demo is based off the of pointer controls demo features on the three.js website!
  */

  // create the pointer lock controls object with the camera and the document body and add it to the scene
  controls = new PointerLockControls(camera, document.body);

  const blocker = document.getElementById('blocker');
  const instructions = document.getElementById('instructions');

  // lock the pointer when the user clicks on the menu screen
  instructions.addEventListener('click', function () {

    controls.lock();

  });

  // when the pointer is locked, hide the menu screen
  controls.addEventListener('lock', function () {

    instructions.style.display = 'none';
    blocker.style.display = 'none';

  });

  // when the pointer is unlocked, show the menu screen
  // by default, the pointer is unlocked when the user presses the escape key 
  controls.addEventListener('unlock', function () {

    blocker.style.display = 'block';
    instructions.style.display = '';

  });

  scene.add(controls.getObject());

  // MOVEMENT CONTROLS
  // how we handle movement in the scene with directional keys and the space bar
  function onKeyDown(event) {
    const code = event.code;
    if (code === 'KeyA' || code === 'ArrowLeft') {
      moveLeft = true;
    }
    if (code === 'KeyD' || code === 'ArrowRight') {
      moveRight = true;
    }
    if (code === 'KeyW' || code === 'ArrowUp') {
      moveForward = true;
    }
    if (code === 'KeyS' || code === 'ArrowDown') {
      moveBackward = true;
    }
    if (code === 'Space') {
      isJumping = true;
    }
    if (code === 'ShiftLeft') {
      targetSpeed = moveSpeed * 2.5;
    }
  }

  function onKeyUp(event) {
    const code = event.code;
    if (code === 'KeyA' || code === 'ArrowLeft') {
      moveLeft = false;
    }
    if (code === 'KeyD' || code === 'ArrowRight') {
      moveRight = false;
    }
    if (code === 'KeyW' || code === 'ArrowUp') {
      moveForward = false;
    }
    if (code === 'KeyS' || code === 'ArrowDown') {
      moveBackward = false;
    }
    if (code === 'Space') {
      isJumping = false;
    }
    if (code === 'ShiftLeft') {
      targetSpeed = moveSpeed;
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  /*
  SETUP RAYCASTER

  Raycaster( origin : Vector3, direction : Vector3, near : Float, far : Float )
  origin — The origin vector where the ray casts from.
  direction — The direction vector that gives direction to the ray. Should be normalized.
  near — All results returned are further away than near. Near can't be negative. Default value is 0.
  far — All results returned are closer than far. Far can't be lower than near. Default value is Infinity.

  A raycaster is used to detect intersections between rays and objects.
  The raycaster is used for picking (working out what objects in the 3D space the mouse is over)
  and more advanced tasks like shooting and physics.

  raycasting introduction: https://en.wikipedia.org/wiki/Ray_casting
  */

  // create a raycaster object with an origin and direction vector
  // the origin is the camera position and the direction is a vector pointing down
  // this raycaster is used for collision detection with the objects in the scene and the floor
  // this is used for the player to walk on the floor and objects without falling through them
  // additional raycasts can be created for colliding in other directions with objects

  // IMPORTANT NOTE
  // this gets into the territory of creating a physics engine which is an entirely new ordeal in and of itself
  // two physics engines that seem to be popular are canon.js and ammo.js

  // I recommend we use ammo.js as it is a port of the bullet physics engine which is widely used in the industry
  // https://pybullet.org/wordpress/
  // https://github.com/kripken/ammo.js
  raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0), 0, 10);

  // floor
  let floorGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
  floorGeometry.rotateX(- Math.PI / 2);

  // vertex displacement
  // this is from the demo
  // it just makes the terrain look more interesting with cool colors
  // i tweaked it to be red :)
  let position = floorGeometry.attributes.position;

  for (let i = 0, l = position.count; i < l; i++) {

    vertex.fromBufferAttribute(position, i);

    vertex.x += Math.random() * 20 - 10;
    vertex.y += Math.random() * 2;
    vertex.z += Math.random() * 20 - 10;

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);

  }

  floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices

  position = floorGeometry.attributes.position;
  const colorsFloor = [];

  for (let i = 0, l = position.count; i < l; i++) {

    color.setHSL(Math.random() * 0.01, 0.75, Math.random() * 0.25 + 0.75, THREE.SRGBColorSpace);
    colorsFloor.push(color.r, color.g, color.b);

  }

  floorGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsFloor, 3));

  const floorMaterial = new THREE.MeshBasicMaterial({ flatShading: true, vertexColors: false });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  scene.add(floor);

  // random boxes everywhere
  const boxGeometry = new THREE.BoxGeometry(20, 20, 20).toNonIndexed();

  position = boxGeometry.attributes.position;
  const colorsBox = [];

  // random colors for the boxes
  for (let i = 0, l = position.count; i < l; i++) {

    color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75, THREE.SRGBColorSpace);
    colorsBox.push(color.r, color.g, color.b);

  }

  boxGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsBox, 3));

  // create 1000 boxes with random positions
  for (let i = 0; i < 1000; i++) {

    const boxMaterial = new THREE.MeshPhongMaterial({ specular: 0xffffff, flatShading: true, vertexColors: false });
    boxMaterial.color.setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75, THREE.SRGBColorSpace);

    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.x = Math.floor(Math.random() * 20 - 10) * 20;
    box.position.y = Math.floor(Math.random() * 20) * 20 + 10;
    box.position.z = Math.floor(Math.random() * 20 - 10) * 20;

    scene.add(box);
    objects.push(box);

  }

  // renderer

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //

  window.addEventListener('resize', onWindowResize);

}

// window resize function
function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

// animation loop
function animate() {

  requestAnimationFrame(animate);

  const time = performance.now();

  if (controls.isLocked === true) {

    raycaster.ray.origin.copy(controls.getObject().position);
    raycaster.ray.origin.y -= 30;

    const intersections = raycaster.intersectObjects(objects, false);
    const onObject = intersections.length > 0;

    // DELTA TIME
    // important for smooth movement and physics
    // time elapsed since the last frame
    const deltaTime = (time - prevTime) / 1000;

    // Calculate target velocity based on input
    let targetVelocity = new THREE.Vector3();
    if (moveForward) targetVelocity.z -= targetSpeed;
    if (moveBackward) targetVelocity.z += targetSpeed;
    if (moveLeft) targetVelocity.x += targetSpeed;
    if (moveRight) targetVelocity.x -= targetSpeed;

    // Lerp factor for smoothing the movement
    const lerpFactorX = 0.1;
    const lerpFactorY = 0.01;

    velocity.y -= mass * gravity * deltaTime;

    // Jumping logic remains the same
    if (isJumping && canJump) {
      velocity.y += jumpSpeed;
      canJump = false;
      isJumping = false;
    }

    if (onObject) {
      velocity.y = Math.max(0, velocity.y);
      canJump = true;
    }

    // Gradually move towards the target velocity
    velocity.x = THREE.MathUtils.lerp(velocity.x, targetVelocity.x, lerpFactorX);
    velocity.y = THREE.MathUtils.lerp(velocity.y, targetVelocity.y, lerpFactorY);
    velocity.z = THREE.MathUtils.lerp(velocity.z, targetVelocity.z, lerpFactorX); // Assuming the same lerp factor for z

    controls.moveRight(- velocity.x * deltaTime);
    controls.moveForward(- velocity.z * deltaTime);
    controls.getObject().position.y += (velocity.y * deltaTime); // new behavior

    if (controls.getObject().position.y < 30) {

      velocity.y = 0;
      controls.getObject().position.y = 30;
      canJump = true;

    }

  }

  prevTime = time;

  renderer.render(scene, camera);

}