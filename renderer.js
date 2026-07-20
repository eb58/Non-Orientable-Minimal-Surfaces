import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { TAU, normalizePointGrids, pointGridsFor } from "./math.js";

const EXPORT_PIXEL_RATIO = 4;
const VIDEO_FPS = 30;

export const createRenderer = ({
  canvas,
  hud,
  getMaterialMode,
  getHammerFactor,
  getSurface,
  getObjectPosition,
  getBackground,
  onObjectPositionChange,
  onViewChange
}) => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  const surfaceGroup = new THREE.Group();
  const animation = { id: 0 };

  const defaultView = () => ({
    camera: [1.95, -3.35, 1.45],
    target: [0, 0, 0]
  });
  const currentView = () => ({
    camera: camera.position.toArray(),
    target: controls.target.toArray()
  });
  const applyView = view => {
    camera.position.fromArray(view.camera);
    controls.target.fromArray(view.target);
    controls.update();
  };

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    metalness: 0,
    roughness: 0.46,
    clearcoat: 0.42,
    clearcoatRoughness: 0.38,
    side: THREE.DoubleSide,
    transparent: false,
    opacity: 1
  });
  const copperMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb76a32,
    metalness: 0.82,
    roughness: 0.31,
    clearcoat: 0.1,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
  });
  const mirrorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xdce8f2,
    metalness: 1.0,
    roughness: 0.04,
    envMap: envTexture,
    envMapIntensity: 3.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    side: THREE.DoubleSide
  });
  const marbleMaterial = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    side: THREE.DoubleSide
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1.0,
    thickness: 0.45,
    ior: 1.38,
    envMap: envTexture,
    envMapIntensity: 0.38,
    side: THREE.DoubleSide
  });
  const iridMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.05,
    transmission: 0.4,
    iridescence: 1.0,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 400],
    envMap: envTexture,
    envMapIntensity: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0,
    side: THREE.DoubleSide
  });
  const bronzeMaterial = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0.75,
    roughness: 0.55,
    clearcoat: 0.12,
    clearcoatRoughness: 0.45,
    side: THREE.DoubleSide
  });
  const goldMaterial = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0.9,
    roughness: 0.35,
    clearcoat: 0.15,
    clearcoatRoughness: 0.3,
    envMap: envTexture,
    envMapIntensity: 1.2,
    side: THREE.DoubleSide
  });
  const emailMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1a3a8f,
    metalness: 0,
    roughness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    side: THREE.DoubleSide
  });
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x172433,
    transparent: true,
    opacity: 0.11
  });

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.4;
  controls.maxDistance = 8;
  controls.enablePan = false;
  controls.autoRotateSpeed = 5;
  const clock = new THREE.Clock();

  scene.add(surfaceGroup);
  scene.add(new THREE.HemisphereLight(0xf5fbff, 0x6b8794, 1.05));
  scene.add(((light) => { light.position.set(-2.6, -3.2, 4.4); return light; })(new THREE.DirectionalLight(0xffffff, 2.05)));
  scene.add(((light) => { light.position.set(3.2, 2.1, 2.5); return light; })(new THREE.DirectionalLight(0x9ee9ff, 0.8)));
  scene.add(((light) => { light.position.set(0.4, -1.2, 3.8); return light; })(new THREE.DirectionalLight(0xfff0c8, 0.9)));

  const surfacePalette = [0x6b1f0a, 0xb84020, 0xe87030, 0xf5b050, 0xfff5b0].map(color => new THREE.Color(color));
  const paletteColor = value => {
    const scaled = THREE.MathUtils.clamp(value, 0, 1) * (surfacePalette.length - 1);
    const index = Math.min(surfacePalette.length - 2, Math.floor(scaled));
    return surfacePalette[index].clone().lerp(surfacePalette[index + 1], scaled - index);
  };

  const colorForPoint = point => {
    const height = THREE.MathUtils.clamp((point[2] + 1) / 2, 0, 1);
    const radial = THREE.MathUtils.clamp(Math.hypot(point[0], point[1]), 0, 1);
    const angle = (Math.atan2(point[1], point[0]) + TAU) / TAU;
    const fold = (Math.sin(angle * TAU * 2 + point[2] * 3) + 1) / 2;
    const value = 0.56 * height + 0.3 * radial + 0.14 * fold;
    return paletteColor(value);
  };

  const marbleTurb = (x, y, z) =>
    Math.abs(Math.sin(4 * x - 3 * z)) * 0.5 +
    Math.abs(Math.sin(9 * y + 5 * x)) * 0.25 +
    Math.abs(Math.sin(15 * z - 7 * y)) * 0.125;
  const marbleBase = new THREE.Color(0xede8e0);
  const marbleVein = new THREE.Color(0x4a4a5c);
  const marbleColorForPoint = ([x, y, z]) => {
    const t = (Math.sin((x + z * 1.5 + marbleTurb(x, y, z) * 6) * Math.PI) + 1) / 2;
    return marbleBase.clone().lerp(marbleVein, t ** 3);
  };

  const bronzeBase = new THREE.Color(0x7c5228);
  const patinaColor = new THREE.Color(0x4a9b7f);
  const bronzeColorForPoint = ([x, y, z]) => {
    const height = THREE.MathUtils.clamp((z + 1) / 2, 0, 1);
    const noise = (Math.sin(x * 7 + z * 5) + Math.sin(y * 11 - x * 3)) * 0.25 + 0.5;
    return bronzeBase.clone().lerp(patinaColor, (height * 0.7 + noise * 0.3) ** 1.5);
  };

  const goldBase = new THREE.Color(0xd4a017);
  const goldHighlight = new THREE.Color(0xfff2b0);
  const goldColorForPoint = ([x, y, z]) => {
    const height = THREE.MathUtils.clamp((z + 1) / 2, 0, 1);
    const noise = (Math.sin(x * 7 + z * 5) + Math.sin(y * 11 - x * 3)) * 0.25 + 0.5;
    return goldBase.clone().lerp(goldHighlight, (height * 0.5 + noise * 0.5) ** 2);
  };

  const colorAttribute = (pointGrids, colorFn = colorForPoint) => new THREE.Float32BufferAttribute(
    pointGrids.flatMap(points => points.flatMap(row => row.flatMap(point => colorFn(point).toArray()))),
    3
  );
  const makeGridIndices = (points, offset = 0) => {
    const columns = points[0].length;
    return points.slice(0, -1).flatMap((row, rowIndex) =>
      row.slice(0, -1).flatMap((_, column) => {
        const p00 = offset + rowIndex * columns + column;
        const p10 = p00 + 1;
        const p01 = p00 + columns;
        const p11 = p01 + 1;
        return [p00, p10, p11, p00, p11, p01];
      })
    );
  };
  const makeIndices = pointGrids => pointGrids.reduce(
    (result, points) => ({
      offset: result.offset + points.length * points[0].length,
      indices: [...result.indices, ...makeGridIndices(points, result.offset)]
    }),
    { offset: 0, indices: [] }
  ).indices;
  const makeGridLinePositions = points => {
    const rowStep = Math.max(1, Math.round((points.length - 1) / 26));
    const columnStep = Math.max(1, Math.round((points[0].length - 1) / 24));
    const horizontal = points
      .filter((_, row) => row % rowStep === 0 || row === points.length - 1)
      .flatMap(row => row.slice(0, -1).flatMap((point, column) => [...point, ...row[column + 1]]));
    const vertical = points[0]
      .filter((_, column) => column % columnStep === 0 || column === points[0].length - 1)
      .flatMap((_, column) => points.slice(0, -1).flatMap((row, rowIndex) => [...row[column], ...points[rowIndex + 1][column]]));
    return [...horizontal, ...vertical];
  };
  const makeLinePositions = pointGrids => pointGrids.flatMap(makeGridLinePositions);
  const hammeredValue = (x, y, z) => {
    const wave = Math.sin(128 * x + 47 * y) + Math.sin(101 * y - 83 * z) + Math.sin(89 * z + 113 * x);
    return Math.max(0, Math.sin(wave * 1.8 + x * 37 - y * 29));
  };
  const hammerGeometry = (geometry, factor = 1) => {
    geometry.computeVertexNormals();
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    Array.from({ length: positions.count }).forEach((_, index) => {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const dent = hammeredValue(x, y, z) ** 2.6;
      const lift = factor * (0.0038 * dent - 0.0013 * (1 - dent));
      positions.setXYZ(index, x + normals.getX(index) * lift, y + normals.getY(index) * lift, z + normals.getZ(index) * lift);
    });
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  };

  const surfaceGeometry = data => {
    const pointGrids = normalizePointGrids(pointGridsFor(data));
    const geometry = new THREE.BufferGeometry();
    const lineGeometry = new THREE.BufferGeometry();
    const materialMode = getMaterialMode();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(pointGrids.flat(3), 3));
    const colorFns = { marble: marbleColorForPoint, bronze: bronzeColorForPoint, gold: goldColorForPoint };
    geometry.setAttribute("color", colorAttribute(pointGrids, colorFns[materialMode] ?? colorForPoint));
    geometry.setIndex(makeIndices(pointGrids));
    geometry.computeVertexNormals();
    hammerGeometry(geometry, getHammerFactor());
    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(makeLinePositions(pointGrids), 3));
    return { geometry, lineGeometry };
  };
  const disposeSurface = () => {
    surfaceGroup.children.forEach(child => child.geometry.dispose());
    surfaceGroup.clear();
  };
  const renderSurface = data => {
    const geometries = surfaceGeometry(data);
    disposeSurface();
    const mats = { copper: copperMaterial, mirror: mirrorMaterial, marble: marbleMaterial, glass: glassMaterial, irid: iridMaterial, bronze: bronzeMaterial, gold: goldMaterial, email: emailMaterial, color: material };
    surfaceGroup.add(new THREE.Mesh(geometries.geometry, mats[getMaterialMode()] ?? material));
    if (getMaterialMode() === "color") surfaceGroup.add(new THREE.LineSegments(geometries.lineGeometry, lineMaterial));
  };

  const setObjectPosition = position => surfaceGroup.position.set(position.x, position.y, position.z);
  const cameraBasis = () => {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    return { right, up };
  };
  const objectDragScale = () => {
    const distance = Math.max(0.1, camera.position.distanceTo(surfaceGroup.position));
    const height = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return height / Math.max(1, canvas.getBoundingClientRect().height);
  };
  const objectDrag = { current: null };
  const touchPointers = new Map();
  const touchCenter = () => [...touchPointers.values()].reduce((center, point) => ({
    x: center.x + point.x / touchPointers.size,
    y: center.y + point.y / touchPointers.size
  }), { x: 0, y: 0 });
  const touchDistance = () => {
    const points = [...touchPointers.values()];
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };
  const stopTouchObjectDrag = event => {
    touchPointers.forEach((_, pointerId) => {
      if (pointerId !== event.pointerId && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    });
    touchPointers.clear();
    objectDrag.current = null;
    controls.enabled = true;
    canvas.classList.remove("dragging-object");
  };
  const startObjectDrag = event => {
    if (event.pointerType === "touch") {
      touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointers.size !== 2 || !getSurface()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      controls._onPointerUp?.({ pointerId: [...touchPointers.keys()][0] });
      touchPointers.forEach((_, pointerId) => canvas.setPointerCapture(pointerId));
      controls.enabled = false;
      canvas.classList.add("dragging-object");
      objectDrag.current = {
        mode: "touch",
        center: touchCenter(),
        start: getObjectPosition(getSurface()),
        scale: objectDragScale(),
        distance: touchDistance(),
        cameraOffset: camera.position.clone().sub(controls.target)
      };
      return;
    }
    if (!event.ctrlKey || !getSurface()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    canvas.setPointerCapture(event.pointerId);
    controls.enabled = false;
    canvas.classList.add("dragging-object");
    objectDrag.current = {
      mode: "mouse",
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      start: getObjectPosition(getSurface()),
      scale: objectDragScale()
    };
  };
  const moveObjectDrag = event => {
    if (event.pointerType === "touch") {
      if (!touchPointers.has(event.pointerId)) return;
      touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (!["touch", "touch-zoom"].includes(objectDrag.current?.mode)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const distance = touchDistance();
      if (Math.abs(distance / objectDrag.current.distance - 1) > 0.04) objectDrag.current.mode = "touch-zoom";
      if (objectDrag.current.mode === "touch-zoom") {
        const zoomScale = THREE.MathUtils.clamp(objectDrag.current.distance / distance, 0.25, 4);
        camera.position.copy(controls.target).addScaledVector(objectDrag.current.cameraOffset, zoomScale);
        camera.lookAt(controls.target);
        onViewChange();
        return;
      }
      const { right, up } = cameraBasis();
      const center = touchCenter();
      const dx = (center.x - objectDrag.current.center.x) * objectDrag.current.scale;
      const dy = (center.y - objectDrag.current.center.y) * objectDrag.current.scale;
      const delta = right.multiplyScalar(dx).add(up.multiplyScalar(-dy));
      onObjectPositionChange({
        x: THREE.MathUtils.clamp(objectDrag.current.start.x + delta.x, -1.5, 1.5),
        y: THREE.MathUtils.clamp(objectDrag.current.start.y + delta.y, -1.5, 1.5),
        z: THREE.MathUtils.clamp(objectDrag.current.start.z + delta.z, -1.5, 1.5)
      });
      return;
    }
    if (!objectDrag.current || event.pointerId !== objectDrag.current.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const { right, up } = cameraBasis();
    const dx = (event.clientX - objectDrag.current.x) * objectDrag.current.scale;
    const dy = (event.clientY - objectDrag.current.y) * objectDrag.current.scale;
    const delta = right.multiplyScalar(dx).add(up.multiplyScalar(-dy));
    onObjectPositionChange({
      x: THREE.MathUtils.clamp(objectDrag.current.start.x + delta.x, -1.5, 1.5),
      y: THREE.MathUtils.clamp(objectDrag.current.start.y + delta.y, -1.5, 1.5),
      z: THREE.MathUtils.clamp(objectDrag.current.start.z + delta.z, -1.5, 1.5)
    });
  };
  const stopObjectDrag = event => {
    if (event.pointerType === "touch") {
      touchPointers.delete(event.pointerId);
      if (["touch", "touch-zoom"].includes(objectDrag.current?.mode)) stopTouchObjectDrag(event);
      return;
    }
    if (!objectDrag.current || event.pointerId !== objectDrag.current.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    objectDrag.current = null;
    controls.enabled = true;
    canvas.classList.remove("dragging-object");
  };

  const drawExportBackground = (context, width, height) => {
    const diagonal = Math.hypot(width, height);
    const linear = context.createLinearGradient(width * 0.12, 0, width * 0.88, height);
    linear.addColorStop(0, "#1f303a");
    linear.addColorStop(0.58, "#101a22");
    linear.addColorStop(1, "#263b46");
    context.fillStyle = linear;
    context.fillRect(0, 0, width, height);
    const glow = context.createRadialGradient(width * 0.44, height * 0.3, 0, width * 0.44, height * 0.3, diagonal * 0.34);
    glow.addColorStop(0, "rgba(132, 169, 182, 0.38)");
    glow.addColorStop(1, "rgba(132, 169, 182, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    const shade = context.createRadialGradient(width * 0.72, height * 0.76, 0, width * 0.72, height * 0.76, diagonal * 0.34);
    shade.addColorStop(0, "rgba(30, 58, 70, 0.55)");
    shade.addColorStop(1, "rgba(30, 58, 70, 0)");
    context.fillStyle = shade;
    context.fillRect(0, 0, width, height);
  };
  const saveImage = fileBase => {
    cancelAnimationFrame(animation.id);
    const exportCanvas = document.createElement("canvas");
    const size = renderer.getSize(new THREE.Vector2());
    const pixelRatio = renderer.getPixelRatio();
    const aspect = camera.aspect;
    hud.style.visibility = "hidden";
    renderer.setPixelRatio(EXPORT_PIXEL_RATIO);
    renderer.setSize(size.x, size.y, false);
    camera.aspect = size.x / size.y;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const context = exportCanvas.getContext("2d");
    drawExportBackground(context, exportCanvas.width, exportCanvas.height);
    context.drawImage(canvas, 0, 0);
    const dataURL = exportCanvas.toDataURL("image/png");
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(size.x, size.y, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    hud.style.visibility = "";
    animate();
    const link = document.createElement("a");
    link.download = `${fileBase}-${EXPORT_PIXEL_RATIO}x.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const backgroundImageCache = new Map();
  const loadBackgroundImage = id => {
    if (!backgroundImageCache.has(id)) {
      const image = new Image();
      image.src = new URL(`./backgrounds/background-${id}.png`, import.meta.url).href;
      backgroundImageCache.set(id, image);
    }
    return backgroundImageCache.get(id);
  };
  const drawCover = (context, image, width, height) => {
    if (!image.complete || !image.naturalWidth) return false;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    return true;
  };
  const recording = { recorder: null, context: null, width: 0, height: 0 };
  const isRecording = () => recording.recorder?.state === "recording";
  const drawRecordingFrame = () => {
    const { context, width, height } = recording;
    if (!drawCover(context, loadBackgroundImage(getBackground()), width, height)) {
      context.fillStyle = "#101a22";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height);
  };
  const evenify = value => value - (value % 2);
  const recordingSize = targetLongEdge => {
    const longEdge = Number(targetLongEdge) || Math.max(canvas.width, canvas.height);
    const aspect = canvas.width / canvas.height;
    return aspect >= 1
      ? [evenify(Math.round(longEdge)), evenify(Math.round(longEdge / aspect))]
      : [evenify(Math.round(longEdge * aspect)), evenify(Math.round(longEdge))];
  };
  const startRecording = (fileBase, targetLongEdge) => {
    if (isRecording()) return;
    const [width, height] = recordingSize(targetLongEdge);
    const recordCanvas = document.createElement("canvas");
    recordCanvas.width = width;
    recordCanvas.height = height;
    recording.context = recordCanvas.getContext("2d");
    recording.width = width;
    recording.height = height;
    const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
      .find(type => MediaRecorder.isTypeSupported(type)) || "";
    const mediaRecorder = new MediaRecorder(recordCanvas.captureStream(VIDEO_FPS), mimeType ? { mimeType } : undefined);
    const chunks = [];
    mediaRecorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    mediaRecorder.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: mediaRecorder.mimeType || "video/webm" }));
      const link = document.createElement("a");
      link.download = `${fileBase}.webm`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };
    recording.recorder = mediaRecorder;
    mediaRecorder.start();
  };
  const stopRecording = () => isRecording() && recording.recorder.stop();

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const animate = () => {
    animation.id = requestAnimationFrame(animate);
    controls.update(clock.getDelta());
    renderer.render(scene, camera);
    if (isRecording()) drawRecordingFrame();
  };
  const setAutoRotate = enabled => { controls.autoRotate = enabled; };

  controls.addEventListener("change", onViewChange);
  canvas.addEventListener("pointerdown", startObjectDrag, { capture: true });
  canvas.addEventListener("pointermove", moveObjectDrag, { capture: true });
  canvas.addEventListener("pointerup", stopObjectDrag, { capture: true });
  canvas.addEventListener("pointercancel", stopObjectDrag, { capture: true });
  new ResizeObserver(resize).observe(canvas);

  return {
    applyView, currentView, defaultView, renderSurface, resize, animate, saveImage,
    setObjectPosition, setAutoRotate, startRecording, stopRecording, isRecording
  };
};
