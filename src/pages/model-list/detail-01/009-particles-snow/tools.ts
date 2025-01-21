import * as THREE from 'three';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WebGPURenderer from '@/common/jsm/renderers/webgpu/WebGPURenderer.js';

import { 
  tslFn, texture, vec3, pass, color, uint, 
  viewportTopLeft, positionWorld, positionLocal, 
  timerLocal, vec2, MeshStandardNodeMaterial, 
  instanceIndex, storage, MeshBasicNodeMaterial, If 
} from '@/common/jsm/nodes/Nodes.js';
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry.js';
import PostProcessing from '@/common/jsm/renderers/common/PostProcessing.js';


export class Model {
  private width: number;
  private height: number;
  private aspect: number;
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private renderer: null | WebGPURenderer;
  private camera: null | THREE.PerspectiveCamera;
  private stats: null | Stats;
  private animateNumber: number;

  private controls: null | OrbitControls;
  private gui: GUI;
  private maxParticleCount: number;
  private computeParticles: null | any;
  private postProcessing: null | any;
  private collisionCamera: THREE.OrthographicCamera;
  private collisionPosRT: THREE.RenderTarget;
  private collisionPosMaterial: MeshBasicNodeMaterial;
  private teapotTree: THREE.Mesh;
  constructor(container: HTMLDivElement) {
    this.container = container;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.aspect = this.width / this.height;
    this.scene = new THREE.Scene();
    this.renderer = null;
    this.camera = null;
    this.stats = null;
    this.animateNumber = 0;

    this.controls = null;
    this.gui = new GUI({
      title: "控制面板",
      autoPlace: false,
      container: this.container,
    });
    this.gui.hide();

    this.maxParticleCount = 100000;
    this.computeParticles = null;
    this.postProcessing = null;
    this.collisionCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 50);
    this.collisionPosRT = new THREE.RenderTarget(1024, 1024);
    this.collisionPosMaterial = new MeshBasicNodeMaterial();
    this.teapotTree = new THREE.Mesh();
  }

  init() {
    // 场景
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0f3c37, 5, 40);

    // 相机
    this.camera = new THREE.PerspectiveCamera(60, this.aspect, 0.1, 100);
    this.camera.position.set(20, 2, 20);
    this.camera.layers.enable(2);
    this.camera.lookAt(0, 40, 0);

    // 渲染器
    this.createRenderer();

    // collisionCamera
    this.createCollisionCamera();

    // light
    this.createLight();

    // particle
    this.createParticle();
    // floor
    this.createFloor();
    // tree
    this.createTree();
    // PostProcessing
    this.initPostProcessing();

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer?.domElement);
    this.controls.target.set(0, 10, 0);
    this.controls.minDistance = 25;
    this.controls.maxDistance = 35;
    this.controls.maxPolarAngle = Math.PI / 1.7;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = -0.7;
    this.controls.update();

    this.initStats();
    this.resize();
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
  }

  private initPostProcessing() {
    // post processing
    const scenePass = pass(this.scene, this.camera);
    const scenePassColor = scenePass.getTextureNode();
    const vignet = viewportTopLeft.distance(.5).mul(1.35).clamp().oneMinus();

    const teapotTreePass = pass(this.teapotTree, this.camera).getTextureNode();
    const teapotTreePassBlurred = teapotTreePass.gaussianBlur(3);
    teapotTreePassBlurred.resolution = new THREE.Vector2(.2, .2);

    const scenePassColorBlurred = scenePassColor.gaussianBlur();
    scenePassColorBlurred.resolution = new THREE.Vector2(.5, .5);
    scenePassColorBlurred.directionNode = vec2(1);

    // compose
    const getTotalPass = () => {
      const pass = scenePass.add(scenePassColorBlurred.mul(.1)).mul(vignet).add(teapotTreePass.mul(10).add(teapotTreePassBlurred));
      return pass;
    };

    this.postProcessing = new PostProcessing(this.renderer);
    this.postProcessing.outputNode = getTotalPass();
  }

  private createTree() {
    const tree = (count: number = 8) => {
      const coneMaterial = new MeshStandardNodeMaterial({
        metalness: 0,
        roughness: 0.6,
        color: 0x0d492c,
      });

      const object = new THREE.Group();
      for (let i = 0; i < count; i++) {
        const radius = 1 + i;
        const coneGeometry = new THREE.ConeGeometry(radius * 0.95, radius * 1.25, 32);
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);

        cone.castShadow = true;
        cone.position.y = (count - i) * 1.5 + count * 0.6;
        object.add(cone);
      }

      const geometry = new THREE.CylinderGeometry(1, 1, count, 32);
      const cone = new THREE.Mesh(geometry, coneMaterial);
      cone.position.y = count / 2;
      object.add(cone);

      return object;
    }

    const geometry = new TeapotGeometry(0.5, 18);
    const material = new MeshBasicNodeMaterial({
      color: 0xfcfb9e,
    });
    this.teapotTree = new THREE.Mesh(geometry, material);
    this.teapotTree.position.y = 18;

    this.scene.add(tree());
    this.scene.add(this.teapotTree);

    // @ts-ignore
    this.scene.backgroundNode = viewportTopLeft.distance(0.5).mul(2).mix(color(0x0f4140), color(0x060a0d));
  }

  private createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    floorGeometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x0c1e1e,
      metalness: 0,
      roughness: 0.5,
      transparent: true,
    });
    const plane = new THREE.Mesh(floorGeometry, material);

    // @ts-ignore
    plane.material.opacityNode = positionLocal.xz
      .mul(0.05)
      .distance(0)
      .saturate()
      .oneMinus();
    this.scene.add(plane);
  }

  private createParticle() {
    const createBuffer = (type = "vec3") =>
      storage(
        new THREE.InstancedBufferAttribute(
          new Float32Array(this.maxParticleCount * 4),
          4
        ),
        type,
        this.maxParticleCount
      );

    const positionBuffer = createBuffer();
    const scaleBuffer = createBuffer();
    const staticPositionBuffer = createBuffer();
    const dataBuffer = createBuffer("vec4");

    // compute
    const timer = timerLocal();
    const randUint = () => uint(Math.random() * 0xffffff);

    // init
    const computeInit = tslFn(() => {
      const position = positionBuffer.element(instanceIndex);
      const scale = scaleBuffer.element(instanceIndex);
      const particleData = dataBuffer.element(instanceIndex);

      const randX = instanceIndex.hash();
      const randY = instanceIndex.add(randUint()).hash();
      const randZ = instanceIndex.add(randUint()).hash();

      position.x = randX.mul(100).add(-50);
      position.y = randY.mul(500).add(3);
      position.z = randZ.mul(100).add(-50);

      scale.xyz = instanceIndex.add(Math.random()).hash().mul(0.8).add(0.2);
      staticPositionBuffer
        .element(instanceIndex)
        .assign(vec3(1000, 10000, 1000));
      particleData.y = randY.mul(-0.1).add(-0.02);

      particleData.x = position.x;
      particleData.z = position.z;
      particleData.w = randX;
    })().compute(this.maxParticleCount);

    // update
    const surfaceOffset = 0.2;
    const speed = 0.4;
    const computeUpdate = tslFn(() => {
      const getCoord = (pos: any) => pos.add(50).div(100);

      const position = positionBuffer.element(instanceIndex);
      const scale = scaleBuffer.element(instanceIndex);
      const particleData = dataBuffer.element(instanceIndex);

      const velocity = particleData.y;
      const random = particleData.w;

      const rippleOnSurface = texture(
        this.collisionPosRT.texture,
        getCoord(position.xz)
      );
      const rippleFloorArea = rippleOnSurface.y.add(scale.x.mul(surfaceOffset));

      If(position.y.greaterThan(rippleFloorArea), () => {
        position.x = particleData.x.add(
          timer.mul(random.mul(random)).mul(speed).sin().mul(3)
        );
        position.z = particleData.z.add(
          timer.mul(random).mul(speed).cos().mul(random.mul(10))
        );
        position.y = position.y.add(velocity);
      }).else(() => {
        staticPositionBuffer.element(instanceIndex).assign(position);
      });
    });

    this.computeParticles = computeUpdate().compute(this.maxParticleCount);
    // rain
    const geometry = new THREE.SphereGeometry(surfaceOffset, 5, 5);
    const particle = (staticParticles?: boolean) => {
      const posBuffer = staticParticles ? staticPositionBuffer : positionBuffer;
      const layer = staticParticles ? 1 : 2;

      const staticMaterial = new MeshStandardNodeMaterial({
        roughness: 0.9,
        metalness: 0.0,
        color: 0xeeeeee,
      });
      staticMaterial.positionNode = positionLocal
        .mul(scaleBuffer.toAttribute())
        .add(posBuffer.toAttribute());

      const rainParticles = new THREE.InstancedMesh(
        geometry,
        staticMaterial,
        this.maxParticleCount
      );
      rainParticles.castShadow = true;
      rainParticles.layers.disableAll();
      rainParticles.layers.enable(layer);

      return rainParticles;
    };

    const dynamicParticles = particle();
    const staticParticles = particle(true);

    this.scene.add(dynamicParticles);
    this.scene.add(staticParticles);

    this.renderer?.compute(computeInit);
  }

  private createCollisionCamera() {
    this.collisionCamera = new THREE.OrthographicCamera(
      -50,
      50,
      50,
      -50,
      0.1,
      50
    );
    this.collisionCamera.position.y = 50;
    this.collisionCamera.lookAt(0, 0, 0);
    this.collisionCamera.layers.enable(1);

    this.collisionPosRT = new THREE.RenderTarget(1024, 1024);
    this.collisionPosRT.texture.type = THREE.HalfFloatType;

    this.collisionPosMaterial = new MeshBasicNodeMaterial();
    this.collisionPosMaterial.fog = false;
    this.collisionPosMaterial.toneMapped = false;
    this.collisionPosMaterial.colorNode = positionWorld.y;
  }

  private createLight() {
    const dirLight = new THREE.DirectionalLight(0xf9ff9b, 9);
    dirLight.castShadow = true;
    dirLight.position.set(10, 10, 0);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.009;

    const hpLight = new THREE.HemisphereLight(0x0f3c37, 0x080d10, 100);
    this.scene.add(dirLight, hpLight);
  }

  // 创建渲染器
  private createRenderer() {
    this.renderer = new WebGPURenderer({ antialias: true });
    // @ts-ignore
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setAnimationLoop(() => {
      this.animate();
    });
    this.container.appendChild(this.renderer.domElement);
  }

  // 性能统计
  private initStats() {
    // @ts-ignore
    this.stats = Stats();
    // @ts-ignore
    this.stats.domElement.style.position = "absolute";
    // @ts-ignore
    this.stats.domElement.style.bottom = "0px";
    // @ts-ignore
    this.stats.domElement.style.top = "unset";
    // @ts-ignore
    this.container.appendChild(this.stats.domElement);
  }

  // 持续动画
  private animate() {
    this.stats?.update();
    this.controls?.update();

    // position
    this.scene.overrideMaterial = this.collisionPosMaterial;
    this.renderer?.setRenderTarget(this.collisionPosRT);
    this.renderer?.render(this.scene, this.collisionCamera);

    // compute
    this.renderer?.compute(this.computeParticles);

    // result
    this.scene.overrideMaterial = null;
    this.renderer?.setRenderTarget(null);

    this.postProcessing.render();
  }

  private resizeHandle() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.aspect = this.width / this.height;

    this.camera!.aspect = this.aspect;
    // 更新摄像机投影矩阵。在任何参数被改变以后必须被调用。
    this.camera!.updateProjectionMatrix();

    this.renderer!.setSize(this.width, this.height);
  }

  // 消除 副作用
  dispose() {
    window.cancelAnimationFrame(this.animateNumber);
    window.onresize = null;
  }

  // 处理自适应
  resize() {
    window.onresize = () => {
      this.resizeHandle();
    };
  }
}

export default THREE;

