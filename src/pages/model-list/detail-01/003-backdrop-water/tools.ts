import * as THREE from 'three';
// import * as THREE from '@/common/js/three.js';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { 
  color, 
  depth, 
  depthTexture, 
  normalWorld, 
  triplanarTexture, texture, 
  viewportSharedTexture, 
  mx_worley_noise_float, 
  positionWorld, 
  timerLocal, 
  MeshStandardNodeMaterial, 
  MeshBasicNodeMaterial 
} from '@/common/jsm/nodes/Nodes.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import WebGPURenderer from '@/common/jsm/renderers/webgpu/WebGPURenderer.js';
import { sample } from 'lodash';


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
  private mixer: THREE.AnimationMixer | null;
  private objects: THREE.Group;
  private clock: THREE.Clock;
  private model: null | THREE.Group;
  private floor: THREE.Mesh;
  private floorPosition: THREE.Vector3;
  private material: MeshStandardNodeMaterial;
  private water: THREE.Mesh;
  private waterLayer0: any;
  private waterLayer1: any;
  private iceColorNode: any;
  constructor(container: HTMLDivElement) {
    this.container = container;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.aspect = this.width/this.height;
    this.scene = new THREE.Scene();
    this.renderer = null;
    this.camera = null;
    this.stats = null;
    this.animateNumber = 0;

    this.controls = null;
    this.mixer = null;
    this.objects = new THREE.Group;
    this.clock = new THREE.Clock();
    this.model = null;
    this.floor = new THREE.Mesh();
    this.floorPosition = new THREE.Vector3(0, 1, 0);
    this.gui = new GUI({
      title: "控制面板",
      autoPlace: false,
      container: this.container,
    });
    this.gui.hide();

    const textureLoader = new THREE.TextureLoader();
    const iceDiffuse = textureLoader.load('/examples/textures/water.jpg');
    iceDiffuse.wrapS = THREE.RepeatWrapping;
    iceDiffuse.wrapT = THREE.RepeatWrapping;
    iceDiffuse.colorSpace = THREE.NoColorSpace;

    this.iceColorNode = triplanarTexture(texture(iceDiffuse));
    this.material = new MeshStandardNodeMaterial({ colorNode: this.iceColorNode });

    this.water = new THREE.Mesh();

    const timer = timerLocal(.8);
    const floorUV = positionWorld.xzy;
    this.waterLayer0 = mx_worley_noise_float(floorUV.mul(4).add(timer));
    this.waterLayer1 = mx_worley_noise_float(floorUV.mul(2).add(timer));
  }

  init() {
    // 场景
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x74ccf4, 7, 25);
    Object.assign(this.scene, {
      backgroundNode: normalWorld.y.mix(color(0x74ccf4), color(0x0066ff)),
    });

    // 相机
    this.camera = new THREE.PerspectiveCamera(50, this.aspect, 0.25, 30);
    this.camera.position.set(3, 3, 4);
    this.camera.lookAt(0, 1, 0);

    // 渲染器
    this.createRenderer();

    this.addLight();
    this.addModel();
    this.addObjects();
    this.addWater();
    this.addFloor();

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer?.domElement);
    this.controls.minDistance = 1;
    this.controls.maxDistance = 10;
    this.controls.maxPolarAngle = Math.PI * 0.9;
    this.controls.target.set(0, 1, 0);
    this.controls.update();

    this.initStats();
    // this.animate();
    this.resize();
  }

  // light
  private addLight() {
    const sunLight = new THREE.DirectionalLight(0xFFE499, 5);
    sunLight.castShadow = true;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 3;
    sunLight.shadow.camera.right = 2;
    sunLight.shadow.camera.left = -2;
    sunLight.shadow.camera.top = 2;
    sunLight.shadow.camera.bottom = -2;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.bias = -0.001;
    sunLight.position.set(1, 3, 1);

    const waterLight = new THREE.HemisphereLight(0x333366, 0x74ccf4, 5);
    const skyLight = new THREE.HemisphereLight(0x74ccf4, 0, 1);

    this.scene.add(sunLight);
    this.scene.add(skyLight);
    this.scene.add(waterLight);
  }

  // model
  private addModel() {
    const loader = new GLTFLoader();

    loader.load("/examples/models/gltf/Michelle.glb",(gltf) => {
      this.model = gltf.scene;
      this.model.children[0].children[0].castShadow = true;

      this.mixer = new THREE.AnimationMixer(this.model);
      const action = this.mixer.clipAction(gltf.animations[0]);
      action.play();

      this.scene.add(this.model);
    });
  }

  // objects
  private addObjects() {
    const geometry = new THREE.IcosahedronGeometry(1, 3);

    const count = 100;
    const scale = 3.5;
    const column = 10;

    for (let i = 0; i < count; i++) {
      const x = i % column;
      const y = i / column;

      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.position.set(x * scale, 0, y * scale);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      this.objects.add(mesh);
    }

    const x = (((column - 1) * scale) * -0.5);
    const y = -0.3;
    const z = ((count / column) * scale) * - 0.5;
    this.objects.position.set(x, y, z);
    this.scene.add(this.objects);
  }
  // water
  private addWater() {
    const depthEffect = depthTexture().distance(depth).remapClamp(0, .05);

    const waterIntensity = this.waterLayer0.mul(this.waterLayer1).mul(1.4);
    const waterColor = waterIntensity.mix(color(0x0f5e9c), color(0x74ccf4));
    
    const viewportTexture = viewportSharedTexture();
    const waterMaterial = new MeshBasicNodeMaterial();
    waterMaterial.colorNode = waterColor;
    waterMaterial.backdropNode = depthEffect.mul(3).min(1.4).mix(viewportTexture, viewportTexture.mul(color(0x74ccf4)));
    waterMaterial.backdropAlphaNode = depthEffect.oneMinus();
    waterMaterial.transparent = true;

    const water = new THREE.Mesh(new THREE.BoxGeometry(50, .001, 50), waterMaterial);
    water.position.set(0, .8, 0);
    this.scene.add(water);
  }
  private addFloor() {
    this.floor = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 10), 
      new MeshStandardNodeMaterial({ colorNode: this.iceColorNode })
    );
    this.floor.position.set(0, -5, 0);
    this.scene.add(this.floor);

    const waterPosY = positionWorld.y.sub(this.water.position.y);
    let transition = waterPosY.add(.1).saturate().oneMinus();
    transition = waterPosY.lessThan(0).cond(transition, normalWorld.y.mix(transition, 0)).toVar();

    const colorNode = transition.mix(
      this.material.colorNode, 
      this.material.colorNode.add(this.waterLayer0)
    );
    (this.floor.material as any).colorNode = colorNode;
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
  }

  // 创建渲染器
  private createRenderer() {
    this.renderer = new WebGPURenderer();
    Object.assign(this.renderer, { stencil: false });
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
    // this.animateNumber && window.cancelAnimationFrame(this.animateNumber);
    // this.animateNumber = window.requestAnimationFrame(() => { this.animate(); });

    this.stats?.update();
    this.controls?.update();

    const delta = this.clock.getDelta();
    this.floor.position.y = this.floorPosition.y - 5;
    if (this.model) {
      this.mixer?.update(delta);
      this.model.position.y = this.floorPosition.y;
    }

    for (const object of this.objects.children) {
      object.position.y = Math.sin(this.clock.elapsedTime + object.id) * .3;
      object.rotation.y += delta * 0.3;
    }

    // 执行渲染
    this.renderer?.render(this.scene, this.camera!);
  }

  // 消除 副作用
  dispose() {
    window.cancelAnimationFrame(this.animateNumber);
  }

  // 处理自适应
  resize() {
    window.onresize = () => {
      this.width = this.container.offsetWidth;
      this.height = this.container.offsetHeight;
      this.aspect = this.width/this.height;

      this.camera!.aspect = this.aspect;
      // 更新摄像机投影矩阵。在任何参数被改变以后必须被调用。
      this.camera!.updateProjectionMatrix();

      this.renderer!.setSize(this.width, this.height);
    };
  }
}

export default THREE;

