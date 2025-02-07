import * as THREE from "three";
import { useRef, useEffect } from "react";
import vertexParticles from "./shaders/particles/vertexParticles.glsl";
import fragmentParticles from "./shaders/particles/fragmentParticles.glsl";
import simVertex from "./shaders/fbo/simVertex.glsl";
import simFragment from "./shaders/fbo/simFragment.glsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default function App() {
  const canvasRef = useRef(null);
  let fboScene, fboCamera, fboMaterial;
  let fbo, fbo1; // Ping-pong buffers
  let renderer;
  let camera;
  let scene;

  const size = 256;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let material = null;

  function getRenderTarget() {
    return new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
  }

  function setUpFbo() {
    fbo = getRenderTarget();
    fbo1 = getRenderTarget();

    fbo.texture.encoding = THREE.NearestFilter;
    fbo1.texture.encoding = THREE.NearestFilter;

    fboScene = new THREE.Scene();
    fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const data = new Float32Array(size * size * 4);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let index = (i + j * size) * 4;
        let theta = Math.random() * Math.PI * 2;
        let r = 0.5 + 0.5 * Math.random();
        data[index + 0] = r * Math.cos(theta);
        data[index + 1] = r * Math.sin(theta);
        data[index + 2] = 0;
        data[index + 3] = 1; // Alpha
      }
    }

    const fboTexture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    fboTexture.encoding = THREE.NearestFilter;
    fboTexture.encoding = THREE.NearestFilter;
    fboTexture.needsUpdate = true;

    fboMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPosition: { value: fboTexture }, // Initialize with DataTexture
        uInfo: { value: null },
        time: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: simVertex,
      fragmentShader: simFragment,
    });

    const infoArray = new Float32Array(size * size * 4);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let index = (i + j * size) * 4;
        infoArray[index + 0] = 0.5 + Math.random();
        infoArray[index + 1] = 0.5 + Math.random();
        infoArray[index + 2] = 1.0; //0.5 + Math.random();
        infoArray[index + 3] = 1.0; // Alpha
      }
    }

    const info = new THREE.DataTexture(
      infoArray,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    info.encoding = THREE.NearestFilter;
    info.encoding = THREE.NearestFilter;
    info.needsUpdate = true;
    fboMaterial.uniforms.uInfo.value = info;

    const fboMesh = new THREE.Mesh(geometry, fboMaterial);
    fboScene.add(fboMesh);

    renderer.setRenderTarget(fbo);
    renderer.render(fboScene, fboCamera);
    renderer.setRenderTarget(fbo1);
    renderer.render(fboScene, fboCamera);
  }

  function setupevents() {
    const planeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial()
    );
    scene.add(planeMesh);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    scene.add(ball);

    //planeMesh.rotation.x = Math.PI /180 *90;
    document.addEventListener("pointermove", (event) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(planeMesh);
      if (intersects.length > 0) {
        let { x, y } = intersects[0].point;
        fboMaterial.uniforms.uMouse.value.set(x, y);

        ball.position.set(x, y, 0);
      }
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    renderer = new THREE.WebGLRenderer({ canvas });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.setClearColor(new THREE.Color(0x000000));
    scene.background = new THREE.Color(0x000000);

    camera.position.z = 5;
    const controls = new OrbitControls(camera, renderer.domElement);

    setUpFbo();
    setupevents();

    // Particle System
    const count = size ** 2;
    let geometry = new THREE.BufferGeometry();
    let positions = new Float32Array(count * 3);
    let uv = new Float32Array(count * 2);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let index = j + i * size;

        positions[index * 3 + 0] = j / size;
        positions[index * 3 + 1] = Math.random();
        positions[index * 3 + 2] = i / size;

        uv[index * 2 + 0] = j / size;
        uv[index * 2 + 1] = i / size;
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

    material = new THREE.ShaderMaterial({
      uniforms: {
        uPosition: { value: fbo.texture }, // Initially use fbo texture
        time: { value: 0 },
      },
      vertexShader: vertexParticles,
      fragmentShader: fragmentParticles,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let time = 0;

    const animate = () => {
      time += 0.05;
      material.uniforms.time.value = time;
      fboMaterial.uniforms.time.value = time;

      // Render to FBO (Ping-Pong Buffering)
      fboMaterial.uniforms.uPosition.value = fbo1.texture;
      material.uniforms.uPosition.value = fbo.texture;

      renderer.setRenderTarget(fbo);
      renderer.render(fboScene, fboCamera);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      // Swap FBOs
      [fbo, fbo1] = [fbo1, fbo];

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      controls.dispose(); // Prevent memory leaks
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef}></canvas>;
}
