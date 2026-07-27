import * as THREE from 'three';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root not found');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#fff7ed');

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0.2, 7.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.className = 'game-canvas';
renderer.domElement.setAttribute('aria-label', 'แตะก้อนขนมปังเพื่อบีบ');
app.appendChild(renderer.domElement);

const ambientLight = new THREE.HemisphereLight('#fffaf2', '#d9a875', 2.2);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight('#fff4df', 3.2);
keyLight.position.set(-3, 5, 5);
keyLight.castShadow = true;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight('#ffd2a3', 1.1);
fillLight.position.set(4, 1, 2);
scene.add(fillLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(2.25, 64),
  new THREE.MeshBasicMaterial({ color: '#f5d6b2', transparent: true, opacity: 0.35 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.65;
floor.scale.set(1, 0.28, 1);
scene.add(floor);

const bread = createBread();
scene.add(bread);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pressCount = 0;
let isPressing = false;
let targetSquish = new THREE.Vector3(1, 1, 1);
let targetIndent = new THREE.Vector3();
const indent = new THREE.Vector3();

const setCount = () => {
  const countElement = document.querySelector<HTMLSpanElement>('#press-count');
  if (countElement) countElement.textContent = String(pressCount);
};

renderer.domElement.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  renderer.domElement.setPointerCapture(event.pointerId);
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.intersectObject(bread, true).length === 0) return;

  isPressing = true;
  pressCount += 1;
  setCount();
  targetSquish.set(1.13, 0.74, 1.13);
  targetIndent.set(pointer.x * 0.32, pointer.y * 0.32, 0.18);
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!isPressing) return;
  event.preventDefault();
  updatePointer(event);
  targetIndent.set(pointer.x * 0.32, pointer.y * 0.32, 0.18);
});

const releaseBread = (event: PointerEvent) => {
  event.preventDefault();
  isPressing = false;
  targetSquish.set(1, 1, 1);
  targetIndent.set(0, 0, 0);
};
renderer.domElement.addEventListener('pointerup', releaseBread);
renderer.domElement.addEventListener('pointercancel', releaseBread);
renderer.domElement.addEventListener('pointerleave', (event) => { if (isPressing) releaseBread(event); });

function updatePointer(event: PointerEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function createBread() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.18, -0.85);
  shape.bezierCurveTo(-1.3, -0.3, -1.22, 0.4, -0.82, 0.78);
  shape.bezierCurveTo(-0.4, 1.2, 0.4, 1.2, 0.82, 0.78);
  shape.bezierCurveTo(1.22, 0.4, 1.3, -0.3, 1.18, -0.85);
  shape.bezierCurveTo(0.7, -1.15, -0.7, -1.15, -1.18, -0.85);

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.05, bevelEnabled: true, bevelSegments: 8, steps: 3, bevelSize: 0.22, bevelThickness: 0.22, curveSegments: 24 });
  geometry.center();
  geometry.rotateX(-0.06);
  const material = new THREE.MeshStandardMaterial({ color: '#e7a05b', roughness: 0.82, metalness: 0, flatShading: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.05;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'soft-bread';
  return mesh;
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function animate() {
  requestAnimationFrame(animate);
  bread.scale.lerp(targetSquish, isPressing ? 0.22 : 0.08);
  indent.lerp(targetIndent, isPressing ? 0.18 : 0.1);
  bread.position.x = indent.x;
  bread.position.y = 0.05 + indent.y;
  bread.rotation.z = -indent.x * 0.08;
  bread.rotation.x = -0.06 + indent.y * 0.05;
  renderer.render(scene, camera);
}

app.insertAdjacentHTML('beforeend', `
  <main class="hud">
    <header class="topbar">
      <div><p class="eyebrow">SOFT &amp; WARM</p><h1>Squishy<br /><span>Bread</span></h1></div>
      <div class="counter" aria-live="polite"><span id="press-count">0</span><small>บีบแล้ว</small></div>
    </header>
    <div class="hint"><span class="hand">✦</span><span>แตะที่ขนมปัง<br /><b>แล้วรู้สึกถึงความนุ่ม</b></span></div>
    <footer><span class="dot"></span> พร้อมให้บีบแล้ว</footer>
  </main>
`);

window.addEventListener('resize', resize);
resize();
animate();
