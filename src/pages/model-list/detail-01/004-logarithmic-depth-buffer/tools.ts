import * as THREE from 'three';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import WebGPU from '@/common/jsm/capabilities/WebGPU.js';
import WebGL from '@/common/jsm/capabilities/WebGL.js';
import WebGPURenderer from '@/common/jsm/renderers/webgpu/WebGPURenderer.js';


let func = () => {};
export class Model {
  private width: number;
  private height: number;
  private aspect: number;
  private container: HTMLDivElement;
  private stats: null | Stats;
  private animateNumber: number;

  private NEAR: number;
  private FAR: number;
  private split: number;
  private splitRight: number;
  private mouse: number[];
  private zoompos: number;
  private minzoomspeed: number;
  private zoomspeed: number;
  private border: HTMLDivElement;
  private normal: HTMLDivElement;
  private logzbuf: HTMLDivElement;
  private objects: {[key: string]: {
    scene: THREE.Scene, 
    camera: THREE.PerspectiveCamera,
    renderer: WebGPURenderer, 
    container: HTMLDivElement, 
  }};
  private labelData: {size: number, scale: number, label: string}[];
  private gui: GUI;
  constructor(container: HTMLDivElement, option: {
    normal: HTMLDivElement,
    border: HTMLDivElement,
    logzbuf: HTMLDivElement,
  }) {
    this.container = container;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.aspect = this.width/this.height;
    this.stats = null;
    this.animateNumber = 0;

    this.gui = new GUI({
      title: "控制面板",
      autoPlace: false,
      container: this.container,
    });
    this.gui.hide();
    this.NEAR = 1e-6;
    this.FAR = 1e27;
    this.split = 0.25
    this.splitRight = 0;
    this.mouse = [0.5, 0.5];
    this.zoompos = -100;
    this.minzoomspeed = 0.015
    this.zoomspeed = this.minzoomspeed;
    this.border = option.border;
    this.normal = option.normal;
    this.logzbuf = option.logzbuf;
    this.objects = {};
    this.labelData = [
      { size: .01, scale: 0.0001, label: 'microscopic (1µm)' },
      { size: .01, scale: 0.1, label: 'minuscule (1mm)' },
      { size: .01, scale: 1.0, label: 'tiny (1cm)' },
      { size: 1, scale: 1.0, label: 'child-sized (1m)' },
      { size: 10, scale: 1.0, label: 'tree-sized (10m)' },
      { size: 100, scale: 1.0, label: 'building-sized (100m)' },
      { size: 1000, scale: 1.0, label: 'medium (1km)' },
      { size: 10000, scale: 1.0, label: 'city-sized (10km)' },
      { size: 3400000, scale: 1.0, label: 'moon-sized (3,400 Km)' },
      { size: 12000000, scale: 1.0, label: 'planet-sized (12,000 km)' },
      { size: 1400000000, scale: 1.0, label: 'sun-sized (1,400,000 km)' },
      { size: 7.47e12, scale: 1.0, label: 'solar system-sized (50Au)' },
      { size: 9.4605284e15, scale: 1.0, label: 'gargantuan (1 light year)' },
      { size: 3.08567758e16, scale: 1.0, label: 'ludicrous (1 parsec)' },
      { size: 1e19, scale: 1.0, label: 'mind boggling (1000 light years)' }
    ];
  }

  init() {
    if (WebGPU.isAvailable() === false && WebGL.isWebGL2Available() === false) {
      throw new Error('No WebGPU or WebGL2 support');
    }

    this.loadFont();

    this.initStats();
  }

  private loadFont() {
    const loader = new FontLoader();
    loader.load('/examples/fonts/helvetiker_regular.typeface.json', (font) => {
      const scene = this.initScene(font);
      this.objects.normal = this.initView(scene, 'normal', false);
      this.objects.logzbuf = this.initView(scene, 'logzbuf', true);

      this.bind();
    });
  }

  private createDirectionalLight() {
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(100, 100, 100);
    return light;
  }
  private createAmbientLight() {
    return new THREE.AmbientLight(0x777777);
  }

