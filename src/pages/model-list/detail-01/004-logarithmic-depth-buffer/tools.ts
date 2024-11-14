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
  private container: HTMLDivElement;
  private stats: null | Stats;
  private animateNumber: number;

  private NEAR: number;
  private FAR: number;
  private screensplit: number;
  private screensplit_right: number;
  private mouse: number[];
  private zoompos: number;
  private minzoomspeed: number;
  private zoomspeed: number;
  private border: HTMLDivElement;
  private normal: HTMLDivElement;
  private logzbuf: HTMLDivElement;
  private objects: {[key: string]: any};
  private labeldata: {size: number, scale: number, label: string}[];
  private gui: GUI;
  constructor(container: HTMLDivElement, option: {
    normal: HTMLDivElement,
    border: HTMLDivElement,
    logzbuf: HTMLDivElement,
  }) {
    this.container = container;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.stats = null;
    this.animateNumber = 0;

    this.gui = new GUI({
      title: "控制面板",
      autoPlace: false,
      container: this.container,
    });
    this.NEAR = 1e-6;
    this.FAR = 1e27;
    this.screensplit = 0.25
    this.screensplit_right = 0;
    this.mouse = [0.5, 0.5];
    this.zoompos = -100;
    this.minzoomspeed = 0.015
    this.zoomspeed = this.minzoomspeed;
    this.border = option.border;
    this.normal = option.normal;
    this.logzbuf = option.logzbuf;
    this.objects = {};
    this.labeldata = [
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

  private initScene(font: any) {
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0x777777));

    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(100, 100, 100);
    scene.add(light);

    const materialargs = {
      color: 0xffffff as (number | THREE.Color),
      specular: 0x050505,
      shininess: 50,
      emissive: 0x000000
    };

    const geometry = new THREE.SphereGeometry(0.5, 24, 12);

    for (let i = 0; i < this.labeldata.length; i++) {
      const scale = this.labeldata[i].scale || 1;
      const labelgeo = new TextGeometry(this.labeldata[i].label, {
        font: font,
        size: this.labeldata[i].size,
        height: this.labeldata[i].size / 2
      });

      labelgeo.computeBoundingSphere();
      if (labelgeo.boundingSphere) {
        labelgeo.translate(-labelgeo.boundingSphere.radius, 0, 0);
      }
      materialargs.color = new THREE.Color().setHSL(Math.random(), 0.5, 0.5);

      const material = new THREE.MeshPhongMaterial(materialargs);
      const group = new THREE.Group();
      group.position.z = - this.labeldata[i].size * scale;
      scene.add(group);

      const textmesh = new THREE.Mesh(labelgeo, material);
      textmesh.scale.set(scale, scale, scale);
      textmesh.position.z = - this.labeldata[i].size * scale;
      textmesh.position.y = this.labeldata[i].size / 4 * scale;
      group.add(textmesh);

      const dotmesh = new THREE.Mesh(geometry, material);
      dotmesh.position.y = - this.labeldata[i].size / 4 * scale;
      dotmesh.scale.multiplyScalar(this.labeldata[i].size * scale);
      group.add(dotmesh);
    }

    return scene;
  }

  private initView(scene: THREE.Scene, name: "normal" | "logzbuf", logDepthBuf: boolean) {
    const framecontainer = this[name];

    const aspect = (this.screensplit * this.width / this.height);
    const camera = new THREE.PerspectiveCamera(50, aspect, this.NEAR, this.FAR);
    scene.add(camera);

    const renderer = new WebGPURenderer({ 
      antialias: true, 
      logarithmicDepthBuffer: logDepthBuf 
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(this.width / 2, this.height);
    renderer.setAnimationLoop(() => { this.render(); });
    renderer.domElement.style.position = 'relative';
    renderer.domElement.id = 'renderer_' + name;
    framecontainer.appendChild(renderer.domElement);

    return { 
      container: framecontainer, 
      renderer: renderer, 
      scene: scene, 
      camera: camera 
    };
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
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

  private render() {
    const minzoom = this.labeldata[0].size * this.labeldata[0].scale * 1;
    const maxzoom = this.labeldata[this.labeldata.length - 1].size * this.labeldata[this.labeldata.length - 1].scale * 100;
    let damping = (Math.abs(this.zoomspeed) > this.minzoomspeed ? .95 : 1.0);

    // Zoom out faster the further out you go
    const zoom = THREE.MathUtils.clamp(Math.pow(Math.E, this.zoompos), minzoom, maxzoom);
    this.zoompos = Math.log(zoom);

    // Slow down quickly at the zoom limits
    if ((zoom == minzoom && this.zoomspeed < 0) || (zoom == maxzoom && this.zoomspeed > 0)) {
      damping = 0.85;
    }

    this.zoompos += this.zoomspeed;
    this.zoomspeed *= damping;

    this.objects.normal.camera.position.x = Math.sin(.5 * Math.PI * (this.mouse[0] - .5)) * zoom;
    this.objects.normal.camera.position.y = Math.sin(.25 * Math.PI * (this.mouse[1] - .5)) * zoom;
    this.objects.normal.camera.position.z = Math.cos(.5 * Math.PI * (this.mouse[0] - .5)) * zoom;
    this.objects.normal.camera.lookAt(this.objects.normal.scene.position);

    // Clone camera settings across both scenes
    this.objects.logzbuf.camera.position.copy(this.objects.normal.camera.position);
    this.objects.logzbuf.camera.quaternion.copy(this.objects.normal.camera.quaternion);

    // Update renderer sizes if the split has changed
    if (this.screensplit_right != 1 - this.screensplit) {
      this.resizeHandle();
    }

    this.objects.normal.renderer.render(this.objects.normal.scene, this.objects.normal.camera);
    this.objects.logzbuf.renderer.render(this.objects.logzbuf.scene, this.objects.logzbuf.camera);

    this.stats?.update();
  }

  private resizeHandle() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.screensplit_right = 1 - this.screensplit;

    this.objects.normal.renderer.setSize(this.screensplit * this.width, this.height);
    this.objects.normal.camera.aspect = this.screensplit * this.width / this.height;
    this.objects.normal.camera.updateProjectionMatrix();
    this.objects.normal.camera.setViewOffset(this.width, this.height, 0, 0, this.width * this.screensplit, this.height);
    this.objects.normal.container.style.width = (this.screensplit * 100) + '%';

    this.objects.logzbuf.renderer.setSize(this.screensplit_right * this.width, this.height);
    this.objects.logzbuf.camera.aspect = this.screensplit_right * this.width / this.height;
    this.objects.logzbuf.camera.updateProjectionMatrix();
    this.objects.logzbuf.camera.setViewOffset(this.width, this.height, this.width * this.screensplit, 0, this.width * this.screensplit_right, this.height);
    this.objects.logzbuf.container.style.width = (this.screensplit_right * 100) + '%';

    this.border.style.left = (this.screensplit * 100) + '%';
  }

  // 消除 副作用
  dispose() {
    window.cancelAnimationFrame(this.animateNumber);
    window.removeEventListener("resize", func);

    window.onwheel = null;
    window.onmousemove = null;
    window.onpointerdown = null;
  }

  // 处理自适应
  resize() {
    func = () => { this.resizeHandle };
    window.addEventListener("resize", func);
  }

  private bind() {
    window.onpointerdown = () => {
      window.onpointermove = (e) => {
        this.screensplit = Math.max(0, Math.min(1, e.clientX / this.width));
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

      const dir = amount / Math.abs(amount);
      this.zoomspeed = dir / 10;
      this.minzoomspeed = 0.001;
    };
  }
}

export default THREE;

