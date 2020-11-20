import * as THREE from './ThreeJS/build/three.module.js';

import { Water } from './ThreeJS/examples/jsm/objects/Water.js';
import { Sky } from './ThreeJS/examples/jsm/objects/Sky.js';
import { DDSLoader } from './ThreeJS/examples/jsm/loaders/DDSLoader.js';
import { MTLLoader } from './ThreeJS/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from './ThreeJS/examples/jsm/loaders/OBJLoader.js';

let container;
let camera, scene, renderer, pmremGenerator;
let hemiLight, direcLight1;
let water, sun, sky, rains;
let boat;
let preloader;

const skyScale = 5000;
const oceanScale = 10000;
const rainSpeed = 5.0;
const rainsAmount = 100;
const rainsVelocity = []

const CP = [-500, 100, 700] //cameraPosition x,y,z
const boatModel = {
    folder: 'models/boat_v2/',
    mlt: "boat_v2.mtl",
    obj:  "boat_v2.obj",
    scale: 0.1
}
const statesParameters = {
    inclination: 0,
    azimuth: 0.205,
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.1,
    mieDirectionalG: 0.98,
    hemiLight: 1, //0~1.5
    direcLight1: 0.4, //0~1.5
    visible: false
};
const boatParameters = {
    x: 0,
    y: -30,
    z: 200
};
const params = {
    temperature: null,
    rain: null,
    wind: null,
    clouds: null,
    humidity: null
};

loader();
init();
updateSky();
animate();