  private initScene(font: any) {
    const scene = new THREE.Scene();
    scene.add(this.createAmbientLight());
    scene.add(this.createDirectionalLight());

    const materialargs: THREE.MeshPhongMaterialParameters = {
      color: 0xffffff as (number | THREE.Color),
      // 材质的高光颜色。默认值为0x111111（深灰色）的颜色Color。
      specular: 0x050505,
      // .specular高亮的程度，越高的值越闪亮。默认值为 30。
      shininess: 50,
      // 材质的放射（光）颜色，基本上是不受其他光照影响的固有颜色。默认为黑色。
      emissive: 0x000000,
    };

    const sphere = new THREE.SphereGeometry(0.5, 24, 12);
    // 添加问题和球体
    this.labelData.forEach((item) => {
      const scale = item.scale || 1;
      // 文本几何体
      const geometry = new TextGeometry(item.label, {
        font: font,
        size: item.size,
        height: item.size / 2
      });

      // 设置颜色
      materialargs.color = new THREE.Color().setHSL(Math.random(), 0.5, 0.5);
      // .computeBoundingSphere () : undefined
      // 计算当前几何体的的边界球形，该操作会更新已有 [param:.boundingSphere]
      // 边界球形不会默认计算，需要调用该接口指定计算边界球形，否则保持默认值 null
      geometry.computeBoundingSphere();
      if (geometry.boundingSphere) {
        geometry.translate(-geometry.boundingSphere.radius, 0, 0);
      }

      // Phong网格材质(MeshPhongMaterial)
      // 一种用于具有镜面高光的光泽表面的材质
      // 该材质使用非物理的Blinn-Phong模型来计算反射率
      // 与MeshLambertMaterial中使用的Lambertian模型不同，
      // 该材质可以模拟具有镜面高光的光泽表面（例如涂漆木材）
      // MeshPhongMaterial uses per-fragment shading。

      // 在MeshStandardMaterial或MeshPhysicalMaterial上使用此材质时，
      // 性能通常会更高 ，但会牺牲一些图形精度
      const material = new THREE.MeshPhongMaterial(materialargs);
      const group = new THREE.Group();
      group.position.z = -(item.size * scale);
      scene.add(group);

      // 文字
      const text = new THREE.Mesh(geometry, material);
      text.scale.set(scale, scale, scale);
      text.position.set(0, (item.size/4) * scale, -(item.size * scale));
      group.add(text);

      // 圆球
      const dot = new THREE.Mesh(sphere, material);
      dot.position.set(0, -(item.size / 4) * scale, 0);
      dot.scale.multiplyScalar(item.size * scale);
      group.add(dot);
    });

    return scene;
  }

