import * as THREE from 'three';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WebGPURenderer from '@/common/jsm/renderers/webgpu/WebGPURenderer.js';



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
  }

  init() {
    // 场景
    this.scene = new THREE.Scene();
    // 添加雾霾
    this.scene.fog = new THREE.Fog(0x0f3c37, 5, 40);

    // 相机
    this.camera = new THREE.PerspectiveCamera(60, this.aspect, 0.1, 100);
    this.camera.position.set(20, 2, 20);
    this.camera.layers.enable(2);
    this.camera.lookAt(0, 40, 0);

    // 渲染器
    this.createRenderer();

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer?.domElement);
    this.controls.update();

    this.initStats();
    this.resize();
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
  }

  // 创建渲染器
  private createRenderer() {
    this.renderer = new WebGPURenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
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
    this.stats?.update();
    this.controls?.update();

    this.renderer?.render(this.scene, this.camera);
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

