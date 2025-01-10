import * as THREE from 'three';
import GUI from 'lil-gui';
import Stats from 'stats.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WebGPURenderer from '@/common/jsm/renderers/webgpu/WebGPURenderer.js';
import { 
  tslFn, uniform, storage, instanceIndex, 
  float, texture, viewportTopLeft, color,
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
  private computeNode: any;
  private waveBuffer: any;
  private sampleRate: number;
  private waveGPUBuffer: null | THREE.InstancedBufferAttribute;
  private currentAudio: null | AudioBufferSourceNode;
  private currentAnalyser: null | AnalyserNode;
  private analyserBuffer: Uint8Array;
  private analyserTexture: null | THREE.DataTexture;
  private pitch: any;
  private delayVolume: any;
  private delayOffset: any;
  private loading: boolean;
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
    this.computeNode = null;
    this.waveBuffer = null;
    this.sampleRate = 1;
    this.waveGPUBuffer = null;
    this.currentAudio = null;
    this.currentAnalyser = null;
    this.analyserBuffer = new Uint8Array(1024);
    this.analyserTexture = null;
    this.pitch = uniform(1.5);
    this.delayVolume = uniform(.2);
    this.delayOffset = uniform(.55);
    this.loading = false;
  }

  init() {
    // 场景
    this.initScene();

    // 相机
    this.camera = new THREE.PerspectiveCamera(45, this.aspect, 0.01, 30);

    // audio
    this.loading = true;
    this.createAudio().then(() => {
      this.loading = false;
    });

    // 渲染器
    this.createRenderer();

    // 控制器
    this.controls = new OrbitControls(this.camera, this.renderer?.domElement);
    this.controls.update();

    this.bind();
    this.initGUI();
    this.initStats();
    this.resize();
  }

  private initScene() {
    this.analyserTexture = new THREE.DataTexture(
      this.analyserBuffer, 
      this.analyserBuffer.length, 
      1, 
      THREE.RedFormat
    );

    const spectrum = texture(this.analyserTexture, viewportTopLeft.x).x.mul(viewportTopLeft.y);
    const backgroundNode = color(0x0000FF).mul(spectrum);

    // 场景
    this.scene = new THREE.Scene();
    // @ts-ignore
    this.scene.backgroundNode = backgroundNode;
  }

  private bind() {
    this.container.onclick = () => {
      if (this.loading) { return false; }
      this.playAudioBuffer();
    };
  }

  private initGUI() {
    this.gui.add(this.pitch, 'value', .5, 2, 0.01).name('高音');
    this.gui.add(this.delayVolume, 'value', 0, 1, .01).name('延迟声音');
    this.gui.add(this.delayOffset, 'value', .1, 1, .01).name('延迟补偿');
    this.gui.show();
  }

  // 判断是否为移动端
  isMobile() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes("mobile");
  }

  private async playAudioBuffer() {
    if (this.currentAudio) {
      this.currentAudio.stop();
    }

    // 计算音频
    this.renderer?.compute(this.computeNode);

    const buffer = await this.renderer!.getArrayBufferAsync(this.waveGPUBuffer);
    const waveArray = new Float32Array(buffer);
    // 表现结果
    const context = new AudioContext({ sampleRate: this.sampleRate });
    const audioOutputBuffer = context.createBuffer(
      1,
      waveArray.length,
      this.sampleRate
    );
    audioOutputBuffer.copyToChannel(waveArray, 0);

    this.currentAudio = context.createBufferSource();
    this.currentAudio.connect(context.destination);
    this.currentAudio.buffer = audioOutputBuffer;
    this.currentAudio.start();

    this.currentAudio = this.currentAudio;
    // 视觉反馈
    this.currentAnalyser = context.createAnalyser();
    this.currentAnalyser.fftSize = 2048;
    this.currentAudio.connect(this.currentAnalyser);
  }

  private async createAudio() {
    // 音频缓冲区
    const url = "/examples/sounds/webgpu-audio-processing.mp3";
    const soundBuffer = await fetch(url).then(res => res.arrayBuffer());
    const audioContext = new AudioContext();

    const audioBuffer = await audioContext.decodeAudioData(soundBuffer);
    this.waveBuffer = audioBuffer.getChannelData(0);

    // 增加额外的沉默延迟和音高
    this.waveBuffer = new Float32Array([...this.waveBuffer, ...new Float32Array(200000)]);
    this.sampleRate = (audioBuffer.sampleRate / audioBuffer.numberOfChannels);

    // 创建 webgpu 缓冲区
    this.waveGPUBuffer = new THREE.InstancedBufferAttribute(this.waveBuffer, 1);
    const waveStorageNode = storage(this.waveGPUBuffer, 'float', this.waveBuffer.length);

    // read-only 缓冲区
    const value = new THREE.InstancedBufferAttribute(this.waveBuffer, 1);
    const waveNode = storage(value, 'float', this.waveBuffer.length);

    // 计算 (shader-node)
    const computeShaderFn = tslFn(() => {
      const index = float(instanceIndex);
      // 音高
      const time = index.mul(this.pitch);
      let wave = waveNode.element(time);
      // 延迟
      for (let i = 1; i < 7; i++) {
        const waveOffset = waveNode.element(
          index.sub(this.delayOffset.mul(this.sampleRate).mul(i)).mul(this.pitch)
        );
        const waveOffsetVolume = waveOffset.mul(this.delayVolume.div(i * i));
        wave = wave.add(waveOffsetVolume);
      }

      // store
      const elementNode = waveStorageNode.element(instanceIndex);
      elementNode.assign(wave);
    });

    // 计算
    this.computeNode = computeShaderFn().compute(this.waveBuffer.length);
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
      if (this.currentAnalyser && this.analyserTexture) {
        this.currentAnalyser.getByteFrequencyData(this.analyserBuffer);
        this.analyserTexture.needsUpdate = true;
      }
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
    if (this.currentAudio) {
      this.currentAudio.stop();
    }
    this.container.onclick = null;
  }

  // 处理自适应
  resize() {
    window.onresize = () => {
      this.resizeHandle();
    };
  }
}

export default THREE;

