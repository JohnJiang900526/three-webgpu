import * as THREE from 'three';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WebGPURenderer from '@/common/jsm/renderers/webgpu/WebGPURenderer.js';
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader.js';
import { FlakesTexture } from 'three/examples/jsm/textures/FlakesTexture.js';

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
  private light: THREE.Mesh;
  private group: THREE.Group;
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
    this.light = new THREE.Mesh();
    this.group = new THREE.Group();
    this.gui = new GUI({
      title: "控制面板",
      autoPlace: false,
      container: this.container,
    });
    this.gui.hide();
  }

  init() {
    // 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x333333);
    this.scene.add(this.group);

    // 相机
    this.camera = new THREE.PerspectiveCamera(27, this.aspect, 0.25, 50);
    this.camera.position.z = 10;

    // 加载环境信息
    this.loadCube();
    // 加载几何模型
    this.createGeometry();
    // 灯光
    this.createLight();
    // 渲染器
    this.createRenderer();

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer?.domElement);
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.update();

    this.initStats();
    this.resize();
  }

  // 创建灯光
  private createLight() {
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const light = new THREE.PointLight(0xffffff, 30);

    this.light = new THREE.Mesh(geometry,material);
    this.light.add(light);
    this.scene.add(this.light);
  }

  private createGeometry() {
    const geometry = new THREE.SphereGeometry(0.8, 64, 32);
    const textureLoader = new THREE.TextureLoader();

    const diffuse = textureLoader.load('/examples/textures/carbon/Carbon.png');
    diffuse.colorSpace = THREE.SRGBColorSpace;
    diffuse.wrapS = THREE.RepeatWrapping;
    diffuse.wrapT = THREE.RepeatWrapping;
    diffuse.repeat.set(10, 10);

    const normalMap = textureLoader.load('/examples/textures/carbon/Carbon_Normal.png');
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(10, 10);

    const normalMap2 = textureLoader.load('/examples/textures/water/Water_1_M_Normal.jpg');

    const normalMap3 = new THREE.CanvasTexture(new FlakesTexture());
    normalMap3.wrapS = THREE.RepeatWrapping;
    normalMap3.wrapT = THREE.RepeatWrapping;
    normalMap3.repeat.set(10, 6);
    normalMap3.anisotropy = 16;

    const normalMap4 = textureLoader.load('/examples/textures/golfball.jpg');

    const clearcoatNormalMap = textureLoader.load('/examples/textures/pbr/Scratched_gold/Scratched_gold_01_1K_Normal.png');

    {
      const material = new THREE.MeshPhysicalMaterial({
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        metalness: 0.9,
        roughness: 0.5,
        color: 0x0000ff,
        normalMap: normalMap3,
        normalScale: new THREE.Vector2(0.15, 0.15)
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = -1;
      mesh.position.y = 1;
      this.group.add(mesh);
    }

    {
      const material = new THREE.MeshPhysicalMaterial({
        roughness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        map: diffuse,
        normalMap: normalMap
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = 1;
      mesh.position.y = 1;
      this.group.add(mesh);
    }

    {
      const material = new THREE.MeshPhysicalMaterial({
        metalness: 0.0,
        roughness: 0.1,
        clearcoat: 1.0,
        normalMap: normalMap4,
        clearcoatNormalMap: clearcoatNormalMap,
        // y scale is negated to compensate for normal map handedness.
        clearcoatNormalScale: new THREE.Vector2(2.0, -2.0)
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = -1;
      mesh.position.y = -1;
      this.group.add(mesh);
    }

    {
      const material = new THREE.MeshPhysicalMaterial({
        clearcoat: 1.0,
        metalness: 1.0,
        color: 0xff0000,
        normalMap: normalMap2,
        normalScale: new THREE.Vector2(0.15, 0.15),
        clearcoatNormalMap: clearcoatNormalMap,
        // y scale is negated to compensate for normal map handedness.
        clearcoatNormalScale: new THREE.Vector2(2.0, - 2.0)
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = 1;
      mesh.position.y = -1;
      this.group.add(mesh);
    }
  }

  private loadCube() {
    const loader = new HDRCubeTextureLoader();
    const urls = ['px.hdr', 'nx.hdr', 'py.hdr', 'ny.hdr', 'pz.hdr', 'nz.hdr'];

    loader.setPath('/examples/textures/cube/pisaHDR/');
    loader.load(urls, (texture) => {
      this.scene.background = texture;
      this.scene.environment = texture;
    });
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
  }

  // 创建渲染器
  private createRenderer() {
    this.renderer = new WebGPURenderer({antialias: true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    // @ts-ignore
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.setAnimationLoop(() => {
      this.animate();
    });
    this.container.appendChild(this.renderer.domElement);
  }

  // 性能统计
  private initStats() {
    this.stats = new Stats();
    this.stats.dom.style.position = "absolute";
    this.stats.dom.style.bottom = "0px";
    this.stats.dom.style.top = "unset";
    this.container.appendChild(this.stats.dom);
  }

  // 持续动画
  private animate() {
    {
      const timer = (Date.now()) * 0.00025/2;
      this.light.position.set(
        Math.sin(timer * 7) * 3,
        Math.cos(timer * 5) * 4,
        Math.cos(timer * 3) * 3,
      );

      this.group.children.forEach((item) => {
        item.rotation.y += 0.005;
      });
    }

    this.stats?.update();
    this.controls?.update();

    // 执行渲染
    this.renderer?.render(this.scene, this.camera!);
  }

  private resizeHandle() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.aspect = this.width/this.height;

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

