import * as THREE from 'three';
import GUI from 'lil-gui';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  computeShaderPosition, computeShaderVelocity, 
  particleFragmentShader, particleVertexShader,
} from './vars';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import type { IUniform } from 'three';

export class Model {
  private width: number;
  private height: number;
  private aspect: number;
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private renderer: null | THREE.WebGLRenderer;
  private camera: null | THREE.PerspectiveCamera;
  private stats: null | Stats;
  private animateNumber: number;

  private controls: null | OrbitControls;
  private gui: GUI;
  private computeShaderPosition: string;
  private computeShaderVelocity: string;
  private particleVertexShader: string;
  private particleFragmentShader: string;

  private geometry: THREE.BufferGeometry;
  private WIDTH: number;
  private PARTICLES: number;
  private gpuCompute: null | GPUComputationRenderer;
  private velocityVariable: any;
  private positionVariable: any;
  private velocityUniforms: { [uniform: string]: IUniform };
  private particleUniforms: { [uniform: string]: IUniform };
  private params: {
    gravityConstant: number;
    density: number;
    radius: number;
    height: number;
    exponent: number;
    maxMass: number;
    velocity: number;
    velocityExponent: number;
    randVelocity: number;
  }
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
      autoPlace: true,
      container: this.container,
    });
    this.gui.hide();
    this.computeShaderPosition = computeShaderPosition;
    this.computeShaderVelocity = computeShaderVelocity;
    this.particleVertexShader = particleVertexShader;
    this.particleFragmentShader = particleFragmentShader;

    this.geometry = new THREE.BufferGeometry();
    this.WIDTH = 64;
    this.PARTICLES = this.WIDTH * this.WIDTH;
    this.gpuCompute = null;
    this.velocityVariable = {};
    this.positionVariable = {};
    this.velocityUniforms = {};
    this.particleUniforms = {};

    this.params = {
      gravityConstant: 100.0,
      density: 0.45,
      radius: 300,
      height: 8,
      exponent: 0.4,
      maxMass: 15.0,
      velocity: 70,
      velocityExponent: 0.2,
      randVelocity: 0.001
    };
  }

  init() {
    // 场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x333333);

    // 相机
    this.camera = new THREE.PerspectiveCamera(75, this.aspect, 5, 15000);
    this.camera.position.y = 120;
    this.camera.position.z = 400;

    // 渲染器
    this.createRenderer();
    // init gpu
    this.initComputeRenderer();
    // init model
    this.generatePlanets();
    this.changeHandle();

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer?.domElement);
    this.controls.minDistance = 100;
    this.controls.maxDistance = 1000;
    this.controls.enableDamping = true;
    this.controls.update();

    this.setGUI();
    this.initStats();
    this.animate();
    this.resize();
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
  }

  private setGUI() {
    const folder1 = this.gui.addFolder('动态参数');
    folder1.add(this.params, 'gravityConstant', 0.0, 1000.0, 0.05).name("引力常数").onChange(() => {
      this.changeHandle();
    });
    folder1.add(this.params, 'density', 0.0, 10.0, 0.001).name("密度").onChange(() => {
      this.changeHandle();
    });

    const folder2 = this.gui.addFolder('静态参数');
    folder2.add(this.params, 'radius', 10.0, 1000.0, 1.0).name("圆角");
    folder2.add(this.params, 'height', 0.0, 50.0, 0.01).name("高度");
    folder2.add(this.params, 'exponent', 0.0, 2.0, 0.001).name("指数");
    folder2.add(this.params, 'maxMass', 1.0, 50.0, 0.1).name("最大质量");
    folder2.add(this.params, 'velocity', 0.0, 150.0, 0.1).name("速度");
    folder2.add(this.params, 'velocityExponent', 0.0, 1.0, 0.01).name("速度指数");
    folder2.add(this.params, 'randVelocity', 0.0, 50.0, 0.1).name("rand 速度");

    const buttonRestart = {
      restart: () => {
        this.restartHandle();
      }
    };

    folder2.add(buttonRestart, 'restart').name("重新启动");

    this.gui.close();
  }

  private changeHandle() {
    // 速度参数设置
    this.velocityUniforms['gravityConstant'].value = this.params.gravityConstant;
    this.velocityUniforms['density'].value = this.params.density;

    // 粒子参数设置
    this.particleUniforms['density'].value = this.params.density;
  }

  private fillTextures(PTexture: THREE.DataTexture, VTexture: THREE.DataTexture) {
    const position = PTexture.image.data;
    const velocity = VTexture.image.data;

    const radius = this.params.radius;
    const height = this.params.height;
    const exponent = this.params.exponent;
    const maxMass = this.params.maxMass * 1024 / this.PARTICLES;
    const maxVel = this.params.velocity;
    const velExponent = this.params.velocityExponent;
    const randVel = this.params.randVelocity;

    for (let i = 0; i < position.length; i += 4) {
      // 位置
      let x, z, rr;

      do {
        x = (Math.random() * 2 - 1);
        z = (Math.random() * 2 - 1);
        rr = x * x + z * z;
      } while (rr > 1);
      rr = Math.sqrt(rr);

      const rExp = radius * Math.pow(rr, exponent);

      // 速度
      const vel = maxVel * Math.pow(rr, velExponent);
      const vx = vel * z + (Math.random() * 2 - 1) * randVel;
      const vy = (Math.random() * 2 - 1) * randVel * 0.05;
      const vz = - vel * x + (Math.random() * 2 - 1) * randVel;
      const vw = Math.random() * maxMass + 1;

      x *= rExp;
      z *= rExp;
      const y = (Math.random() * 2 - 1) * height;

      // 位置
      position[i + 0] = x;
      position[i + 1] = y;
      position[i + 2] = z;
      position[i + 3] = 1;

      // 速度
      velocity[i + 0] = vx;
      velocity[i + 1] = vy;
      velocity[i + 2] = vz;
      velocity[i + 3] = vw;
    }
  }

  private initComputeRenderer() {
    this.gpuCompute = new GPUComputationRenderer(this.WIDTH, this.WIDTH, this.renderer!);

    if (this.renderer!.capabilities.isWebGL2 === false) {
      this.gpuCompute.setDataType(THREE.HalfFloatType);
    }

    const dtPosition = this.gpuCompute.createTexture();
    const dtVelocity = this.gpuCompute.createTexture();

    // 填充材质
    this.fillTextures(dtPosition, dtVelocity);

    const tVelocity = this.computeShaderVelocity;
    this.velocityVariable = this.gpuCompute.addVariable('textureVelocity', tVelocity, dtVelocity);
    
    const tPosition = this.computeShaderPosition;
    this.positionVariable = this.gpuCompute.addVariable('texturePosition', tPosition, dtPosition);

    this.gpuCompute.setVariableDependencies(this.velocityVariable, [this.positionVariable, this.velocityVariable]);
    this.gpuCompute.setVariableDependencies(this.positionVariable, [this.positionVariable, this.velocityVariable]);

    this.velocityUniforms = this.velocityVariable.material.uniforms;
    this.velocityUniforms['gravityConstant'] = { value: 0.0 };
    this.velocityUniforms['density'] = { value: 0.0 };

    const error = this.gpuCompute.init();
    if (error !== null) { console.error(error); }
  }

  private getCameraConstant(camera: THREE.PerspectiveCamera) {
    return this.height / (Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * camera.fov) / camera.zoom);
  }

  // 创建 行星
  private generatePlanets() {
    const positions = new Float32Array(this.PARTICLES * 3);
    let p = 0;
    for (let i = 0; i < this.PARTICLES; i++) {
      positions[p++] = (Math.random() * 2 - 1) * this.params.radius;
      positions[p++] = 0;
      positions[p++] = (Math.random() * 2 - 1) * this.params.radius;
    }

    const uvs = new Float32Array(this.PARTICLES * 2);
    p = 0;
    for (let j = 0; j < this.WIDTH; j++) {
      for (let i = 0; i < this.WIDTH; i++) {
        uvs[p++] = i / (this.WIDTH - 1);
        uvs[p++] = j / (this.WIDTH - 1);
      }
    }

    const positionAttr = new THREE.BufferAttribute(positions, 3);
    this.geometry.setAttribute('position', positionAttr);

    const uvAttr = new THREE.BufferAttribute(uvs, 2);
    this.geometry.setAttribute('uv', uvAttr);

    this.particleUniforms = {
      'density': { value: 0.0 },
      'texturePosition': { value: null },
      'textureVelocity': { value: null },
      'cameraConstant': { value: this.getCameraConstant(this.camera!) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.particleUniforms,
      vertexShader: this.particleVertexShader,
      fragmentShader: this.particleFragmentShader,
    });
    material.extensions.drawBuffers = true;

    const particles = new THREE.Points(this.geometry, material);
    particles.matrixAutoUpdate = false;
    particles.updateMatrix();
    this.scene.add(particles);
  }

  // 重新启动 仿真
  private restartHandle() {
    const dtPosition = this.gpuCompute!.createTexture();
    const dtVelocity = this.gpuCompute!.createTexture();

    this.fillTextures(dtPosition, dtVelocity);
    // 位置
    this.gpuCompute!.renderTexture(dtPosition, this.positionVariable.renderTargets[0]);
    this.gpuCompute!.renderTexture(dtPosition, this.positionVariable.renderTargets[1]);

    // 速度
    this.gpuCompute!.renderTexture(dtVelocity, this.velocityVariable.renderTargets[0]);
    this.gpuCompute!.renderTexture(dtVelocity, this.velocityVariable.renderTargets[1]);
  }

  // 创建渲染器
  private createRenderer() {
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);
  }

  // 性能统计
  private initStats() {
    // @ts-ignore
    this.stats = new Stats();
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
    this.animateNumber && window.cancelAnimationFrame(this.animateNumber);
    this.animateNumber = window.requestAnimationFrame(() => { this.animate(); });

    this.stats?.update();
    this.controls?.update();

    {
      this.gpuCompute!.compute();

      const texturePosition = this.gpuCompute!.getCurrentRenderTarget(this.positionVariable).texture;
      this.particleUniforms['texturePosition'].value = texturePosition;

      const textureVelocity = this.gpuCompute!.getCurrentRenderTarget(this.velocityVariable).texture;
      this.particleUniforms['textureVelocity'].value = textureVelocity;
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
      this.particleUniforms['cameraConstant'].value = this.getCameraConstant(this.camera!);

      this.renderer!.setSize(this.width, this.height);
    };
  }
}

export default THREE;

