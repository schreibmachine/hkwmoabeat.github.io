// JavaScript sketch for my sound visualization

// tunnel stuff based on this tutorial / walkthrough:
// https://www.mamboleoo.be/articles/tunnel-animation-1
// by Louis Hoebregts

// GET THE AUDIO ------------------------------------------------------------------------------------------------------------------

// audio integration made with:
// https://medium.com/@mag_ops/music-visualiser-with-three-js-web-audio-api-b30175e7b5ba
// by Prakhar Bhardwaj

// using the HTML audio element
var audio = new Audio('./assets/HKW_Moabeat_schreiber.wav');

audio.load();
//because the file plays immediately, I made the first few seconds empty/silent in the .wav file...
audio.play();

audio.addEventListener('loadeddata', () => {
  let duration = audio.duration;
  console.log('Audio file length in seconds: ' + duration);
})

// here comes the WebAudio API! :
var context = new AudioContext();                       // create audio context
var source = context.createMediaElementSource(audio);   // create source in context 
var myAnalyser = context.createAnalyser();              // create analyser in context
source.connect(myAnalyser);                             // connecting analyser node to the source
myAnalyser.connect(context.destination);                // connecting destination node to the analyser

myAnalyser.fftSize = 1024;                       // default value is 2048, but we choose lower res to save performance!
var bufferLength = myAnalyser.frequencyBinCount; // buffer length is equal to the bin count, which is half of the FFT size (that's 256 in this case)
var dataArray = new Uint8Array(bufferLength);    // this array can then be used for the visualisation

// HELPER FUNCTIONS by Prakhar Bhardwaj -------------------------------------------------------------------------------------------