function loader() {
    const text = "Loading.....";
    const rings = 2;
    const ringSectors = 30;
    preloader = document.getElementById("loading")

    const loading = document.createElement('div');
    loading.className = 'preloader';
    preloader.appendChild(loading);
    let ring, ringSector;
    for(let i = 0;i <rings; ++i) {
        ring = document.createElement('div');
        ring.className = 'preloader__ring';
        for(let j = 0;j <ringSectors; ++j) {
            ringSector = document.createElement('div');
            ringSector.className = 'preloader__sector';
            if(j<text.length) {
                ringSector.textContent = text[j];
            }
            if(j>0) {
                ringSector.style = `transform: rotateY(${12 * j}deg) translateZ(7rem);`;
            }
            ring.appendChild(ringSector);
        }
        loading.appendChild(ring);
    }
    
    setTimeout(() => {
        // remove preloader
        document.body.removeChild(preloader.parentElement);
    }, 5000);

}
function init() {

    container = document.getElementById( 'container' );

    scene = new THREE.Scene();

    // renderer

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    // camera

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 5000 );
    camera.position.set(CP[0],CP[1],CP[2]);
    camera.lookAt(-100, 0, -300);

    // light
    direcLight1 = new THREE.DirectionalLight(0xffffff, statesParameters.direcLight1);
    direcLight1.position.set(0,10000,0);
    direcLight1.target.position.set(0,0,0);
    hemiLight = new THREE.HemisphereLight(0xffffff, 0xD2E9FF, statesParameters.hemiLight);
    scene.add(hemiLight);
    scene.add(direcLight1);

    // Water

    const waterGeometry = new THREE.PlaneBufferGeometry( oceanScale, oceanScale );
    water = new Water(waterGeometry, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load( 'textures/waternormals.jpg', function ( texture ) {

                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

            } ),
            alpha: 1.0,
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        }
    );
    water.rotation.x = - Math.PI / 2;
    scene.add( water );

    // Skybox

    sun = new THREE.Vector3();
    sky = new Sky();
    sky.scale.setScalar( skyScale );
    scene.add( sky );

    pmremGenerator = new THREE.PMREMGenerator( renderer );

    updateSun();

    // rain

    rains = new THREE.Object3D();
    scene.add(rains);
    const rainMat = new THREE.MeshPhongMaterial( { 
        color: 0xffffff,
        opacity: 0.6,
        transparent: true
    } );
    const rainGeo = new THREE.BoxBufferGeometry(0.2, setRainLength(), 0.2 );
    for ( let i = 0; i < rainsAmount; i ++ ) {

        const object = new THREE.Mesh(rainGeo, rainMat );

        // rain in area near camera
        object.position.x = Math.random() * 1000 - 500 + CP[0];
        object.position.z = Math.random() * 1000 - 500 + CP[2];
        object.position.y = Math.random() * 400;

        rains.add(object);
        rainsVelocity.push(rainSpeed);
        // cubeData.push(object);
    }

    // load mlt boat model

    const onProgress = function ( xhr ) {

        if ( xhr.lengthComputable ) {

            const percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round( percentComplete, 2 ) + '% downloaded' );

        }

    };

    const onError = function () { };

    const manager = new THREE.LoadingManager();
    manager.addHandler( /\.dds$/i, new DDSLoader() );

    new MTLLoader( manager )
        .setPath( boatModel.folder )
        .load( boatModel.mlt, function ( materials ) {

            materials.preload();

            new OBJLoader( manager )
                .setMaterials( materials )
                .setPath( boatModel.folder )
                .load( boatModel.obj , function ( object ) {
                    object.position.y =  boatParameters.y;
                    object.position.x =  boatParameters.x;
                    object.position.z =  boatParameters.z;
                    object.rotation.x =  -Math.PI / 2;
                    object.scale.set( boatModel.scale, boatModel.scale, boatModel.scale );
                    boat = object;
                    scene.add( object );
                }, onProgress, onError );

        } );

    // init 
    window.addEventListener( 'resize', onWindowResize, false );

}
function setRainLength() {
    return Math.random() * 5 + 4;
}
function updateRain() {
    if (statesParameters.visible == false) {
        rains.visible = false;
        return
    } else {
        rains.visible = true;
    }
    
    let id = 0;
    rains.children.forEach(child => {
        child.position.y -= rainsVelocity[id];
        rainsVelocity[id] += 0.05;
        if(child.position.y < -100) {
            child.position.y = Math.random() * 400;
            child.scale.set(0.2, setRainLength(), 0.2);
            rainsVelocity[id] = rainSpeed;
        } 
        id += 1;
    })
    // rains.visible = false;
}
function updateSun() {
    const uniforms = sky.material.uniforms;
    uniforms[ "turbidity" ].value = statesParameters.turbidity;
    uniforms[ "rayleigh" ].value = statesParameters.rayleigh;
    uniforms[ "mieCoefficient" ].value = statesParameters.mieCoefficient;
    uniforms[ "mieDirectionalG" ].value = statesParameters.mieDirectionalG;
    
    const theta = Math.PI * ( statesParameters.inclination - 0.5 );
    const phi = 2 * Math.PI * ( statesParameters.azimuth - 0.5 );

    sun.x = Math.cos( phi );
    sun.y = Math.sin( phi ) * Math.sin( theta );
    sun.z = Math.sin( phi ) * Math.cos( theta );
    
    // console.log(statesParameters.inclination);
    direcLight1.position.set(sun.x, sun.y, sun.z);

    // set direcLight1, hemiLight intensity
    if (statesParameters.inclination<0.5) {
        direcLight1.intensity = 1.6 * (5 - 10 * statesParameters.inclination)/5;
    } else {
        direcLight1.intensity = 0;
    }
    hemiLight.intensity = (5 - 10 * statesParameters.inclination)/5 + 0.5;
    // hemiLight.intensity = statesParameters.hemiLight;
    // direcLight1.intensity = statesParameters.direcLight1;
    // console.log(direcLight1.intensity, hemiLight.intensity);

    sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
    water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();
    scene.environment = pmremGenerator.fromScene( sky ).texture;

}
function updateSky() {
    if(resData === null || resData === undefined) {
        return;
    }

    parseParams();

    if (params.timestamp === null || params.sunrise === null || params.sunset === null) {
        return
    }
    statesParameters.inclination = 0.6;
    // set sun inclination
    let diff = Math.min(params.timestamp-params.sunrise, params.sunset - params.timestamp);
    console.log("[updateSky] diff", diff , diff/(3600*6));
    if (diff > 0) {
        statesParameters.inclination -= 0.6 * diff/(3600*6);
    } 
    // set rain
    if (params.rain) {
        statesParameters.visible = true;
    }
    // console.log(statesParameters.inclination);

    updateSun();
}
function animate() {
    // Adjust FPS
    // setTimeout( function() {
    //     requestAnimationFrame( animate );
    // }, 1000 / 30 );

    requestAnimationFrame( animate );
    render();
}
function render() {

    const time = performance.now() * 0.001;
   
    if (boat) {
        boat.position.y = Math.sin( time ) * 1 - 15;
        // boat.rotation.z += 0.01;
        boat.rotation.y = Math.PI * 0.01 * Math.sin( time );
        // boat.rotation.z += 0.01;
    }
    		
    updateRain();
    water.material.uniforms[ 'time' ].value += 1.0 / 60.0;

    renderer.render( scene, camera );

}
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}
function parseParams() {
    if(resData === null || resData === undefined) {
        return;
    }

    if (resData.humidity) {
        params.humidity = parseFloat(resData.humidity)
    }
    if (resData.clouds) {
        params.clouds = parseFloat(resData.clouds)
    }
    if (resData.rain) {
        params.rain = parseFloat(resData.rain)
    }
    if (resData.wind) {
        params.wind = parseFloat(resData.wind)
    }
    if (resData.timestamp) {
        params.timestamp = parseInt(resData.timestamp)
    }
    if (resData.sunrise) {
        params.sunrise = parseInt(resData.sunrise)
    }
    if (resData.sunset) {
        params.sunset = parseInt(resData.sunset)
    }
    console.log(params);
}