/**
 * bg-canvas.js — Three.js 3D background for ApexCity
 * Per-section color tinting: pink on non-home pages, teal on home
 */
(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene    = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1a);

  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
  camera.position.z = 800;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, precision: 'lowp' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x0a0f1a, 1);

  // Lights
  scene.add(new THREE.AmbientLight(0x1a2236, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.5);
  dir.position.set(500, 500, 500);
  scene.add(dir);

  const pt1 = new THREE.PointLight(0x1fa5c4, 0.4);
  pt1.position.set(300, 300, 300);
  scene.add(pt1);

  const pt2 = new THREE.PointLight(0xFF69B4, 0.3);
  pt2.position.set(-300, -300, 300);
  scene.add(pt2);

  // Section → light color map
  const SECTION_COLORS = {
    home:          { p1: 0x1fa5c4, p2: 0xd4af37 },
    explore:       { p1: 0xFF69B4, p2: 0x1fa5c4 },
    notifications: { p1: 0xFF69B4, p2: 0xd4af37 },
    messages:      { p1: 0x1fa5c4, p2: 0xFF69B4 },
    bookmarks:     { p1: 0xd4af37, p2: 0xFF69B4 },
    community:     { p1: 0xFF69B4, p2: 0x1fa5c4 },
    settings:      { p1: 0xFF69B4, p2: 0xd4af37 },
  };

  // Shapes
  const shapes = [];
  const COLORS = [0x1fa5c4, 0xFF69B4, 0xd4af37];
  for (let i = 0; i < 10; i++) {
    let geo;
    if (i % 3 === 0)      geo = new THREE.IcosahedronGeometry(120, 4);
    else if (i % 3 === 1) geo = new THREE.OctahedronGeometry(120, 3);
    else                  geo = new THREE.DodecahedronGeometry(100, 2);

    const mat  = new THREE.MeshPhongMaterial({
      color: COLORS[i % COLORS.length],
      wireframe: true,
      emissive: COLORS[i % COLORS.length],
      emissiveIntensity: 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 1800,
      (Math.random() - 0.5) * 1800,
      (Math.random() - 0.5) * 1800
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    const s = 0.7 + Math.random() * 0.6;
    mesh.scale.set(s, s, s);
    scene.add(mesh);
    shapes.push({ mesh, rx: (Math.random()-0.5)*0.003, ry: (Math.random()-0.5)*0.005, rz: (Math.random()-0.5)*0.002 });
  }

  // Particles
  const COUNT = innerWidth > 768 ? 60 : 30;
  const pGeo  = new THREE.BufferGeometry();
  const pPos  = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT * 3; i += 3) {
    pPos[i]   = (Math.random() - 0.5) * 1600;
    pPos[i+1] = (Math.random() - 0.5) * 1600;
    pPos[i+2] = (Math.random() - 0.5) * 1600;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x1fa5c4, size: 5, sizeAttenuation: true, transparent: true, opacity: 0.5 })));

  // Animate
  let raf;
  function animate() {
    raf = requestAnimationFrame(animate);
    shapes.forEach(({ mesh, rx, ry, rz }) => {
      mesh.rotation.x += rx;
      mesh.rotation.y += ry;
      mesh.rotation.z += rz;
    });
    const pos = pGeo.attributes.position.array;
    for (let i = 1; i < COUNT * 3; i += 3) { pos[i] -= 0.08; if (pos[i] < -800) pos[i] = 800; }
    pGeo.attributes.position.needsUpdate = true;
    const t = Date.now() * 0.0005;
    pt1.position.x =  300 + Math.sin(t) * 50;
    pt2.position.x = -300 - Math.sin(t) * 50;
    renderer.render(scene, camera);
  }
  animate();

  // Public: update tint based on active section
  window.setBgSection = function (sectionId) {
    const c = SECTION_COLORS[sectionId] || SECTION_COLORS.home;
    pt1.color.setHex(c.p1);
    pt2.color.setHex(c.p2);
  };

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf); else animate();
  });
})();
