import * as THREE from 'three';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as Nodes from '@/common/jsm/nodes/Nodes.js';
import WebGPU from '@/common/jsm/capabilities/WebGPU.js';
import WebGL from '@/common/jsm/capabilities/WebGL.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import WebGPURenderer from '@/common/jsm/renderers/webgpu/WebGPURenderer.js';
import { showFailToast } from 'vant';

const { 
  float, vec3, color, toneMapping, 
  viewportSharedTexture, viewportTopLeft, checker, uv, 
  timerLocal, oscSine, output, MeshStandardNodeMaterial
} = Nodes;

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
  private rotate: boolean;
  private mixer: null| THREE.AnimationMixer;
  private clock: THREE.Clock;
  private geometry: THREE.SphereGeometry;
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
    this.gui.hide();
    this.portals = new THREE.Group();
    this.rotate = true;
    this.mixer = null;
    this.clock = new THREE.Clock();
    this.geometry = new THREE.SphereGeometry(.3, 32, 16);
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
    this.camera = new THREE.PerspectiveCamera(50, this.aspect, 0.01, 100);
    this.camera.position.set(1, 2, 3);
    this.camera.lookAt(0, 1, 0);
    this.scene.add(this.camera);

    this.generateLight();
    // 渲染器
    this.createRenderer();
    // 加载模型
    this.loadModel();
    // 创建圆球
    this.createSphere();

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer?.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.addEventListener('start', () => {
      this.rotate = false
    });
    this.controls.addEventListener('end', () => {
      this.rotate = true
    });
    this.controls.update();

    this.initStats();
    this.resize();
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
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
      // @ts-ignore
      const material = object.children[0]?.children[0]?.material;

      material.outputNode = oscSine(timerLocal(.1)).mix(output, output.add(.1).posterize(4).mul(2));
      const action = this.mixer.clipAction(gltf.animations[0]);
      action.play();

      this.scene.add(object);
    });
  }

  private createSphere() {
    const shared = viewportSharedTexture;

    this.addBackdropSphere(shared().bgr.hue(oscSine().mul(Math.PI)));
    this.addBackdropSphere(shared().rgb.oneMinus());
    this.addBackdropSphere(shared().rgb.saturation(0));
    this.addBackdropSphere(shared().rgb.saturation(10), oscSine());
    this.addBackdropSphere(shared().rgb.overlay(checker(uv().mul(10))));
    this.addBackdropSphere(shared(viewportTopLeft.mul(40).floor().div(40)));
    this.addBackdropSphere(shared(viewportTopLeft.mul(80).floor().div(80)).add(color(0x0033ff)));
    this.addBackdropSphere(vec3(0, 0, shared().b));
  }

  private addBackdropSphere(backdropNode: any, backdropAlphaNode = null) {
    const distance = 1;
    const length = this.portals.children.length;
    const rotation = THREE.MathUtils.degToRad(length * 45);

    const material = new MeshStandardNodeMaterial({ color: 0x0066ff });
    material.roughnessNode = float(0.2);
    material.metalnessNode = float(0);
    material.backdropNode = backdropNode;
    material.backdropAlphaNode = backdropAlphaNode;
    material.transparent = true;

    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.position.set(
      Math.cos(rotation) * distance,
      1,
      Math.sin(rotation) * distance,
    );
    this.portals.add(mesh);
  }

  // 创建渲染器
  private createRenderer() {
    this.renderer = new WebGPURenderer({antialias: true});
    Object.assign(this.renderer, {
      toneMappingNode: toneMapping(THREE.LinearToneMapping, .15)
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
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

    {
      const delta = this.clock.getDelta();
      this.mixer?.update(delta);
      if (this.rotate) {
        this.portals.rotation.y += delta * 0.5;
      }
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