function fractionate(val, minVal, maxVal) {
  return (val - minVal)/(maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
  var fr = fractionate(val, minVal, maxVal);
  var delta = outMax - outMin;
  return outMin + (fr * delta);
}

function avg(arr){
  var total = arr.reduce(function(sum, b) { return sum + b; });
  return (total / arr.length);
}

function max(arr){
  return arr.reduce(function(a, b){ return Math.max(a, b); })
}

// CREATE SCENE & RENDERERS -------------------------------------------------------------------------------------------------------

// Get window size
var ww = window.innerWidth,
wh = window.innerHeight;

// Create a WebGL renderer
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(ww, wh);
if (renderer) {
  console.log("renderer active");
}
document.body.appendChild( renderer.domElement );

// Create an empty scene
var scene = new THREE.Scene();
if (scene) {
  console.log("scene active");
}

// Window resizing event function
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// CREATE THE CAMERA --------------------------------------------------------------------------------------------------------------

// perspective camera
var camera = new THREE.PerspectiveCamera(45, ww / wh, 0.001, 1000);
camera.position.z = 100;
if (camera) {
  console.log("camera active");
}

// CREATE LIGHTING ----------------------------------------------------------------------------------------------------------------

// point light (big) for the tunnel
var light = new THREE.PointLight(0xffffff,1, 500);
scene.add(light);

// ambient light for debugging etc
var ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
//scene.add(ambientLight);

/*
// lights that illuminate the torus - only useful if torusknot material == knotMaterial_phong!
var torusLight1 = new THREE.PointLight(0xdd0000, 2, 10);
scene.add(torusLight1);
var torusLight2 = new THREE.PointLight(0x00dd11, 2, 10);
scene.add(torusLight2);
var torusLight3 = new THREE.PointLight(0x0000dd, 2, 10);
scene.add(torusLight3);
var torusLight4 = new THREE.PointLight(0xdd0000, 2, 10);
scene.add(torusLight4);
var torusLight5 = new THREE.PointLight(0x00dd11, 2, 10);
scene.add(torusLight4);
var torusLight6 = new THREE.PointLight(0x0000dd, 2, 10);
scene.add(torusLight4);
*/

// CUSTOM SHADERS & MATERIALS -----------------------------------------------------------------------------------------------------
// for the torusknot in the middle

// my custom shader material:
const knotMaterial_myShader = new THREE.ShaderMaterial({
  uniforms: {
    uAmplitudeY: { },
    uAmplitudeX: { },
    uAmplitudeZ: { },
    uNormalMultiplier: { }
  },
  // this looks for the shader code in the HTML file!
  vertexShader:   document.getElementById( 'vertexShader' ).textContent,
  fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
  transparent: true
});

// iridescence material:
// https://github.com/DerSchmale/threejs-thin-film-iridescence
// by David Lenaerts
function loadCubeMap(filepath) {
  var files = [
    filepath + "/posX.jpg",
    filepath + "/negX.jpg",
    filepath + "/posY.jpg",
    filepath + "/negY.jpg",
    filepath + "/posZ.jpg",
    filepath + "/negZ.jpg"
  ];
  
  var loader = new THREE.CubeTextureLoader();
  return loader.load(files);
}

var iridescenceLookUp;
var knotMaterial_iridescent;
var radiance = loadCubeMap("./lib/radiance");
var irradiance = loadCubeMap("./lib/irradiance");
var matcolor = new THREE.Vector3(0.0,0.0,0.0);

iridescenceLookUp = new ThinFilmFresnelMap();
knotMaterial_iridescent = new IridescentMaterial(irradiance, radiance, iridescenceLookUp);

iridescenceLookUp._filmThickness = 581;        // min 100, max 1000
iridescenceLookUp._refractiveIndexFilm = 1.7;  // min 1,   max 5
iridescenceLookUp._refractiveIndexBase = 1;    // min 1,   max 5
knotMaterial_iridescent.color = matcolor;
knotMaterial_iridescent.boost = 1;                 // min 1,   max 50
// i didn't use it in the end because this relies on "sky" cubemaps, which didn't fit my scene.
// but it's still pretty cool, so i left it in as an option for testing :)

// three.js normal phong material:
const knotMaterial_phong = new THREE.MeshPhongMaterial({
    transparent : true,
    opacity : 1.0,
    depthTest : true,
    depthWrite : true,
    alphaTest : 1.0,
    color: 0x049ef4,
    specular : 0x220020,
    shininess : 99,
    wireframe : false
});
// i didn't use it in the end because i didn't know how to make it sound reactive. 
// but it's still pretty cool, so i left it in as an option for testing :)
  
// CREATE GEOMETRY ----------------------------------------------------------------------------------------------------------------
  
// TUNNEL BACKGROUND:
let points;
// array of vertex points - based on a spline made in Autodesk Maya
points = [
  [ -524.88 , -25.21 , 214.648 ],
  [ 315.141 , -25.21 , 427.673 ],
  [ 331.907 , 192.90 , -85.979 ],
  [ -154.46 , 202.78 , 38.9500 ],
  [ -214.58 , -27.21 , 28.8203 ],
  [ -192.57 , -25.21 , -189.30 ],
  [ 166.098 , 124.81 , -430.27 ],
  [ 141.223 , -25.21 , 356.477 ],
  [ -222.28 , -201.5 , 161.434 ],
  [ -512.38 , -25.21 , -277.68 ],
  [ 528.427 , 119.89 , 182.375 ],
  [ 248.499 , -55.88 , -265.27 ],
  [ 83.7028 , -18.67 , -328.71 ],
  [ -162.66 , -18.46 , -319.10 ],
  [ -183.38 , -18.64 , -318.71 ],
  [ -305.01 , -25.21 , -316.32 ],
  [ -488.45 , 41.412 , -324.00 ],
  [ -346.18 , -142.0 , -51.634 ]
];

// convert the array of points into vector3s
for (var i = 0; i < points.length; i++) {
  var x = points[i][0];
  var y = points[i][1];
  var z = points[i][2];
  points[i] = new THREE.Vector3(x, y, z);
}

// create a path from the vectors points
var path = new THREE.CatmullRomCurve3(points, true, "chordal");

var colors = [0xf00000, 0xFF0000, 0x00ff00 ,0x0000ff];

//Loop through all those colors
for(var i=0;i<colors.length;i++){
  //Create a new geometry with a different radius
  var tunnelGeo = new THREE.TubeBufferGeometry( path, 1000, (i/2)+17, (i + 50), true );
  //Set a new material with a new color and a different opacity
  var tunnelMat = new THREE.MeshLambertMaterial({
    color: colors[i],
    side : THREE.BackSide,
    wireframe : true
  });
  
  //Create a mesh
  var tube = new THREE.Mesh( tunnelGeo, tunnelMat );
  //Push the mesh into the scene
  scene.add( tube );
}
  
// TORUS KNOT CENTREPIECE:
  
const knotGeo = new THREE.TorusKnotGeometry( 2, 0.4, 150, 20, 3, 4 );
const torusKnot = new THREE.Mesh( knotGeo, knotMaterial_myShader );
scene.add( torusKnot );
  
// TEST SPHERE:
  
var sphereGeo = new THREE.SphereGeometry(1, 20, 20);
var testSphere =   new THREE.Mesh(sphereGeo, knotMaterial_iridescent);
// scene.add( testSphere );
  
// THE RENDER FUNCTION ------------------------------------------------------------------------------------------------------------
  
//Start the percentage at 0
var percentage = 0;

function render(){
  
  // AUDIO WORK: -----
  myAnalyser.getByteFrequencyData(dataArray); // saving the freq data in our dataArray
    
  // slicing array into 3 pieces (and search for the bass only):
  var bassLineArray    = dataArray.slice(0, dataArray.length/200);
  var lowerThirdArray  = dataArray.slice(0, (dataArray.length/3) - 1);
  var middleThirdArray = dataArray.slice((dataArray.length/3), ((dataArray.length/3)*2) - 1);
  var higherThirdArray = dataArray.slice(((dataArray.length/3)*2), dataArray.length - 1);

  //do some reductions / normalizations:
  var lower3Avg  = avg(lowerThirdArray);
  var middle3avg = avg(middleThirdArray);
  var higher3Avg = avg(higherThirdArray);
  var lower3AvgFr  = lower3Avg  / lowerThirdArray.length;
  var middle3avgFr = middle3avg / middleThirdArray.length;
  var higher3AvgFr = higher3Avg / higherThirdArray.length;
  var bassAvg   = avg(bassLineArray);
  var bassAvgFr = bassAvg / bassLineArray.length;

  //using the values to set the shader uniforms :
  light.color.r = higher3AvgFr * 50;

  torusKnot.material.uniforms.uAmplitudeX.value = middle3avgFr * 5 + ( higher3AvgFr * 20.0);
  torusKnot.material.uniforms.uAmplitudeY.value = middle3avgFr * 5 + ( higher3AvgFr * - 30.0);
  torusKnot.material.uniforms.uAmplitudeZ.value = middle3avgFr * 5 + ( higher3AvgFr * - 10.0);

  light.color.g = middle3avgFr * 10;
   
  light.color.b = lower3AvgFr * 5;

  torusKnot.scale.set(bassAvgFr / 100, bassAvgFr / 100, bassAvgFr / 100);
  torusKnot.material.uniforms.uNormalMultiplier.value = (bassAvgFr /  - 100) ;
    
  /*
  // animating the lights that illuminate the torus - only useful if torusknot material == knotMaterial_phong! 
  torusLight1.intensity = bassAvgFr / 50 ; 
  torusLight2.intensity = bassAvgFr / 50 ; 
  torusLight3.intensity = bassAvgFr / 50 ; 
  torusLight4.intensity = bassAvgFr / 50 ; 
  torusLight5.intensity = bassAvgFr / 50 ; 
  torusLight6.intensity = bassAvgFr / 50 ; 
  */


  // PATH WORK: -----
  //Increase the percentage
  percentage += 0.0001;
    
  //Get the point at the specific percentage
  let p1 = path.getPointAt(percentage%1);
    
  //Get another point along the path but further
  var p2 = path.getPointAt((percentage + 0.005)%1);
    
  //Get another point along the path but EVEN further
  var p3 = path.getPointAt((percentage + 0.01)%1);
    
  //Place the camera at the first point
  camera.position.set(p1.x,p1.y,p1.z);
  //camera.position.set(0, 0, -900);

  //Place the torusknot at the second point
  torusKnot.position.set(p2.x,p2.y,p2.z);
    
  //Place the big pointlight light at the third point
  light.position.set(p3.x, p3.y, p3.z);
  
  /*
  // updating the position of the lights that illuminate the torus - only useful if torusknot material == knotMaterial_phong! 
  torusLight1.position.set(p2.x +5,p2.y,p2.z);
  torusLight2.position.set(p2.x,p2.y +5,p2.z);
  torusLight3.position.set(p2.x,p2.y,p2.z +5);
  torusLight4.position.set(p2.x -5,p2.y,p2.z);
  torusLight5.position.set(p2.x,p2.y -5,p2.z);
  torusLight6.position.set(p2.x,p2.y,p2.z -5);
  */

  //rotate the torus knot
  torusKnot.rotateZ(0.01);
  torusKnot.rotateY(0.01);
  torusKnot.rotateX(0.01);
    
    
  //Rotate the camera into the orientation of the second point
  camera.lookAt(torusKnot.position);
  //camera.lookAt(0,0,0);
  camera.rotateZ(percentage * 20);

  renderer.render(scene, camera);
  requestAnimationFrame(render);
  
  onWindowResize();
}

//This draws it all: 
requestAnimationFrame(render);