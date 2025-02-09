import * as THREE from "three";
import { useRef, useEffect } from "react";
import vertexParticles from "./shaders/particles/vertexParticles.glsl";
import fragmentParticles from "./shaders/particles/fragmentParticles.glsl";
import simVertex from "./shaders/fbo/simVertex.glsl";
import simFragment from "./shaders/fbo/simFragment.glsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import load from "load-asset";
import PoissonDiskSampling from "poisson-disk-sampling";

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

  let imageDataArray = null;

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

    fbo.texture.minFilter = THREE.NearestFilter;
    fbo1.texture.minFilter = THREE.NearestFilter;

    fboScene = new THREE.Scene();
    fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const data = new Float32Array(size * size * 4);
    // const canvas = document.createElement("canvas");
    // const ctx = canvas.getContext("2d");

    // const img = new Image();
    // img.src = "/images/Home seq 3.jpg"; // Replace with your image path
    // img.crossOrigin = "anonymous"; // Ensure cross-origin images work

    // img.onload = function () {
    //   canvas.width = size;
    //   canvas.height = size;
    //   ctx.drawImage(img, 0, 0, size, size);
    
    //   const imageData = ctx.getImageData(0, 0, size, size).data;
    //   console.log(imageData);
    
    //   for (let j = 0; j < size; j++) {
    //     for (let i = 0; i < size; i++) {
    //       let index = (i + j * size) * 4;
    //       let pixelIndex = (i + (size - j - 1) * size) * 4; // Flip Y-axis for correct orientation
    
    //       // Normalize positions to [-1, 1] space
    //       let x = (i / size) * 2 - 1;
    //       let y = (j / size) * 2 - 1;
    //       let z = Math.random() * 0.2 - 0.1; // Small random Z offset
    
    //       // Extract RGB values from imageData
    //       let r = imageData[pixelIndex] / 255;
    //       let g = imageData[pixelIndex + 1] / 255;
    //       let b = imageData[pixelIndex + 2] / 255;
    
    //       // Store data (x, y, z, alpha)
    //       data[index + 0] = r; // X
    //       data[index + 1] = g; // Y
    //       data[index + 2] = b; // Z depth
    //       data[index + 3] = 1; // Alpha (opacity)
    //     }
    //   }
    
    //   console.log("Image successfully mapped to data array.");
    // };
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let index = (i + j * size) * 4;
        let theta = Math.random() * Math.PI * 2;
        let r = 0.5 + 0.5 * Math.random();
        ///////////circle
        // data[index + 0] = r * Math.cos(theta);
        // data[index + 1] = r * Math.sin(theta);
        // data[index + 2] = r * Math.sin(theta);
        // data[index + 3] = 1; // Alpha
        /////////// Square distribution: Random positions within a [-0.5, 0.5] range
        // data[index + 0] = Math.random() - 0.5; // X between -0.5 and 0.5
        // data[index + 1] = Math.random() - 0.5; // Y between -0.5 and 0.5
        // data[index + 2] = Math.random() - 0.5; // Z between -0.5 and 0.5
        // data[index + 3] = 1; // Alpha
        ///////////image
        data[index + 0] = i/100;//imageDataArray[index+0]*5;
        data[index + 1] = j/100;//imageDataArray[index+1]*5;
        data[index + 2] = -1*imageDataArray[index+1]*5;//Math.random() - 0.5; // Z between -0.5 and 0.5
        data[index + 3] = imageDataArray[index+2]*5; // Alpha
      }
    }

    const fboTexture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    fboTexture.minFilter = THREE.NearestFilter;
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
    info.minFilter = THREE.NearestFilter;
    info.needsUpdate = true;
    fboMaterial.uniforms.uInfo.value = info;

    const fboMesh = new THREE.Mesh(geometry, fboMaterial);
    fboScene.add(fboMesh);

    renderer.setRenderTarget(fbo);
    renderer.render(fboScene, fboCamera);
    renderer.setRenderTarget(fbo1);
    renderer.render(fboScene, fboCamera);
  }

  function setUpParticles() {
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
  }

  function setupevents() {
    const planeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial()
    );
    planeMesh.visible = false;
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

  async function loadAssets() {
    const image = await load("/images/Home seq 3.jpg");
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d", { willReadFrequently: true });

    canvas.width = size;
    canvas.height = size;

    ctx.drawImage(image, 0, 0, size, size);

    // Corrected line: Pass correct arguments (x, y, width, height)
    let imageData = ctx.getImageData(0, 0, size, size).data;

    imageDataArray = new Array(size).fill().map(() => new Array(size).fill(0));
    for (let i = 0; i < size**2; i++) {
      // for (let j = 0; j < size; j++) {
        let position = i * 4;
        let color = imageData[position] / 255;
        imageDataArray[i] = color;
      //}
    }

    console.log(imageDataArray);

    var pds = new PoissonDiskSampling({
      shape: [1, 1],
      minDistance: 4 / 400,
      maxDistance: 20 / 400,
      tries: 4,
      distanceFunction: function (point) {
        let indX = Math.floor(point[0] * size);
        let indY = Math.floor(point[1] * size);
        return imageDataArray[indX][indY];
      },
      bias: 0,
    });

    let points = pds.fill();
    console.log(points);
  }

  async function initAll() {
    await loadAssets();
    setUpFbo();
    setupevents();
    setUpParticles();
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

    initAll();

    let time = 0;
    function renderLoop() {
      if (material && fboMaterial && fbo && fbo1) {
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
      }
    }

    const animate = () => {
      renderLoop();

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
