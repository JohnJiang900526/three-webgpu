import * as THREE from 'three';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import WebGPURenderer from '@/common/jsm/renderers/webgpu/WebGPURenderer.js';
import { 
  tslFn, uniform, storage, attribute, 
  float, vec2, vec3, color, instanceIndex, 
  PointsNodeMaterial 
} from '@/common/jsm/nodes/Nodes.js';

export class Model {
  private width: number;
  private height: number;
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private renderer: null | WebGPURenderer;
  private camera: null | THREE.OrthographicCamera;
  private stats: null | Stats;
  private animateNumber: number;

  private gui: GUI;
  private computeNode: any;
  private pointerVector: THREE.Vector2;
  private scaleVector: THREE.Vector2;
  constructor(container: HTMLDivElement) {
    this.container = container;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.scene = new THREE.Scene();
    this.renderer = null;
    this.camera = null;
    this.stats = null;
    this.animateNumber = 0;

    this.gui = new GUI({
      title: "控制面板",
      autoPlace: false,
      container: this.container,
    });
    this.computeNode = null;
    this.pointerVector = new THREE.Vector2(-10.0, -10.0);
    this.scaleVector = new THREE.Vector2(1, 1);
  }

  init() {
    // 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x333333);

    // 相机
    this.camera = new THREE.OrthographicCamera(-1.0, 1.0, 1.0, -1.0, 0, 1);
    this.camera.position.z = 1;

    // 渲染器
    this.createRenderer();
    // particles
    this.createParticles();

    this.initStats();
    this.initGUI();
    this.bind();
    this.resize();
  }

  private initGUI() {
    this.gui.add(this.scaleVector, 'x', 0, 1, 0.01);
    this.gui.add(this.scaleVector, 'y', 0, 1, 0.01);
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
  }

  private createParticles() {
    // initialize particles
    const particleNum = 300000;
    // vec2
    const particleSize = 2;

    const particleArray = new Float32Array(particleNum * particleSize);
    const velocityArray = new Float32Array(particleNum * particleSize);

    // create buffers
    const particleBuffer = new THREE.InstancedBufferAttribute(particleArray, 2);
    const velocityBuffer = new THREE.InstancedBufferAttribute(velocityArray, 2);

    const particleBufferNode = storage(particleBuffer, 'vec2', particleNum);
    const velocityBufferNode = storage(velocityBuffer, 'vec2', particleNum);

    // create function
    const computeShaderFn = tslFn(() => {
      const particle = particleBufferNode.element(instanceIndex);
      const velocity = velocityBufferNode.element(instanceIndex);

      const pointer = uniform(this.pointerVector);
      const limit = uniform(this.scaleVector);

      const position = particle.add(velocity).temp();

      velocity.x = position.x.abs().greaterThanEqual(limit.x).cond(velocity.x.negate(), velocity.x);
      velocity.y = position.y.abs().greaterThanEqual(limit.y).cond(velocity.y.negate(), velocity.y);
      position.assign(position.min(limit).max(limit.negate()));

      const pointerSize = 0.05;
      const distanceFromPointer = pointer.sub(position).length();
      particle.assign(distanceFromPointer.lessThanEqual(pointerSize).cond(vec3(), position));
    });

    // compute
    this.computeNode = computeShaderFn().compute(particleNum);
    this.computeNode.onInit = (e: any) => {
      const precomputeShaderNode = tslFn(() => {
        const particleIndex = float(instanceIndex);
        const randomAngle = particleIndex.mul(.005).mul(Math.PI * 2);
        const randomSpeed = particleIndex.mul(0.00000001).add(0.0000001);

        const velX = randomAngle.sin().mul(randomSpeed);
        const velY = randomAngle.cos().mul(randomSpeed);
        const velocity = velocityBufferNode.element(instanceIndex);
        velocity.xy = vec2(velX, velY);
      });

      e.renderer.compute(precomputeShaderNode().compute(particleNum));
    };

    // use a compute shader to animate the point cloud's vertex data.
    const particleNode = attribute('particle', 'vec2');
    const pointsGeometry = new THREE.BufferGeometry();

    // single vertex ( not triangle )
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3)); 
    // dummy the position points as instances
    pointsGeometry.setAttribute('particle', particleBuffer); 
    // force render points as instances ( not triangle )
    pointsGeometry.drawRange.count = 1; 

    const pointsMaterial = new PointsNodeMaterial();
    pointsMaterial.colorNode = particleNode.add(color(0xFFFFFF));
    pointsMaterial.positionNode = particleNode;

    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    // @ts-ignore
    points.count = particleNum;
    // @ts-ignore
    points.isInstancedMesh = true;
    this.scene.add(points);
  }

  // 创建渲染器
  private createRenderer() {
    this.renderer = new WebGPURenderer({antialias: true});
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

    // 执行渲染
    if (this.computeNode) {
      this.renderer?.compute(this.computeNode);
    }
    this.renderer?.render(this.scene, this.camera!);
  }

  private resizeHandle() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    // 更新摄像机投影矩阵。在任何参数被改变以后必须被调用。
    this.camera!.updateProjectionMatrix();

    this.renderer!.setSize(this.width, this.height);
  }

  // 消除 副作用
  dispose() {
    window.cancelAnimationFrame(this.animateNumber);
    window.onresize = null;
    this.container.onmousemove = null;
  }

  private bind() {
    this.container.onmousemove = (e) => {
      const x = e.clientX;
      const y = e.clientY;

      const width = this.width;
      const height = this.height;

      const a = (x / width - 0.5) * 2.0;
      const b = (-y / height + 0.5) * 2.0;
      this.pointerVector.set(a, b);
    };
  }

  // 处理自适应
  resize() {
    window.onresize = () => {
      this.resizeHandle();
    };
  }
}

export default THREE;