  private initView(scene: THREE.Scene, name: "normal" | "logzbuf", logDepthBuf: boolean) {
    const container = this[name];

    const aspect = (this.split * this.width / this.height);
    const camera = new THREE.PerspectiveCamera(50, aspect, this.NEAR, this.FAR);
    scene.add(camera);

    const renderer = new WebGPURenderer({
      // 是否执行抗锯齿。默认为false.
      antialias: true,
      // 是否使用对数深度缓存。
      // 如果要在单个场景中处理巨大的比例差异，就有必要使用。 
      // Note that this setting uses gl_FragDepth if 
      // available which disables the Early Fragment Test 
      // optimization and can cause a decrease in performance. 
      // 默认是false。 示例：camera / logarithmicdepthbuffer
      logarithmicDepthBuffer: logDepthBuf 
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(this.width / 2, this.height);
    renderer.setAnimationLoop(() => { this.render(); });
    container.appendChild(renderer.domElement);

    return { 
      scene: scene, 
      camera: camera,
      renderer: renderer, 
      container: container, 
    };
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
  }

  // 性能统计
  private initStats() {
    this.stats = new Stats();
    this.stats.dom.style.position = "absolute";
    this.stats.dom.style.bottom = "0px";
    this.stats.dom.style.top = "unset";
    this.container.appendChild(this.stats.dom);
  }

  // 核心 难点
  private render() {
    const first = this.labelData[0];
    const last = this.labelData[this.labelData.length - 1];
    const minzoom = first.size * first.scale * 1;
    const maxzoom = last.size * last.scale * 100;

    // 阻尼
    let damping = (Math.abs(this.zoomspeed) > this.minzoomspeed ? 0.95 : 1.0);

    // Zoom out faster the further out you go
    const zoom = THREE.MathUtils.clamp(Math.pow(Math.E, this.zoompos), minzoom, maxzoom);
    this.zoompos = Math.log(zoom);

    // Slow down quickly at the zoom limits
    if ((zoom == minzoom && this.zoomspeed < 0) || (zoom == maxzoom && this.zoomspeed > 0)) {
      damping = 0.85;
    }

    this.zoompos += this.zoomspeed;
    this.zoomspeed *= damping;

    const x = Math.sin(0.5 * Math.PI * (this.mouse[0] - 0.5)) * zoom;
    const y = Math.sin(0.25 * Math.PI * (this.mouse[1] - 0.5)) * zoom;
    const z = Math.cos(0.5 * Math.PI * (this.mouse[0] - 0.5)) * zoom;

    this.objects.normal.camera.position.set(x, y, z);
    this.objects.normal.camera.lookAt(this.objects.normal.scene.position);

    // Clone camera settings across both scenes
    // 位置
    const position = this.objects.normal.camera.position;
    // 四元数
    const quaternion = this.objects.normal.camera.quaternion;
    this.objects.logzbuf.camera.position.copy(position);
    this.objects.logzbuf.camera.quaternion.copy(quaternion);

    // Update renderer sizes if the split has changed
    if (this.splitRight != 1 - this.split) {
      this.resizeHandle();
    }

    this.objects.normal.renderer.render(
      this.objects.normal.scene, 
      this.objects.normal.camera
    );
    this.objects.logzbuf.renderer.render(
      this.objects.logzbuf.scene, 
      this.objects.logzbuf.camera
    );

    this.stats?.update();
  }

  private resizeHandle() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.aspect = this.width / this.height;

    this.splitRight = 1 - this.split;

    this.objects.normal.renderer.setSize(this.split * this.width, this.height);
    this.objects.normal.camera.aspect = this.split * this.aspect;
    // .updateProjectionMatrix () : undefined
    // 更新摄像机投影矩阵。在任何参数被改变以后必须被调用。
    this.objects.normal.camera.updateProjectionMatrix();
    this.objects.normal.camera.setViewOffset(
      this.width, 
      this.height, 
      0,
      0,
      this.width * this.split, 
      this.height,
    );
    this.objects.normal.container.style.width = (this.split * 100) + '%';

    this.objects.logzbuf.renderer.setSize(this.splitRight * this.width, this.height);
    this.objects.logzbuf.camera.aspect = this.splitRight * this.aspect;
    // .updateProjectionMatrix () : undefined
    // 更新摄像机投影矩阵。在任何参数被改变以后必须被调用。
    this.objects.logzbuf.camera.updateProjectionMatrix();
    this.objects.logzbuf.camera.setViewOffset(
      this.width, 
      this.height, 
      this.width * this.split, 
      0, 
      this.width * this.splitRight, 
      this.height,
    );
    this.objects.logzbuf.container.style.width = (this.splitRight * 100) + '%';

    this.border.style.left = (this.split * 100) + '%';
  }

  // 消除 副作用
  dispose() {
    window.cancelAnimationFrame(this.animateNumber);
    window.removeEventListener("resize", func);

    window.onwheel = null;
    window.onmousemove = null;
    this.border.onpointerdown = null;
  }

  // 处理自适应
  resize() {
    func = () => { this.resizeHandle };
    window.addEventListener("resize", func);
  }

  private bind() {
    this.border.onpointerdown = () => {
      window.onpointermove = (e) => {
        this.split = Math.max(0, Math.min(1, e.clientX / this.width));
      };

      window.onpointerup = () => {
        window.onpointermove = null;
        window.onpointerup = null;
      };
    };

    window.onmousemove = (e) => {
      this.mouse[0] = e.clientX / this.width;
      this.mouse[1] = e.clientY / this.height;
    };

    window.onwheel = (e) => {
      const amount = e.deltaY;
      if (amount === 0) { return; }

      this.zoomspeed = (amount / Math.abs(amount)) / 10;
      this.minzoomspeed = 0.001;
    };
  }
}

export default THREE;

