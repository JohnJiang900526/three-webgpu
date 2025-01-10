import * as THREE from 'three';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WebGPURenderer from '@/common/jsm/renderers/webgpu/WebGPURenderer.js';
import { 
  tslFn, uniform, texture, 
  instanceIndex, float, vec3, 
  storage, SpriteNodeMaterial, If, 
  UniformNode,
  ComputeNode
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
  private particleCount: number;
  private gravity: UniformNode;
  private bounce: UniformNode;
  private friction: UniformNode;
  private size: UniformNode;
  private clickPosition: UniformNode;
  private computeParticles: null | ComputeNode;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private computeHit: null | ComputeNode;
  private plane: THREE.Mesh;
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
    this.particleCount = 1000000;
    this.gravity = uniform(-0.0098) as UniformNode;
    this.bounce = uniform(0.8) as UniformNode;
    this.friction = uniform(0.99) as UniformNode;
    this.size = uniform(0.12) as UniformNode;
    this.clickPosition = uniform(new THREE.Vector3());
    this.computeParticles = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.computeHit = null;
    this.plane = new THREE.Mesh();
  }

  init() {
    // 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x333333);

    // 相机
    this.camera = new THREE.PerspectiveCamera(50, this.aspect, 0.1, 1000);
    this.camera.position.set(15, 30, 15);

    // 渲染器
    this.createRenderer();

    this.createParticles();
    this.createMesh();

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer?.domElement);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.bind();
    this.initGUI();
    this.initStats();
    this.resize();
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
  }

  private initGUI() {
    this.gui.add(this.gravity, 'value', -0.0098, 0, 0.0001).name('gravity');
    this.gui.add(this.bounce, 'value', 0.1, 1, 0.01).name('bounce');
    this.gui.add(this.friction, 'value', 0.96, 0.99, 0.01).name('friction');
    this.gui.add(this.size, 'value', 0.12, 0.5, 0.01).name('size');
    this.gui.show();
  }

  // 创建粒子
  private createParticles() {
    // 材质
    const loader = new THREE.TextureLoader();
    const map = loader.load('/examples/textures/sprite1.png');

    // 缓冲区
    const createBuffer = () => storage(
      new THREE.InstancedBufferAttribute(new Float32Array(this.particleCount * 4), 4), 
      'vec3', 
      this.particleCount
    );
    const positionBuffer = createBuffer();
    const velocityBuffer = createBuffer();
    const colorBuffer = createBuffer();

    // 计算
    const computeInit = tslFn(() => {
      const position = positionBuffer.element(instanceIndex);
      const color = colorBuffer.element(instanceIndex);

      const randX = instanceIndex.hash();
      const randY = instanceIndex.add(2).hash();
      const randZ = instanceIndex.add(3).hash();

      position.x = randX.mul(100).add(- 50);
      position.y = 0; // randY.mul( 10 );
      position.z = randZ.mul(100).add(- 50);

      color.assign(vec3(randX, randY, randZ));
    })().compute(this.particleCount);

    //
    const computeUpdate = tslFn(() => {
      const position = positionBuffer.element(instanceIndex);
      const velocity = velocityBuffer.element(instanceIndex);

      velocity.addAssign(vec3(0.00, this.gravity, 0.00));
      position.addAssign(velocity);
      velocity.mulAssign(this.friction);
      // floor
      If(position.y.lessThan(0), () => {
        position.y = 0;
        velocity.y = velocity.y.negate().mul(this.bounce);
        // floor friction
        velocity.x = velocity.x.mul(.9);
        velocity.z = velocity.z.mul(.9);
      });
    });

    this.computeParticles = computeUpdate().compute(this.particleCount);
    // 创建节点
    const textureNode = texture(map);

    // 创建粒子
    const particleMaterial = new SpriteNodeMaterial();
    particleMaterial.colorNode = textureNode.mul(colorBuffer.element(instanceIndex));
    particleMaterial.positionNode = positionBuffer.toAttribute();
    particleMaterial.scaleNode = this.size;
    particleMaterial.depthWrite = false;
    particleMaterial.depthTest = true;
    particleMaterial.transparent = true;

    const geometry = new THREE.PlaneGeometry(1, 1);
    const particles = new THREE.InstancedMesh(geometry, particleMaterial, this.particleCount);
    particles.frustumCulled = false;
    this.scene.add(particles);

    this.renderer?.compute(computeInit);

    this.computeHit = tslFn(() => {
      const position = positionBuffer.element(instanceIndex);
      const velocity = velocityBuffer.element(instanceIndex);

      const dist = position.distance(this.clickPosition);
      const direction = position.sub(this.clickPosition).normalize();
      const distArea = float(6).sub(dist).max(0);

      const power = distArea.mul(.01);
      const relativePower = power.mul(instanceIndex.hash().mul(.5).add(.5));

      velocity.assign(velocity.add(direction.mul(relativePower)));
    })().compute(this.particleCount);
  }

  private createMesh() {
    const helper = new THREE.GridHelper(60, 40, 0x303030, 0x303030);
    this.scene.add(helper);

    const geometry = new THREE.PlaneGeometry(1000, 1000);
    geometry.rotateX(-Math.PI / 2);

    this.plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: false }));
    this.scene.add(this.plane);
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

  private bind() {
    this.container.onpointermove = (e) => {
      this.pointer.set((e.clientX / this.width) * 2 - 1, - (e.clientY / this.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera!);
      const intersects = this.raycaster.intersectObjects([this.plane], false);

      if (intersects.length > 0) {
        const { point } = intersects[0];
        // move to uniform
        this.clickPosition.value.copy(point);
        this.clickPosition.value.y = -1;
        // compute
        this.renderer?.compute(this.computeHit);
      }
    };
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

    // 执行渲染
    this.renderer?.compute(this.computeParticles);
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
    this.container.onpointermove = null;
  }

  // 处理自适应
  resize() {
    window.onresize = () => { this.resizeHandle(); };
  }
}

export default THREE;

