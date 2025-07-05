import * as THREE from "three";
import { useRef, useEffect } from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import load from "load-asset";

import vertexParticles from "./shaders/particles/vertexParticles.glsl";
import fragmentParticles from "./shaders/particles/fragmentParticles.glsl";
import simVertex from "./shaders/fbo/simVertex.glsl";
import simFragment from "./shaders/fbo/simFragment.glsl";

import { gsap } from "gsap";
import { CustomWiggle } from "gsap/CustomWiggle";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);
gsap.registerPlugin(CustomWiggle);

const size = 1024;

export default function App() {
  const canvasRef = useRef(null);

  // Core Three.js references
  //const pointer = new THREE.Vector2();
  const pointerRef = useRef(new THREE.Vector2());
  const raycaster = new THREE.Raycaster();
  const raycasterForIcons = new THREE.Raycaster();
  let cursorSphere = null;

  // Scene Elements
  let scene, camera, renderer, controls;
  let fboScene, fboCamera;
  const cameraRef = useRef(null);

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

  // Models
  let iconModel = null;
  let abstractModel = null;
  let abstractModel_clone = null;
  let matcapImage = null;

  let textures = {};

  const cameraInitialAnimationRef = useRef(false);

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
        imageDataArray[j + k] = -norm / 5;
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
        data[index + 2] = -1 * imageDataArray[index + 0] * 50 - 10;
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
        uOldColor: { value: colorTexture },
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
        uOldColor: { value: colorTexture },
        time: { value: 0 },
        uGravityBool: { value: true },
        uInfo: { value: fboInfo.texture },
      },
      vertexShader: vertexParticles,
      fragmentShader: fragmentParticles,
      transparent: true,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
  };

  /**
   * Mouse interaction events
   */

  function updateTextureScale(object) {
    if (object.isMesh) {
      console.log(object.material);
      const texture = object.material.map;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      const scale = 1;

      //animate
      let textureScale = { x: 10, y: 10 };
      gsap.to(textureScale, {
        x: scale,
        y: scale,
        duration: 1,
        // ease: CustomEase.create(
        //   "custom",
        //   "M0,0,C0.14,0,0.242,0.438,0.272,0.561,0.313,0.728,0.354,0.963,0.362,1,0.37,0.985,0.414,0.873,0.455,0.811,0.51,0.726,0.573,0.753,0.586,0.762,0.662,0.812,0.719,0.981,0.726,0.998,0.788,0.914,0.84,0.936,0.859,0.95,0.878,0.964,0.897,0.985,0.911,0.998,0.922,0.994,0.939,0.984,0.954,0.984,0.969,0.984,1,1,1,1"
        // ),
        //ease: "bounce.out",
        ease: "power2.inOut",
        // ease: CustomWiggle.create("myWiggle", {
        //   wiggles: 10,
        // }),
        onStart: () => {},
        onUpdate: () => {
          texture.repeat.set(textureScale.x, textureScale.y);
          texture.offset.set(
            -(textureScale.x - 1) / 2,
            -(textureScale.y - 1) / 2
          ); // i.e., (-1.5, -1.5)
          texture.needsUpdate = true;
        },
      });
    }
  }

  const setUpMouseEvents = () => {
    const invisiblePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    invisiblePlane.position.set(0, 0, -50);
    scene.add(invisiblePlane);
    // const box = new THREE.BoxHelper(invisiblePlane, 0xffff00);
    // scene.add(box);

    cursorSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    scene.add(cursorSphere);

    const cameraZPos = 4;

    document.addEventListener("pointermove", (event) => {
      pointerRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      if (!cameraInitialAnimationRef.current) {
        cameraRef.current.position.set(
          pointerRef.current.x * 2 + 5,
          pointerRef.current.y * 2 + 5,
          cameraZPos
        );
        cameraRef.current.lookAt(5, 5, -5);
      }

      //raycaster for particle sim
      raycaster.setFromCamera(pointerRef.current, cameraRef.current);
      const [intersect] = raycaster.intersectObject(invisiblePlane);
      if (intersect) {
        const { x, y } = intersect.point;
        fboMaterial.uniforms.uMouse.value.set(x, y);

        cursorSphere.position.set(
          intersect.point.x,
          intersect.point.y,
          intersect.point.z
        );
      }

      //raycaster for icons
      raycasterForIcons.setFromCamera(pointerRef.current, cameraRef.current);
      const iconIntersects = raycasterForIcons.intersectObject(iconModel, true);
      if (iconIntersects.length > 0) {
        updateTextureScale(iconIntersects[0].object);
        console.log("Icon intersected:", iconIntersects[0].object.name);
        const iconIntersect = iconIntersects[0];
        const { x, y, z } = iconIntersect.point;
      }
    });
  };

  const updateInfoFromImage = () => {
    for (let i = 0; i < size * size * 4; i += 4) {
      infoArray[i + 0] = ((i / 4) % size) / 100;
      infoArray[i + 1] = Math.floor(i / 4 / size) / 100;
      infoArray[i + 2] = -1 * imageDataArray[i + 0] * 50 - 10; // Adjusted to match the original logic
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

    const oldTexture = colorTexture;

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
    material.uniforms.uOldColor.value = oldTexture;
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

    cameraRef.current = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    cameraRef.current.position.set(10, 5, -15);

    //controls = new OrbitControls(cameraRef.current, renderer.domElement);
    //controls.target.set(5, 5, -5);
    //controls.update();

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

  function setupIconModels() {
    gltfLoader.load("/models/icons_model/group_01_v2.glb", (gltf) => {
      iconModel = gltf.scene;
      iconModel.position.set(0, 0, -10);
      iconModel.scale.set(1, 1, 1);

      scene.add(iconModel);
    });
  }

  function setupModel() {
    gltfLoader.load("/models/abstract_art_sphere.glb", (gltf) => {
      abstractModel = gltf.scene;
      abstractModel.position.set(5, 5, -5);
      abstractModel.scale.set(1, 1, 1);

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

  function animateModel() {
    if (!abstractModel) return;

    const time = Date.now() * 0.001;
    abstractModel.rotation.x = Math.sin(time) * 0.5;
    abstractModel.rotation.y = Math.cos(time) * 0.5;
    abstractModel.rotation.z = Math.sin(time) * 0.5;

    //abstractModel_clone.rotation.x = Math.sin(time) * 0.5;
    //abstractModel_clone.rotation.y = Math.cos(time) * 0.5;
    //abstractModel_clone.rotation.z = Math.sin(time) * 0.5;
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
      setupIconModels();
    })();

    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);

      animateModel();

      if (!material || !fboMaterial) return;

      time += 0.05;
      fboMaterial.uniforms.time.value = time;
      material.uniforms.time.value = time;

      fboMaterial.uniforms.uPosition.value = fbo1.texture;

      renderer.setRenderTarget(fbo);
      renderer.render(fboScene, fboCamera);

      material.uniforms.uPosition.value = fbo.texture;

      renderer.setRenderTarget(null);
      renderer.render(scene, cameraRef.current);

      [fbo, fbo1] = [fbo1, fbo];
    };
    animate();

    const handleResize = () => {
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // const imagesSrc = [
    //   //"/images/MANDALA/9.png",
    //   "/images/MANDALA/icon M test.jpg",
    //   "/images/MANDALA/1.jpg",
    //   "/images/MANDALA/2.jpg",
    //   "/images/MANDALA/3.jpg",
    //   "/images/MANDALA/4.jpg",
    //   "/images/MANDALA/5.jpg",
    //   "/images/MANDALA/6.jpg",
    //   "/images/MANDALA/7.jpg",
    //   "/images/MANDALA/8.jpg",
    // ];

    const imagesSrc = [
      "/images/MANDALA/new/map_1.jpg",
      "/images/MANDALA/new/map_2.jpg",
      "/images/MANDALA/new/7a.jpg",
      "/images/MANDALA/new/1.jpg",
      "/images/MANDALA/new/2.jpg",
      "/images/MANDALA/new/icon M test1.jpg",
      "/images/MANDALA/new/icon M test2.jpg",
      "/images/MANDALA/new/icon M test2a.jpg",
      "/images/MANDALA/new/icon M test2a.png",
      "/images/MANDALA/new/icon M test3.jpg",
      "/images/MANDALA/new/icon M test3a.jpg",
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
      gravityTimeout = setTimeout(() => {
        material.uniforms.uGravityBool.value = true;
        fboMaterial.uniforms.uGravityBool.value = true;
      }, 1000);

      if (abstractModel) {
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

  useEffect(() => {
    console.log(cameraRef.current);

    if (cameraRef.current) {
      let cameraAnimation = gsap.timeline();
      cameraAnimation.to(cameraRef.current.position, {
        x: 5, //pointerRef.current.x * 2 + 5, //x: 5,
        y: 5, //pointerRef.current.y * 2 + 5, //y: 5,
        z: 4, //cameraZPos, //z: -5,
        duration: 5,
        ease: "power2.inOut",

        onStart: () => {
          cameraInitialAnimationRef.current = true;
        },
        onUpdate: () => {
          cameraRef.current.lookAt(5, 5, -5);
        },
        onComplete: () => {
          cameraInitialAnimationRef.current = false;
        },
      });
      cameraAnimation.play();
    }
  }, [cameraRef.current]);

  return <canvas ref={canvasRef}></canvas>;
}
