import * as THREE from "three";
import { useRef, useEffect } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import load from "load-asset";

import vertexParticles from "./shaders/particles/vertexParticles.glsl";
import fragmentParticles from "./shaders/particles/fragmentParticles.glsl";
import simVertex from "./shaders/fbo/simVertex.glsl";
import simFragment from "./shaders/fbo/simFragment.glsl";

const size = 1024;

export default function App() {
  const canvasRef = useRef(null);

  // Core Three.js references
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();

  // Scene Elements
  let scene, camera, renderer, controls;
  let fboScene, fboCamera;

  // Framebuffers
  let fbo, fbo1, fboInfo, fboInfo1;

  // Materials
  let material = null;
  let fboMaterial = null;

  // Textures
  let colorTexture = null;

  // Raw Data Buffers
  let data, imageDataArray, imageColorArray, imageData, infoArray;

  let gltfLoader = new GLTFLoader();

  let abstractModel = null;
  let abstractModel_clone = null;
  let matcapImage = null;

  let textures = {};

  /**
   * Utility Functions
   */
  const getRenderTarget = () => {
    return new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
  };

  const loadAssets = async (src) => {
    const image = await load(src);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(image, 0, 0, size, size);

    imageData = ctx.getImageData(0, 0, size, size).data;
    imageDataArray = new Float32Array(size * size * 4);
    imageColorArray = new Float32Array(size * size * 4);

    // for (let i = 0; i < imageData.length; i++) {
    //   const norm = imageData[i] / 255;
    //   imageColorArray[i] = norm;
    //   imageDataArray[i] = norm / 5;
    // }
    for (let i = 0; i < imageData.length; i += 4) {
      const j = imageData.length - 4 - i; // reversed pixel index (not channel)

      for (let k = 0; k < 4; k++) {
        const norm = imageData[i + k] / 255;
        imageColorArray[j + k] = norm;
        imageDataArray[j + k] = norm / 5;
      }
    }
  };

  /**
   * FBO Setup
   */
  const setUpFBOs = () => {
    fbo = getRenderTarget();
    fbo1 = getRenderTarget();
    fboInfo = getRenderTarget();
    fboInfo1 = getRenderTarget();

    fboScene = new THREE.Scene();
    fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);

    // Position texture
    data = new Float32Array(size * size * 4);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let index = (i + j * size) * 4;
        data[index + 0] = i / 100;
        data[index + 1] = j / 100;
        data[index + 2] = -1 * imageDataArray[index + 0] * 50;
        data[index + 3] = imageDataArray[index + 1] * 50;
      }
    }

    const fboTexture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    fboTexture.needsUpdate = true;

    colorTexture = new THREE.DataTexture(
      imageColorArray,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    colorTexture.needsUpdate = true;

    fboMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPosition: { value: fboTexture },
        uColor: { value: colorTexture },
        uInfo: { value: null },
        time: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uGravityBool: { value: true },
      },
      vertexShader: simVertex,
      fragmentShader: simFragment,
    });

    // Info texture
    infoArray = new Float32Array(size * size * 4);
    for (let i = 0; i < infoArray.length; i += 4) {
      infoArray[i + 0] = 0.5 + Math.random();
      infoArray[i + 1] = 0.5 + Math.random();
      infoArray[i + 2] = 1.0;
      infoArray[i + 3] = 1.0;
    }

    const infoTexture = new THREE.DataTexture(
      infoArray,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    infoTexture.needsUpdate = true;
    fboMaterial.uniforms.uInfo.value = infoTexture;

    const fboMesh = new THREE.Mesh(geometry, fboMaterial);
    fboScene.add(fboMesh);

    [fbo, fbo1, fboInfo, fboInfo1].forEach((rt) => {
      renderer.setRenderTarget(rt);
      renderer.render(fboScene, fboCamera);
    });

    renderer.setRenderTarget(null);
  };

  /**
   * Set up particle system
   */
  const setUpParticles = () => {
    const count = size * size;
    const positions = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = j + i * size;
        positions.set([j / size, Math.random(), i / size], index * 3);
        uvs.set([j / size, i / size], index * 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    material = new THREE.ShaderMaterial({
      uniforms: {
        uPosition: { value: fbo.texture },
        uColor: { value: colorTexture },
        time: { value: 0 },
        uGravityBool: { value: true },
        uInfo: { value: fboInfo.texture },
      },
      vertexShader: vertexParticles,
      fragmentShader: fragmentParticles,
      transparent: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
  };

  /**
   * Mouse interaction events
   */
  const setUpMouseEvents = () => {
    const invisiblePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    scene.add(invisiblePlane);

    document.addEventListener("pointermove", (event) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

      console.log(`Pointer: ${pointer.x}, ${pointer.y}`);
      camera.position.set(pointer.x * 5 + 5, pointer.y * 5 + 5, 15);
      camera.lookAt(5, 5, -5);

      raycaster.setFromCamera(pointer, camera);
      const [intersect] = raycaster.intersectObject(invisiblePlane);
      if (intersect) {
        const { x, y } = intersect.point;
        fboMaterial.uniforms.uMouse.value.set(x, y);
      }
    });
  };

  const updateInfoFromImage = () => {
    for (let i = 0; i < size * size * 4; i += 4) {
      infoArray[i + 0] = ((i / 4) % size) / 100;
      infoArray[i + 1] = Math.floor(i / 4 / size) / 100;
      infoArray[i + 2] = -1 * imageDataArray[i + 0] * 50;
      infoArray[i + 3] = imageDataArray[i + 1] * 50;
    }

    const info = new THREE.DataTexture(
      infoArray,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    info.needsUpdate = true;

    colorTexture = new THREE.DataTexture(
      imageColorArray,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    colorTexture.needsUpdate = true;

    fboMaterial.uniforms.uInfo.value = info;
    material.uniforms.uInfo.value = info;
    material.uniforms.uColor.value = colorTexture;
  };

  /**
   * Initialization
   */
  const initThreeJS = (canvas) => {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000);
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.001,
      100
    );
    camera.position.set(5, 5, 15);

    // controls = new OrbitControls(camera, renderer.domElement);
    // controls.target.set(5, 5, -5);
    // controls.update();

    scene.add(new THREE.AmbientLight(0xffffff, 5));
  };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.ImageLoader();
      loader.load(
        src,
        (image) => resolve(image),
        undefined,
        (err) => reject(err)
      );
    });
  }

  const loader = new THREE.TextureLoader();
  function loadTexture(src) {
    return new Promise((resolve, reject) => {
      loader.load(
        src,
        (texture) => resolve(texture),
        undefined,
        (err) => reject(err)
      );
    });
  }

  function extractTileFromImage(
    image,
    col,
    row,
    totalCols = 10,
    totalRows = 2
  ) {
    const tileWidth = image.width / totalCols;
    const tileHeight = image.height / totalRows;

    const canvas = document.createElement("canvas");
    canvas.width = tileWidth;
    canvas.height = tileHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      image,
      col * tileWidth,
      row * tileHeight,
      tileWidth,
      tileHeight,
      0,
      0,
      tileWidth,
      tileHeight
    );

    const matcapTexture = new THREE.CanvasTexture(canvas);
    matcapTexture.needsUpdate = true;

    return matcapTexture;
  }

  function setupModel() {
    gltfLoader.load("/models/abstract_art.glb", (gltf) => {
      abstractModel = gltf.scene;
      abstractModel.position.set(-8, 5, -15);
      abstractModel.scale.set(5, 5, 5);

      //abstractModel_clone = abstractModel.clone();
      //abstractModel_clone.position.set(10, 5, 0);
      //abstractModel_clone.scale.set(2, 2, 2);

      // Step 1: Load the matcap atlas image once
      loadImage("/images/textures/matcap-combined-resized.jpg").then(
        async (image) => {
          matcapImage = image;
          // Step 2: Choose a tile (you can change this dynamically later)
          const matcapTexture = extractTileFromImage(image, 0, 0);

          // Await the texture loading
          const [bumpMap, displacementMap] = await Promise.all([
            loadTexture("/images/textures/bump.png"),
            loadTexture("/images/textures/bump.png"),
          ]);

          textures = { bumpMap, displacementMap };

          const material = new THREE.MeshMatcapMaterial({
            matcap: matcapTexture,
            bumpMap: textures.bumpMap,
            displacementMap: textures.displacementMap,
            displacementScale: 0.05,
          });

          abstractModel.traverse((child) => {
            if (child.isMesh) {
              child.material = material;
            }
          });

          //abstractModel_clone.traverse((child) => {
          //  if (child.isMesh) {
          //    child.material = material;
          //  }
          //});

          scene.add(abstractModel);
          //scene.add(abstractModel_clone);
        }
      );
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    initThreeJS(canvas);

    (async () => {
      await loadAssets("/36o website/previews/Home seq 3.jpg");
      setUpFBOs();
      setUpParticles();
      setUpMouseEvents();
      setupModel();
    })();

    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);

      if (!material || !fboMaterial) return;

      time += 0.05;
      fboMaterial.uniforms.time.value = time;
      material.uniforms.time.value = time;

      fboMaterial.uniforms.uPosition.value = fbo1.texture;

      renderer.setRenderTarget(fbo);
      renderer.render(fboScene, fboCamera);

      material.uniforms.uPosition.value = fbo.texture;

      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      [fbo, fbo1] = [fbo1, fbo];
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const imagesSrc = [
      "/images/MANDALA/1.jpg",
      "/images/MANDALA/2.jpg",
      "/images/MANDALA/3.jpg",
      "/images/MANDALA/4.jpg",
      "/images/MANDALA/5.jpg",
      "/images/MANDALA/6.jpg",
      "/images/MANDALA/7.jpg",
      "/images/MANDALA/8.jpg",
    ];

    let image_index = 0;
    let gravityTimeout = null;
    let matcapColumn = 0;
    let matcapRow = 0;

    function updateMatcapTexture(matcapColumn, matcapRow) {
      if (!matcapImage) return;

      //switch model material
      const matcapTexture = extractTileFromImage(
        matcapImage,
        matcapColumn,
        matcapRow
      );

      const materialnew = new THREE.MeshMatcapMaterial({
        matcap: matcapTexture,
        bumpMap: textures.bumpMap,
        displacementMap: textures.displacementMap,
        displacementScale: 0.05,
      });

      abstractModel.traverse((child) => {
        if (child.isMesh) {
          child.material = materialnew;
        }
      });
      //abstractModel_clone.traverse((child) => {
      //  if (child.isMesh) {
      //    child.material = materialnew;
      //  }
      //});
    }

    const handleClick = async () => {
      await loadAssets(imagesSrc[image_index]);
      image_index = (image_index + 1) % imagesSrc.length;
      updateInfoFromImage();

      material.uniforms.uGravityBool.value = false;
      fboMaterial.uniforms.uGravityBool.value = false;

      if (gravityTimeout) {
        clearTimeout(gravityTimeout);
      }

      if (abstractModel) {
        gravityTimeout = setTimeout(() => {
          material.uniforms.uGravityBool.value = true;
          fboMaterial.uniforms.uGravityBool.value = true;
        }, 2000);

        matcapColumn = (matcapColumn + 1) % 10;
        if (matcapColumn === 0) {
          matcapRow = (matcapRow + 1) % 2;
        }
        updateMatcapTexture(matcapColumn, matcapRow);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("dblclick", handleClick);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("dblclick", handleClick);
      //controls.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef}></canvas>;
}
