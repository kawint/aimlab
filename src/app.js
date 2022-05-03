import * as THREE from 'three';
import { Color } from 'three';

import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';
import { fpsCamera } from './components/camera';
import { Vector3, Vector2, Raycaster } from 'three';
import { Mouse } from './components/mouse';

const NUM_SPLIT = 4;
var TOTAL = 1;
var MAX_POINTS = 100/((NUM_SPLIT+1)*TOTAL*2);
const THIRTY_DEG = Math.PI/6;
var END = false;
var ANIMATE_END = false;
var START_TIME;
var END_TIME;

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

  intersect (ball) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera_);
    // console.log(this.raycaster.layers);
    const instersection = this.raycaster.intersectObject(ball, false);

    if (instersection[0] != undefined) {
      if (instersection[0].object.uuid === ball.uuid) {
        let dist = instersection[0].distance;
        let camPos = this.camera_.position;
        let interPos = instersection[0].point;
        let center = ball.position;

        let toCam = new THREE.Vector3().copy(camPos).sub(ball.position).normalize();
        let toInter = new THREE.Vector3().copy(interPos).sub(ball.position).normalize();
    
        if (Math.acos(toCam.dot(toInter)) < THIRTY_DEG) return [true, true, dist];
        return [true, false, dist];
      }
    }

    return [false, null];
  }

  makeNewBigBall() {
    const BIG_R = 1;

    const geometry = new THREE.SphereGeometry(BIG_R, 64, 32);
    const material = new THREE.MeshPhongMaterial( {color: 0xff0000} );
    let newBall = new THREE.Mesh(geometry, material);

    return newBall;
  } 

  breakBigBall(bigBall) {
    const SMALL_R = 0.25;
    const x = bigBall.position.x;
    const y = bigBall.position.y;
    const z = bigBall.position.z;
    const offset = SMALL_R*1.5;
    const posX = x + offset;
    const negX = x - offset;
    const posY = y + offset;
    const negY = y - offset;

    let pos = [];
    pos[0] = [posX, posY, z];
    pos[1] = [posX, negY, z];
    pos[2] = [negX, posY, z];
    pos[3] = [negX, negY, z];

    const geometry = new THREE.SphereGeometry(SMALL_R, 64, 32);
    const material = new THREE.MeshPhongMaterial( {color: 0xff0000} );

    let smallBalls = new Set();

    for (let i = 0; i < NUM_SPLIT; i++) {
      let newBall = new THREE.Mesh(geometry, material);
      newBall.position.set(pos[i][0], pos[i][1], pos[i][2]);
      smallBalls.add(newBall);
    }

    return smallBalls;
  }

  getPoints() {
    let el = document.getElementById("points");
    return parseInt(el.innerHTML);
  }

  getAccuracy() {
    return (100 * this.num_hit / this.total).toFixed(2);
  }
  endGame() {
    END = true;
    ANIMATE_END = true;
    // console.log("GAME OVER");
    let totTime = ((END_TIME-START_TIME)/1000).toFixed(2);
    let html = " <div id='end'> <br><br><br>GAME OVER! <br><br><br>\
    ACCURACY: " + this.getAccuracy()  + "%<br>\
    SCORE: "  +  this.getPoints()+ "/100 PTS <br>\
    TIME: " + totTime + " SECONDS <br>\
    <br><br><span id='endEnter'>Press &ltEnter&gt to play again!</span> </div>";
    let div = document.createElement("div");
    div.innerHTML = html;
    document.body.appendChild(div);

    const height = window.innerHeight / 2;
    const width = window.innerWidth / 2;

    let el = document.getElementById("end");
    el.style.position = "absolute";
    el.style.left = (width-width/2) + 'px';
    el.style.top = (height-height/2)+'px'; 
    el.style.backgroundColor = "DarkCyan";
    el.style.color = "white";
    el.style.fontFamily = "courier";
    el.style.fontSize = 150+"%"
    el.style.width = width+'px';
    el.style.height = height+'px';
    // el.style.lineHeight = height+'px';
    el.style.textAlign = "center";

    el = document.getElementById("top");
    el.remove();
    enter = true;
  }

  initializeRandom_() {
    let ball = this.makeNewBigBall();
    // console.log(ball);
    ball.position.set(2, 5, 0);
    this.scene_.add(ball);
    const s = new Date();
    START_TIME = s.getTime();
    let smallBalls = new Set();
    this.raycaster = new Raycaster();
    this.mouse = new Vector2(0, 0);
    // console.log(this.camera_);
    // console.log(this.scene_);
    let cam = this.camera_;
    let scene = this.scene_;

    this.num_hit = 0;
    this.total = 0;
    // let audio = new Audio('src/resources/break.mp3');
    let audio = new Audio('src/resources/break2.mp3');
    let thisObj = this;

    var currRound = 0;
    var numCurrRound = 0;

    window.addEventListener('mousemove', function(event) {
      let x = event.pageX;
      let y = event.pageY;

      let img = document.getElementById("crosshair");
      img.style.left = (x-25) + 'px';
      img.style.top = (y-25) + 'px'; 
      img.style.opacity = 1;
      img.style.cursor = "none";
    });

    window.addEventListener('click', function clickFunc(event) {
      // if (END) return;
      thisObj.total++;
      let currBall = undefined;
      let minDist = undefined;      
      let intersect = false;
      let addPoints = 0;

      if (numCurrRound == 0) {
        let intersected = thisObj.intersect(ball);
        if (intersected[0]) {
          intersect = true;
          if (intersected[1]) addPoints += MAX_POINTS;
          addPoints += MAX_POINTS;
        }
      } else {
        for (let b of smallBalls) {
          let intersected = thisObj.intersect(b);
          if (intersected[0]) {
            if (!intersect) {
              minDist = intersected[2];
              currBall = b;
              if (intersected[1]) addPoints += MAX_POINTS;
              addPoints += MAX_POINTS;
              intersect = true;
            } else if (intersected[2] < minDist) {
              addPoints = 0;
              minDist = intersected[2];
              currBall = b;
              if (intersected[1]) addPoints += MAX_POINTS;
              addPoints += MAX_POINTS;
            }
          }
        }
        // console.log("check small balls");
      }

      if (intersect) {
        audio.play();
        let el = document.getElementById("points");
        let currScore = thisObj.getPoints();
        el.innerHTML = Math.round(currScore + addPoints);
        let accuracy = (100*(++thisObj.num_hit) / thisObj.total).toFixed(2);
        el = document.getElementById("accuracy");
        el.innerHTML = accuracy;
        scene.remove(ball);
        numCurrRound++;

        // console.log(currBall);
        // console.log(currBall.size);
        // let size = currBall.size;
        // if (size != 0) numCurrRound += (currBall.size-1);

        // console.log("curr round: " + numCurrRound);

        // console.log("curr round: " + currRound + " num in curr round: " + numCurrRound);

        if (numCurrRound == 1) {
          smallBalls = thisObj.breakBigBall(ball);  
          for (let b of smallBalls) scene.add(b);
          ball = null;
          // console.log("4 small");
        } else {
          // for (let b of currBall) {
            scene.remove(currBall);
            smallBalls.delete(currBall);
          // }
          if (numCurrRound == (NUM_SPLIT+1)) {
            currRound++;
            numCurrRound = 0;
            if (currRound == TOTAL) {
              const e = new Date();
              END_TIME = e.getTime();
              thisObj.endGame();
              window.removeEventListener('click', clickFunc);
            }
            else {
              // new big sphere of radius 1
              ball = thisObj.makeNewBigBall();
              // ball.position.set(Math.random()*10, Math.random()*5+1, Math.random()*10);
              ball.position.set(Math.random()*10-5, Math.random()*5+1, Math.random()*10-5);
              scene.add(ball);   
            }       
          } 
        }
      } else {
        let accuracy = thisObj.getAccuracy();
        let el = document.getElementById("accuracy");
        el.innerHTML = accuracy;
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
    this.camera_.position.set(6, 3,-10);
    this.camera_.lookAt(new Vector3(100, 0, 0));

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
    // this.scene_.background = new Color(0x01c0ee);
    this.scene_.background = new Color(0xadd8e6);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(8, 8, 4),
      new THREE.MeshPhongMaterial( { color: 0x008B8B } ));
    box.position.set(10, 2, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    this.scene_.add(box);

    const box2 = new THREE.Mesh(
      new THREE.BoxGeometry(8, 8, 4),
      new THREE.MeshPhongMaterial( { color: 0x008B8B } ));
    box2.position.set(-10, 2, 0);
    box2.castShadow = true;
    box2.receiveShadow = true;
    this.scene_.add(box2);
    const concreteMaterial = new THREE.MeshPhongMaterial( { color: 'grey' } );

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

  animateHTML(time) {
  if (ANIMATE_END) {
    let opac = 0.4 * Math.sin(time / 500) + 0.6;
    document.getElementById('endEnter').style.opacity = opac;
    }
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
      this.animateHTML(t);
      this.raf_();
    });
  }

  step_(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;

    this.controls_.update(timeElapsedS);
    this.fpsCamera_.update(timeElapsedS);
  }
}

// function box_stuff() {
//   let html = " <div id='box1'>Score: 0</div>";
//   const div = document.createElement("div");
//   div.innerHTML = html;
//   document.body.appendChild(div);
//   const el = document.getElementById("box1");
//   el.style.backgroundColor = "green";
//   el.style.position = "absolute";
//   el.style.width = 200+'px';
//   el.style.height = 100+'px';
//   el.style.left = 500+'px';
//   el.style.top = 50+'px';
// }

// old font: Montserrat -- I changed the font to match the scoreboard but I don't care what font we use haha
let html = "<link rel='preconnect' href='ht tps://fonts.gstatic.com'> \
<link href='https://fonts.googleapis.com/css2?family=courier:ital,wght@1,100;1,300&family=Poppins&display=swap' rel='stylesheet'>\
<div id='instructions' style='background-color:DarkCyan; background-image: linear-gradient(135deg, DarkCyan, Cyan);position:absolute; right:0px; left:0px; top:0px; bottom:0px;'> \
  <div style='text-align: center;margin-top:100px;'><span style='font-size:6em; font-weight: bold; font-family: courier, sans-serif;'><img src='./src/aim.ico'width=70; height=70;> Aim Lab</span></div> \
  <div style='text-align: center;'><span style='font-size:3em; font-family: courier, sans-serif;'>Practice your aim!</span></div> \
  <div><br/></div>\
  <div id='ball' style='background:clear; position:absolute;'><img src='./src/ball.png'; width=164; height=137;></div> \
  <div><br/></div>\
  <div style='text-align: center;'><span style='font-size:2em; font-weight: 300; font-family: courier, sans-serif; font-weight: bold;'>INSTRUCTIONS:</span></div> \
  <div style='text-align: center;'><span style='font-size:2em; font-weight: 300; font-family: courier, sans-serif; '>Move: WASD, Look: MOUSE</span></div> \
  <div style='text-align: center;'><span style='font-size:2em; font-weight: 300; font-family: courier, sans-serif;'>Shoot: LEFT CLICK</span></div> \
  <div><br/></div>\
  <div style='text-align: center;'><span style='font-size:1.5em; font-weight: 300; font-family: courier, sans-serif;'>Each round consists of shooting five balls. <br> Shoot within half the radius for maximum points. <br> Try to get the maximum of 100 pts and 100% accuracy as fast as possible!</span></div>\
  <div style='text-align: center;'><span style='font-size:1.5em; font-weight: 300; font-family: courier, sans-serif;'><br>Choose the number of rounds below:</span></div> \
  <div style='color:lightgray'><br/></div>\
  <div style='text-align: center;'><input id='num' style='height:25px; width:50px;border: 3px solid; border-radius: 10px; font-size:1.5em; font-family: courier, sans-serif;'></input></div> \
  <div style='color:lightgray'><br/></div>\
  <div style='text-align: center;'><span id='error' style='color:red;font-size:1.5em; font-family: courier, sans-serif;'></span></div> \
  <div><br/></div>\
  <div style='text-align: center;'><span id ='startEnter' style='font-size:2em; font-weight: bold; font-family: courier, sans-serif;'>Press &ltEnter&gt to play!</span></div> \
  <div id='ball2' style='background:clear; position:absolute;'><img src='./src/ball.png'; width=164; height=137;></div> \
</div>"

// <div style='background:DarkCyan;text-align: center;'><img src='./src/aimlab.jpeg' width='800' height='480'></div> \

const startDiv = document.createElement("div");
startDiv.id = "startDiv";
startDiv.innerHTML = html;
document.body.appendChild(startDiv);
document.getElementsByTagName("body")[0].style.margin = '0px';

var time = 0;
var time2 = 0;
function loop() {
  let opac = 0.4 * Math.sin(time / 100) + 0.6;
  document.getElementById('startEnter').style.opacity = opac;
  let right = 60+time2;
  if (right > window.innerWidth + 100) {
    right = 60;
    time2 = 0 - time % 100;
  }
  document.getElementById('ball').style.left = (right - 100)+'px'; 
  document.getElementById('ball').style.top =(300*opac-30)+'px';

  document.getElementById('ball2').style.right = (right - 100)+'px'; 
  document.getElementById('ball2').style.top =(300*opac+500)+'px';

  time++;
  time2++;
}
var startLoop = window.setInterval(loop, 1);


function init_scoreBoard() {
  // let html = " <div id='score'>Score: 0 <br> Accuracy: -- %</div>";
  let html = " <div><img id='crosshair' style='position:absolute;opacity:0;'src='./src/crosshair.png'; width=50; height=50; ></div>\
  <div id='top'><div id='score'>PTS</div><div id='points'>0</div><div id='accuracy'> -- </div><div id='percent'>%</div></div>";
  let div = document.createElement("div");
  div.innerHTML = html;
  document.body.appendChild(div);
  
  let el = document.getElementById("top");
  el.style.position = "absolute";
  el.style.left = 50+'%';
  el.style.top = 15+'px'; // style='position: absolute; left:'50'%; top='15'px;
  
  el = document.getElementById("score");
  el.style.backgroundColor = "DarkCyan";
  el.style.color = "white";
  el.style.fontFamily = "courier";
  el.style.fontSize = 150+"%"
  el.style.opacity = 0.6;  
  el.style.position = "absolute";
  el.style.width = 80+'px';
  el.style.height = 50+'px';
  el.style.lineHeight = 50+'px';
  el.style.textAlign = "center";
  el.style.left = -180+'px';
  el.style.top = 15+'px';
  el = document.getElementById("points");
  el.style.backgroundColor = "DarkCyan";
  el.style.color = "white";
  el.style.fontFamily = "courier";
  el.style.fontSize = 150+"%";
  el.style.position = "absolute";
  el.style.width = 100 +'px';
  el.style.height = 50 +'px';
  el.style.lineHeight = 50+'px';
  el.style.textAlign = "center";
  el.style.left = -100+'px';
  el.style.top = 15+'px';
  el = document.getElementById("accuracy");
  el.style.backgroundColor = "white";
  el.style.color = "DarkCyan";
  el.style.fontFamily = "courier";
  el.style.fontSize = 150+"%"
  el.style.position = "absolute";
  el.style.width = 100+'px';
  el.style.height = 50+'px';
  el.style.lineHeight = 50+'px';
  el.style.textAlign = "center";
  el.style.left = 0+'px';
  el.style.top = 15+'px';
  el = document.getElementById("percent");
  el.style.backgroundColor = "white";
  el.style.color = "DarkCyan";
  el.style.fontFamily = "courier";
  el.style.fontSize = 150+"%";
  el.style.opacity = 0.6;    
  el.style.position = "absolute";
  el.style.width = 80 +'px';
  el.style.height = 50 +'px';
  el.style.lineHeight = 50+'px';
  el.style.textAlign = "center";
  el.style.left = 100+'px';
  el.style.top = 15+'px';
}

let _APP = null;
let enter = true;

window.addEventListener("keydown", event => { 
  if (enter) {
    if (event.key == "Enter") {
      
      if (END) {
        ANIMATE_END = false;
        init_scoreBoard();
        document.getElementById("end").remove();
        _APP.initializeRandom_();
      } else {   
        let el = document.getElementById("num");
        TOTAL = parseInt(el.value);
        if (isNaN(TOTAL) || TOTAL <= 0) {
          el = document.getElementById("error");
          error.innerHTML = "Please input a positive number.";
          return;
        }
        MAX_POINTS = 100/((NUM_SPLIT+1)*TOTAL*2);
        startDiv.remove();  
        init_scoreBoard();
        clearTimeout(startLoop);
        _APP = new Initializer();
      }

      END = false;
      enter = false;
    }
  }
});
