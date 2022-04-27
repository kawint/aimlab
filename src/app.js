import * as THREE from 'three';
import { Scene, Color } from 'three';

import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';
import { fpsCamera } from './components/camera';
import { WebGLRenderer, PerspectiveCamera, Vector3, Vector2, Raycaster } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SeedScene } from 'scenes';

class Initializer {
  constructor() {
    this.initialize_();
  }

  initialize_() {
    this.initializeRenderer_();
    this.initializeLights_();
    this.initializeScene_();
    this.initializeController_();
    this.initializeRandom_();

    this.previousRAF_ = null;
    this.raf_();
  }

  initializeRandom_() {
    const geometry = new THREE.SphereGeometry(); // (radius, widthSegments, heightSegments)
    const material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
    var sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(0, 0, 0);
    this.scene_.add(sphere);
    let ball = sphere;
    const raycaster = new Raycaster();
    const mouse = new Vector2(0, 0);
    console.log(this.camera_);
    console.log(this.scene_);
    let cam = this.camera_;
    let scene = this.scene_;

    window.addEventListener('click', function(event) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, cam);
      const instersections = raycaster.intersectObject(ball, false);
      if (instersections[0] != undefined) {
          if (instersections[0].object.uuid === sphere.uuid) {
              scene.remove(sphere);
              sphere.position.set(Math.random()*5, Math.random()*5, 0); 
              scene.add(sphere);
              ball = sphere;
          }
      }
    });
  }


  initializeController_() {
    this.controls_ = new FirstPersonControls(
        this.camera_, this.threejs_.domElement);
    this.controls_.lookSpeed = 0.8;
    this.controls_.movementSpeed = 5;

    this.fpsCamera_ = new fpsCamera(this.camera_, this.objects_);
  }

  initializeRenderer_() {
    this.threejs_ = new THREE.WebGLRenderer({
      antialias: false,
    });
    this.threejs_.shadowMap.enabled = true;
    this.threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.threejs_.setPixelRatio(window.devicePixelRatio);
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
    this.threejs_.physicallyCorrectLights = true;
    this.threejs_.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(this.threejs_.domElement);

    const fov = 60;
    const aspect = 1;
    const near = 1.0;
    const far = 1000.0;
    this.camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera_.position.set(0, 2, 0);
    this.camera_.lookAt(new Vector3(0, 0, 0));

    this.scene_ = new THREE.Scene();

    this.uiCamera_ = new THREE.OrthographicCamera(
        -1, 1, 1 * aspect, -1 * aspect, 1, 1000);
    this.uiScene_ = new THREE.Scene();
  }

  initializeScene_() {
    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.threejs_.capabilities.getMaxAnisotropy();
    const checkerboard = mapLoader.load('src/resources/checkerboard.png');
    checkerboard.anisotropy = maxAnisotropy;
    checkerboard.wrapS = THREE.RepeatWrapping;
    checkerboard.wrapT = THREE.RepeatWrapping;
    checkerboard.repeat.set(32, 32);
    checkerboard.encoding = THREE.sRGBEncoding;

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100, 10, 10),
        new THREE.MeshStandardMaterial({map: checkerboard}));
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this.scene_.add(plane);
    this.scene_.background = new Color(0x01c0ee);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(8, 8, 4),
      new THREE.MeshBasicMaterial( { color: 0x008B8B } ));
    box.position.set(10, 2, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    this.scene_.add(box);

    const box2 = new THREE.Mesh(
      new THREE.BoxGeometry(8, 8, 4),
      new THREE.MeshBasicMaterial( { color: 0x008B8B } ));
    box2.position.set(-10, 2, 0);
    box2.castShadow = true;
    box2.receiveShadow = true;
    this.scene_.add(box2);
    const concreteMaterial = new THREE.MeshBasicMaterial( { color: 'grey' } );

    const wall1 = new THREE.Mesh(
      new THREE.BoxGeometry(100, 100, 4),
      concreteMaterial);
    wall1.position.set(0, -40, -50);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    this.scene_.add(wall1);

    const wall2 = new THREE.Mesh(
      new THREE.BoxGeometry(100, 100, 4),
      concreteMaterial);
    wall2.position.set(0, -40, 50);
    wall2.castShadow = true;
    wall2.receiveShadow = true;
    this.scene_.add(wall2);

    const wall3 = new THREE.Mesh(
      new THREE.BoxGeometry(4, 100, 100),
      concreteMaterial);
    wall3.position.set(50, -40, 0);
    wall3.castShadow = true;
    wall3.receiveShadow = true;
    this.scene_.add(wall3);

    const wall4 = new THREE.Mesh(
      new THREE.BoxGeometry(4, 100, 100),
      concreteMaterial);
    wall4.position.set(-50, -40, 0);
    wall4.castShadow = true;
    wall4.receiveShadow = true;
    this.scene_.add(wall4);

    const meshes = [
      plane, box, wall1, wall2, wall3, wall4];

    this.objects_ = [];

    for (let i = 0; i < meshes.length; ++i) {
      const b = new THREE.Box3();
      b.setFromObject(meshes[i]);
      this.objects_.push(b);
    }
  }

  initializeLights_() {
    const distance = 100.0;
    const angle = Math.PI / 4.0;
    const penumbra = 0.5;
    const decay = 1.0;

    let light = new THREE.SpotLight(
        0xFFFFFF, 100.0, distance, angle, penumbra, decay);
    light.castShadow = true;
    light.shadow.bias = -0.00001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 100;

    light.position.set(25, 25, 0);
    light.lookAt(0, 0, 0);
    this.scene_.add(light);

    const upColour = 0xFFFF80;
    const downColour = 0x808080;
    light = new THREE.HemisphereLight(upColour, downColour, 0.5);
    light.color.setHSL( 0.6, 1, 0.6 );
    light.groundColor.setHSL( 0.095, 1, 0.75 );
    light.position.set(0, 4, 0);
    this.scene_.add(light);
  }

  raf_() {
    requestAnimationFrame((t) => {
      if (this.previousRAF_ === null) {
        this.previousRAF_ = t;
      }

      this.step_(t - this.previousRAF_);
      this.threejs_.autoClear = true;
      this.threejs_.render(this.scene_, this.camera_);
      this.threejs_.autoClear = false;
      this.threejs_.render(this.uiScene_, this.uiCamera_);
      this.previousRAF_ = t;
      this.raf_();
    });
  }

  step_(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;

    this.controls_.update(timeElapsedS);
    this.fpsCamera_.update(timeElapsedS);
  }
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new Initializer();
});
