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
    this.controls.maxPolarAngle = Math.PI * 0.5;
    this.controls.target.set(0, 1, 0);
    this.controls.update();

    this.initGUI();
    this.initStats();
    this.resize();
  }

  // light
  private addLight() {
    const sunLight = new THREE.DirectionalLight(0xFFE499, 5);
    sunLight.castShadow = true;

    // 正交相机（OrthographicCamera）
    // left — 摄像机视锥体左侧面
    // right — 摄像机视锥体右侧面
    // top — 摄像机视锥体上侧面
    // bottom — 摄像机视锥体下侧面
    // near — 摄像机视锥体近端面
    // far — 摄像机视锥体远端面
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 3;
    sunLight.shadow.camera.right = 2;
    sunLight.shadow.camera.left = -2;
    sunLight.shadow.camera.top = 2;
    sunLight.shadow.camera.bottom = -2;

    // .mapSize : Vector2
    // 一个Vector2定义阴影贴图的宽度和高度。
    // 较高的值会以计算时间为代价提供更好的阴影质量。值必须是2的幂，直
    // 到给定设备的WebGLRenderer.capabilities.maxTextureSize， 虽然
    // 宽度和高度不必相同（例如，（512,1024）有效）。 默认值为（512,512）
    sunLight.shadow.mapSize.set(2048, 2048);
    // .bias : Float
    // 阴影贴图偏差，在确定曲面是否在阴影中时，从标准化深度添加或减去多少
    // 默认值为0.此处非常小的调整（大约0.0001）可能有助于减少阴影中的伪影
    sunLight.shadow.bias = -0.001;
    sunLight.position.set(1, 3, 1);

    
    const waterLight = new THREE.HemisphereLight(0x333366, 0x74ccf4, 5);
    const skyLight = new THREE.HemisphereLight(0x74ccf4, 0, 1);
    this.scene.add(sunLight, skyLight, waterLight);
  }

  // model
  private addModel() {
    const loader = new GLTFLoader();

    loader.load("/examples/models/gltf/Michelle.glb",(gltf) => {
      this.model = gltf.scene;
      this.model.children[0].children[0].castShadow = true;

      this.mixer = new THREE.AnimationMixer(this.model);
      // .clipAction (clip : AnimationClip, optionalRoot : Object3D) : AnimationAction
      // 返回所传入的剪辑参数的AnimationAction, 根对象参数可选，默认值为混合器的默认根对象。
      // 第一个参数可以是动画剪辑(AnimationClip)对象或者动画剪辑的名称。

      // 如果不存在符合传入的剪辑和根对象这两个参数的动作, 该方法将会创建一个。传入相同的参数
      // 多次调用将会返回同一个剪辑实例。
      const action = this.mixer.clipAction(gltf.animations[0]);
      action.play();

      this.scene.add(this.model);
    });
  }

  // objects
  private addObjects() {
    // 二十面缓冲几何体（IcosahedronGeometry）
    // IcosahedronGeometry(radius : Float, detail : Integer)
    // radius — 二十面体的半径，默认为1。
    // detail — 默认值为0。将这个值设为一个大于0的数将会为它增加一些顶点，
    // 使其不再是一个二十面体。当这个值大于1的时候，实际上它将变成一个球体。
    const geometry = new THREE.IcosahedronGeometry(1, 3);
    const count = 100, scale = 3.5, column = 10;

    for (let i = 0; i < count; i++) {
      const x = i % column, y = i / column;
      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.position.set(x * scale, 0, y * scale);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      this.objects.add(mesh);
    }

    const x = (((column - 1) * scale) * -0.5);
    const y = -0.3;
    const z = (((count / column) * scale) * -0.5);
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
    // 圆柱缓冲几何体（CylinderGeometry）
    // CylinderGeometry(
    //   radiusTop : Float, 
    //   radiusBottom : Float, 
    //   height : Float, 
    //   radialSegments : Integer, 
    //   heightSegments : Integer, 
    //   openEnded : Boolean, 
    //   thetaStart : Float, 
    //   thetaLength : Float
    // )
    // radiusTop — 圆柱的顶部半径，默认值是1;
    // radiusBottom — 圆柱的底部半径，默认值是1;
    // height — 圆柱的高度，默认值是1;
    // radialSegments — 圆柱侧面周围的分段数，默认为32;
    // heightSegments — 圆柱侧面沿着其高度的分段数，默认值为1;
    // openEnded — 一个Boolean值，指明该圆锥的底面是开放的还是封顶的。默认值为false，即其底面默认是封顶的;
    // thetaStart — 第一个分段的起始角度，默认为0。（three o'clock position）;
    // thetaLength — 圆柱底面圆扇区的中心角，通常被称为“θ”（西塔）。默认值是2*Pi，这使其成为一个完整的圆柱。
    const geometry = new THREE.CylinderGeometry(1.1, 1.1, 10);
    const material = new MeshStandardNodeMaterial({ colorNode: this.iceColorNode });
    this.floor = new THREE.Mesh(geometry, material);
    this.floor.position.set(0, -5, 0);
    this.scene.add(this.floor);

    const waterPosY = positionWorld.y.sub(this.water.position.y);
    let transition = waterPosY.add(0.1).saturate().oneMinus();
    transition = waterPosY.lessThan(0).cond(transition, normalWorld.y.mix(transition, 0)).toVar();

    const node1 = this.material.colorNode;
    const node2 = this.material.colorNode.add(this.waterLayer0);
    const colorNode = transition.mix(node1, node2);
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

  private initGUI() {
    this.gui.add(this.floorPosition, 'y', 0, 2, 0.001).name('地板位置');
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
    window.removeEventListener("resize", this.resizeHandle);
  }

  // 处理自适应
  resize() {
    window.addEventListener("resize", this.resizeHandle);
  }
}

export default THREE;

