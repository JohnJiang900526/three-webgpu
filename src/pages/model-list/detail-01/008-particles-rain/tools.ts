import * as THREE from 'three';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WebGPURenderer from '@/common/jsm/renderers/webgpu/WebGPURenderer.js';
import { 
  tslFn, texture, uv, uint, positionWorld, 
  modelWorldMatrix, cameraViewMatrix, timerLocal, 
  timerDelta, cameraProjectionMatrix, vec2, 
  instanceIndex, positionGeometry, storage, 
  MeshBasicNodeMaterial, If, 
  ComputeNode
} from '@/common/jsm/nodes/Nodes.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';


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
  private instanceCount: number;
  private computeParticles: null | ComputeNode;
  private monkey: THREE.Mesh;
  private clock: THREE.Clock;
  private collisionBox: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private collisionCamera: THREE.OrthographicCamera;
  private collisionPosRT: THREE.RenderTarget;
  private collisionPosMaterial: null | MeshBasicNodeMaterial;
  private collisionBoxPos: THREE.Vector3;
  private collisionBoxPosUI: THREE.Vector3;
  private rainParticles: null | THREE.InstancedMesh;
  private rippleParticles: null | THREE.InstancedMesh;
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
    this.maxParticleCount = 50000;
    this.instanceCount = (this.maxParticleCount / 2);
    this.computeParticles = null;
    this.monkey = new THREE.Mesh();
    this.clock = new THREE.Clock();
    this.collisionBox = new THREE.Mesh(
      new THREE.BoxGeometry(30, 1, 15), 
      new THREE.MeshStandardMaterial(),
    );
    this.collisionCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 50);
    this.collisionPosRT = new THREE.RenderTarget(1024, 1024);
    this.collisionPosMaterial = new MeshBasicNodeMaterial();
    this.collisionBoxPos = new THREE.Vector3();
    this.collisionBoxPosUI = new THREE.Vector3();
    this.rainParticles = null;
    this.rippleParticles = null;
  }

  init() {
    // 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x333333);

    // 相机
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 110);
    this.camera.position.set(40, 8, 0);
    this.camera.lookAt(0, 0, 0);

    // 渲染器
    this.createRenderer();
    // 创建灯光
    this.createLight();
    // 创建碰撞
    this.createCollision();
    // 核心计算
    this.compute();
    // 创建地板
    this.createFloor();
    // 创建碰撞箱体
    this.createBox();
    // 加载缓冲区
    this.loadBuffer();

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer?.domElement);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.enableDamping = true;
    this.controls.update();

    this.initStats();
    this.initGUI();
    this.resize();
  }

  private initGUI() {
    this.gui.add(this.collisionBoxPosUI, 'z', -50, 50, 0.001).name('位置');
    this.gui.add(this.collisionBox.scale, 'x', 0.1, 3.5, 0.01).name('缩放');
    this.gui.add(this.rainParticles!, 'count', 200, this.maxParticleCount, 1).name('雨滴个数').onChange((v: number) => {
      this.rippleParticles!.count = v;
    });
    this.gui.show();
  }

  private loadBuffer() {
    const loader = new THREE.BufferGeometryLoader();
    const url = "/examples/models/json/suzanne_buffergeometry.json";
    loader.load(url, (geometry) => {
      geometry.computeVertexNormals();
      this.monkey = new THREE.Mesh(
        geometry, 
        new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 })
      );
      this.monkey.receiveShadow = true;
      this.monkey.scale.setScalar(5);
      this.monkey.rotation.y = Math.PI / 2;
      this.monkey.position.y = 4.5;
      // add to collision layer
      this.monkey.layers.enable(1);
      this.scene.add(this.monkey);
    });
  }

  private createBox() {
    this.collisionBox = new THREE.Mesh(
      new THREE.BoxGeometry(30, 1, 15), 
      new THREE.MeshStandardMaterial()
    );
    this.collisionBox.material.color.set(0x333333);
    this.collisionBox.position.y = 12;
    this.collisionBox.scale.x = 3.5;
    this.collisionBox.layers.enable(1);
    this.collisionBox.castShadow = true;
    this.scene.add(this.collisionBox);

    this.collisionBoxPosUI = new THREE.Vector3().copy(this.collisionBox.position);
  }

  private createFloor() {
    const geometry = new THREE.PlaneGeometry(1000, 1000);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const plane = new THREE.Mesh(geometry, material);

    this.scene.add(plane);
  }

  private compute() {
    const createBuffer = (type = 'vec3') => storage(
      new THREE.InstancedBufferAttribute(new Float32Array(this.maxParticleCount * 4), 4), 
      type, 
      this.maxParticleCount
    );
    const positionBuffer = createBuffer();
    const velocityBuffer = createBuffer();
    const ripplePositionBuffer = createBuffer();
    const rippleTimeBuffer = createBuffer();

    const timer = timerLocal();
    const randUint = () => uint(Math.random() * 0xFFFFFF);

    const computeInit = tslFn(() => {
      const position = positionBuffer.element(instanceIndex);
      const velocity = velocityBuffer.element(instanceIndex);
      const rippleTime = rippleTimeBuffer.element(instanceIndex);

      const randX = instanceIndex.hash();
      const randY = instanceIndex.add(randUint()).hash();
      const randZ = instanceIndex.add(randUint()).hash();

      position.x = randX.mul(100).add(-50);
      position.y = randY.mul(25);
      position.z = randZ.mul(100).add(-50);

      velocity.y = randX.mul(-0.04).add(-0.2);
      rippleTime.x = 1000;
    })().compute(this.maxParticleCount);

    const computeUpdate = tslFn(() => {
      const getCoord = (pos: any) => pos.add(50).div(100);
      const position = positionBuffer.element(instanceIndex);
      const velocity = velocityBuffer.element(instanceIndex);
      const ripplePosition = ripplePositionBuffer.element(instanceIndex);
      const rippleTime = rippleTimeBuffer.element(instanceIndex);

      position.addAssign(velocity);
      rippleTime.x = rippleTime.x.add(timerDelta().mul(4));

      const collisionArea = texture(this.collisionPosRT.texture, getCoord(position.xz));
      const surfaceOffset = .05;
      const floorPosition = collisionArea.y.add(surfaceOffset);

      // floor
      const ripplePivotOffsetY = -0.9;
      If(position.y.add(ripplePivotOffsetY).lessThan(floorPosition), () => {
        position.y = 25;

        ripplePosition.x = position.x;
        ripplePosition.y = floorPosition;
        ripplePosition.z = position.z;

        // reset hit time: x = time
        rippleTime.x = 1;
        // next drops will not fall in the same place
        position.x = instanceIndex.add(timer).hash().mul(100).add(- 50);
        position.z = instanceIndex.add(timer.add(randUint())).hash().mul(100).add(- 50);
      });

      const rippleOnSurface = texture(this.collisionPosRT.texture, getCoord(ripplePosition.xz));
      const rippleFloorArea = rippleOnSurface.y.add(surfaceOffset);
      If(ripplePosition.y.greaterThan(rippleFloorArea), () => {
        rippleTime.x = 1000;
      });
    });
    this.computeParticles = computeUpdate().compute(this.maxParticleCount);

    const billboarding = tslFn(() => {
      const particlePosition = positionBuffer.toAttribute();
      const worldMatrix = modelWorldMatrix.toVar();

      worldMatrix[3][0] = particlePosition.x;
      worldMatrix[3][1] = particlePosition.y;
      worldMatrix[3][2] = particlePosition.z;

      const modelViewMatrix = cameraViewMatrix.mul(worldMatrix);
      modelViewMatrix[0][0] = 1;
      modelViewMatrix[0][1] = 0;
      modelViewMatrix[0][2] = 0;

      //modelViewMatrix[ 0 ][ 0 ] = modelWorldMatrix[ 0 ].length();
      //modelViewMatrix[ 1 ][ 1 ] = modelWorldMatrix[ 1 ].length();

      modelViewMatrix[2][0] = 0;
      modelViewMatrix[2][1] = 0;
      modelViewMatrix[2][2] = 1;
      return cameraProjectionMatrix.mul(modelViewMatrix).mul(positionGeometry);
    });

    const rainMaterial = new MeshBasicNodeMaterial();
    rainMaterial.colorNode = uv().distance(vec2(.5, 0)).oneMinus().mul(3).exp().mul(.1);
    rainMaterial.vertexNode = billboarding();
    rainMaterial.opacity = 0.2;
    rainMaterial.side = THREE.DoubleSide;
    rainMaterial.forceSinglePass = true;
    rainMaterial.depthWrite = false;
    rainMaterial.depthTest = true;
    rainMaterial.transparent = true;

    this.rainParticles = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.1, 2), 
      rainMaterial, 
      this.instanceCount,
    );
    this.scene.add(this.rainParticles);

    const rippleTime = rippleTimeBuffer.element(instanceIndex).x;
    const rippleEffect = tslFn(() => {
      const center = uv().add(vec2(-.5)).length().mul(7);
      const distance = rippleTime.sub(center);
      return distance.min(1).sub(distance.max(1).sub(1));
    });

    const rippleMaterial = new MeshBasicNodeMaterial();
    rippleMaterial.colorNode = rippleEffect();
    rippleMaterial.positionNode = positionGeometry.add(ripplePositionBuffer.toAttribute());
    rippleMaterial.opacityNode = rippleTime.mul(0.3).oneMinus().max(0).mul(.5);
    rippleMaterial.side = THREE.DoubleSide;
    rippleMaterial.forceSinglePass = true;
    rippleMaterial.depthWrite = false;
    rippleMaterial.depthTest = true;
    rippleMaterial.transparent = true;

    // 涟漪几何
    const surfaceRippleGeometry = new THREE.PlaneGeometry(2.5, 2.5);
    surfaceRippleGeometry.rotateX(-Math.PI / 2);

    const xRippleGeometry = new THREE.PlaneGeometry(1, 2);
    xRippleGeometry.rotateY(-Math.PI / 2);

    const zRippleGeometry = new THREE.PlaneGeometry(1, 2);
    const rippleGeometry = BufferGeometryUtils.mergeGeometries([
      surfaceRippleGeometry,
      xRippleGeometry,
      zRippleGeometry,
    ]);

    this.rippleParticles = new THREE.InstancedMesh(rippleGeometry, rippleMaterial, this.instanceCount);
    this.scene.add(this.rippleParticles);

    this.renderer?.compute(computeInit);
  }

  private createCollision() {
    this.collisionCamera.position.y = 50;
    this.collisionCamera.lookAt(0, 0, 0);
    this.collisionCamera.layers.disableAll();
    this.collisionCamera.layers.enable(1);

    this.collisionPosRT = new THREE.RenderTarget(1024, 1024);
    this.collisionPosRT.texture.type = THREE.HalfFloatType;

    this.collisionPosMaterial = new MeshBasicNodeMaterial();
    this.collisionPosMaterial.colorNode = positionWorld;
  }

  private createLight() {
    const ambient = new THREE.AmbientLight(0x111111);

    const light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.castShadow = true;
    light.position.set(3, 17, 17);
    light.castShadow = true;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50;
    light.shadow.camera.right = 25;
    light.shadow.camera.left = -25;
    light.shadow.camera.top = 25;
    light.shadow.camera.bottom = -25;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.bias = -0.01;

    this.scene.add(ambient, light);
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
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
    {
      const delta = this.clock.getDelta();
      if (this.monkey) {
        this.monkey.rotation.y += delta;
      }
      this.collisionBoxPos.set(
        this.collisionBoxPosUI.x, 
        this.collisionBoxPosUI.y, 
        -this.collisionBoxPosUI.z
      );
      this.collisionBox.position.lerp(this.collisionBoxPos, 10 * delta);

      this.scene.overrideMaterial = this.collisionPosMaterial;
      this.renderer?.setRenderTarget(this.collisionPosRT);
      this.renderer?.render(this.scene, this.collisionCamera);

      if (this.computeParticles) {
        this.renderer?.compute(this.computeParticles);
      }

      this.scene.overrideMaterial = null;
      this.renderer?.setRenderTarget(null);
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

