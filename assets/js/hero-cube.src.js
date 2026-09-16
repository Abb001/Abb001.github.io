// Source for the hero glass cube. This is bundled (with three.js tree-shaken
// in) to assets/js/hero-cube.js — the site loads the bundle, not this file.
//
// Rebuild after editing:
//   npm install three esbuild
//   npx esbuild assets/js/hero-cube.src.js --bundle --minify --format=esm \
//     --target=es2019 --outfile=assets/js/hero-cube.js
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

var MIN_WIDTH = 640;
var TEXT_CANVAS_W = 2048;
var TEXT_CANVAS_H = 1024;
// Plane keeps the 2:1 aspect of the texture (so the text is never stretched)
// and is large enough to cover the camera frustum at its depth, so its edges
// stay off-screen.
var PLANE_W = 15;
var PLANE_H = 7.5;
var PLANE_Z = -3;

function wrapLines(ctx, text, maxWidth) {
  var words = text.split(/\s+/);
  var lines = [];
  var line = '';
  for (var i = 0; i < words.length; i++) {
    var attempt = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(attempt).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = attempt;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Draws the headline into a canvas so the text lives *inside* the 3D scene —
// that is what lets the glass actually refract it. HTML sitting behind the
// canvas would only ever be overlaid, never refracted.
//
// The background colour is baked into the same texture so the plane can be
// fully opaque: three.js only captures opaque objects into the transmission
// render target, so a transparent plane would be invisible to the glass.
function makeTextTexture(text, color, backdropColor) {
  var canvas = document.createElement('canvas');
  canvas.width = TEXT_CANVAS_W;
  canvas.height = TEXT_CANVAS_H;
  var ctx = canvas.getContext('2d');

  ctx.fillStyle = backdropColor;
  ctx.fillRect(0, 0, TEXT_CANVAS_W, TEXT_CANVAS_H);

  var fontSize = 112;
  ctx.font = '500 ' + fontSize + 'px Fraunces, Georgia, serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  var lines = wrapLines(ctx, text, TEXT_CANVAS_W * 0.62);
  var lineHeight = fontSize * 1.18;
  var startY = TEXT_CANVAS_H / 2 - ((lines.length - 1) * lineHeight) / 2;
  for (var i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], TEXT_CANVAS_W / 2, startY + i * lineHeight);
  }

  var texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function supportsWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch (e) {
    return false;
  }
}

function build(canvas, text, textColor, backdropColor) {
  var renderer = new WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;

  var scene = new Scene();
  var camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Environment map. Without this the glass reads as flat grey jelly — nearly
  // all of the "rendered" look comes from what the surface reflects.
  var pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  var textPlane = new Mesh(
    new PlaneGeometry(PLANE_W, PLANE_H),
    new MeshBasicMaterial({
      map: makeTextTexture(text, textColor, backdropColor),
      // Opaque so the transmission pass picks it up, and un-tone-mapped so the
      // baked backdrop matches the CSS hero background exactly (ACES would
      // otherwise shift it and leave a visible canvas rectangle).
      toneMapped: false,
    })
  );
  textPlane.position.z = PLANE_Z;
  scene.add(textPlane);

  var cube = new Mesh(
    new BoxGeometry(2.5, 2.5, 2.5),
    new MeshPhysicalMaterial({
      transmission: 1,
      thickness: 1.6,
      ior: 1.52,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    })
  );
  // Centred and large, matching the reference. This does sit over the middle
  // of the headline — the full text stays available to screen readers via the
  // visually-hidden <h1>, and to everyone on the fallback paths below.
  scene.add(cube);

  var restX = -0.28;
  var restY = 0.38;
  // Drift speeds (rad/sec) are deliberately not a simple ratio of each other,
  // so the combined orientation takes a very long time to repeat and the idle
  // motion never reads as a looping animation.
  var DRIFT_X = 0.055;
  var DRIFT_Y = 0.13;
  var IDLE_MS = 2000;

  // Split into a drifting base (only advances while idle) plus a pointer
  // offset. Keeping them separate means handing control back and forth never
  // makes the cube unwind accumulated turns.
  var baseX = restX;
  var baseY = restY;
  var offsetX = 0;
  var offsetY = 0;
  var lastPointerAt = -Infinity;
  cube.rotation.x = restX;
  cube.rotation.y = restY;

  document.addEventListener('pointermove', function (e) {
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    var ny = (e.clientY / window.innerHeight) * 2 - 1;
    offsetY = nx * 0.7;
    offsetX = -ny * 0.5;
    lastPointerAt = performance.now();
  });

  function resize() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  var prevTime = null;
  renderer.setAnimationLoop(function (time) {
    var dt = prevTime === null ? 0 : Math.min((time - prevTime) / 1000, 0.1);
    prevTime = time;

    if (time - lastPointerAt > IDLE_MS) {
      baseX += DRIFT_X * dt;
      baseY += DRIFT_Y * dt;
    }

    var targetX = baseX + offsetX;
    var targetY = baseY + offsetY;
    cube.rotation.x += (targetX - cube.rotation.x) * 0.05;
    cube.rotation.y += (targetY - cube.rotation.y) * 0.05;
    renderer.render(scene, camera);
  });
}

function start() {
  var canvas = document.querySelector('.hero-cube-canvas');
  var hero = document.querySelector('.hero');
  var title = document.querySelector('.hero-title');
  if (!canvas || !hero || !title) return;

  // Progressive enhancement: the HTML headline stays visible unless the scene
  // actually initialises, so no-WebGL / small-screen / reduced-motion visitors
  // still get the hero text.
  if (!supportsWebGL()) return;
  if (window.innerWidth < MIN_WIDTH) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var styles = getComputedStyle(hero);
  var textColor = styles.getPropertyValue('--ink').trim() || '#eef2f6';
  var backdropColor = styles.getPropertyValue('--cream').trim() || '#10151d';

  // Reveal the canvas before building: it is display:none until now, so it has
  // no layout size yet and the renderer would size itself to the 300x150
  // default. Roll the class back if the scene fails, so the headline returns.
  hero.classList.add('cube-active');
  try {
    build(canvas, title.textContent.trim(), textColor, backdropColor);
  } catch (err) {
    hero.classList.remove('cube-active');
  }
}

// Wait for webfonts so the canvas text is drawn in Fraunces, not the fallback.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(start);
} else {
  start();
}
