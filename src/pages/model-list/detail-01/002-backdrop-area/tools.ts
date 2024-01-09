import * as THREE from 'three';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WebGPU from '@/common/jsm/capabilities/WebGPU.js';
import WebGL from '@/common/jsm/capabilities/WebGL.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import WebGPURenderer from '@/common/jsm/renderers/webgpu/WebGPURenderer.js';
import { showFailToast } from 'vant';


import { 
  color, depth, depthTexture, toneMapping, viewportSharedTexture, 
  viewportMipTexture, viewportTopLeft, checker, uv, modelScale, MeshBasicNodeMaterial 
} from '@/common/jsm/nodes/Nodes.js';


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

  private portals: THREE.Group;
  private mixer: null| THREE.AnimationMixer;
  private clock: THREE.Clock;
  private materials: {
    'blurred': any,
    'volume': any,
    'depth': any,
    'bicubic': any,
    'pixel': any
  }
  private params: {
    material: string,
  };
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
    this.gui = new GUI({
      title: "控制面板",
      autoPlace: false,
      container: this.container,
    });
    this.portals = new THREE.Group();
    this.mixer = null;
    this.clock = new THREE.Clock();
    this.materials = {
      'blurred': null,
      'volume': null,
      'depth': null,
      'bicubic': null,
      'pixel': null,
    };
    this.params = {
      material: 'blurred'
    };
  }

  init() {
    const isAvailable = (WebGPU.isAvailable() === false && WebGL.isWebGL2Available() === false);
    if (isAvailable) {
      showFailToast(WebGPU.getErrorMessage());
      throw new Error('No WebGPU or WebGL2 support');
    }
    
    // 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x333333);
    this.scene.add(this.portals);

    // 相机
    this.camera = new THREE.PerspectiveCamera(50, this.aspect, 0.25, 25);
    this.camera.position.set(3, 2, 3);
    this.camera.lookAt(0, 1, 0);
    this.scene.add(this.camera);

    this.generateLight();
    // 渲染器
    this.createRenderer();
    // 加载模型
    this.loadModel();
    // Volume
    this.initVolume();

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer?.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.update();

    this.setGUI();
    this.initStats();
    this.resize();
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
  }

  private setGUI() {
    const box = this.scene.getObjectByName("box") as THREE.Mesh;

    this.gui.add(box.scale, 'x', 0.1, 2, 0.01);
    this.gui.add(box.scale, 'z', 0.1, 2, 0.01);

    this.gui.add(this.params, 'material', Object.keys(this.materials)).onChange((name: string) => {
      // @ts-ignore
      box.material = this.materials[name];
    });
  }

  private initVolume() {
    const depthDistance = depthTexture().distance(depth);
    const depthAlphaNode = depthDistance.oneMinus().smoothstep(.90, 2).mul(20).saturate();
    const depthBlurred = viewportMipTexture().bicubic(depthDistance.smoothstep(0, .6).mul(40 * 5).clamp(0, 5));

    const blurredBlur = new MeshBasicNodeMaterial();
    blurredBlur.backdropNode = depthBlurred.add(depthAlphaNode.mix(color(0x0066ff), 0));
    blurredBlur.transparent = true;
    blurredBlur.side = THREE.DoubleSide;

    const volumeMaterial = new MeshBasicNodeMaterial();
    volumeMaterial.colorNode = color(0x0066ff);
    volumeMaterial.backdropNode = viewportSharedTexture();
    volumeMaterial.backdropAlphaNode = depthAlphaNode;
    volumeMaterial.transparent = true;
    volumeMaterial.side = THREE.DoubleSide;

    const depthMaterial = new MeshBasicNodeMaterial();
    depthMaterial.backdropNode = depthAlphaNode;
    depthMaterial.transparent = true;
    depthMaterial.side = THREE.DoubleSide;

    const bicubicMaterial = new MeshBasicNodeMaterial();
    // @TODO: Move to alpha value [ 0, 1 ]
    bicubicMaterial.backdropNode = viewportMipTexture().bicubic(5);
    bicubicMaterial.backdropAlphaNode = checker(uv().mul(3).mul(modelScale.xy));
    bicubicMaterial.opacityNode = bicubicMaterial.backdropAlphaNode;
    bicubicMaterial.transparent = true;
    bicubicMaterial.side = THREE.DoubleSide;

    const pixelMaterial = new MeshBasicNodeMaterial();
    pixelMaterial.backdropNode = viewportSharedTexture(viewportTopLeft.mul(100).floor().div(100));
    pixelMaterial.transparent = true;

    this.materials = {
      'blurred': blurredBlur,
      'volume': volumeMaterial,
      'depth': depthMaterial,
      'bicubic': bicubicMaterial,
      'pixel': pixelMaterial
    };

    {
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const mesh = new THREE.Mesh(geometry, volumeMaterial);
      mesh.name = "box";
      mesh.position.set(0, 1, 0);
      this.scene.add(mesh);
    }

    {
      const geometry = new THREE.BoxGeometry(1.99, .01, 1.99);
      const material = new MeshBasicNodeMaterial({ color: 0x333333 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "floor";
      mesh.position.set(0, 0, 0);
      this.scene.add(mesh);
    }

    const box = this.scene.getObjectByName("box") as THREE.Mesh;
    if (box) {
      // @ts-ignore
      box.material = this.materials[this.params.material];
    }
  }

  private generateLight() {
    const light = new THREE.SpotLight(0xffffff, 1);
    light.power = 2000;
    this.camera?.add(light);
  }

  private loadModel() {
    const url = "models/gltf/Michelle.glb";
    const loader = new GLTFLoader();
    
    loader.setPath("/examples/");
    loader.load(url, (gltf) => {
      const object = gltf.scene;
      this.mixer = new THREE.AnimationMixer(object);

      const action = this.mixer.clipAction(gltf.animations[0]);
      action.play();

      this.scene.add(object);
    });
  }

  // 创建渲染器
  private createRenderer() {
    this.renderer = new WebGPURenderer({ antialias: false });
    Object.assign(this.renderer, {
      stencil: false,
      toneMappingNode: toneMapping(THREE.LinearToneMapping, 0.15),
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setAnimationLoop(() => { this.animate(); });
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

    const delta = this.clock.getDelta();
    this.mixer?.update(delta);

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

