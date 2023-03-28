import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import { BoxLineGeometry } from 'three/addons/geometries/BoxLineGeometry.js';
import { Configuration, OpenAIApi } from 'openai';

window.THREE = THREE;

const apiKey = window.location.hash.substring(1);
const configuration = new Configuration({
  apiKey: apiKey,
});
delete configuration.baseOptions.headers['User-Agent'];
const openai = new OpenAIApi(configuration);

const textinput = document.getElementById('openai_prompt');

let camera, scene, renderer;

let controller1, controller2;

init();
animate();

let userPrompt;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x505050);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
    camera.position.set(0, 1.6, 3);

    //

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    //

    document.body.appendChild(VRButton.createButton(renderer));

    //

    function onSelect() {
        if (document.activeElement.tagName === 'INPUT') {
            textinput.blur();
        } else {
            textinput.focus();
        }
    }
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectend', onSelect);
    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectend', onSelect);

    //

    window.addEventListener('resize', onWindowResize);

    //

    textinput.oninput = function(inputEvent) {
        userPrompt = inputEvent.data;
    };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    if (document.activeElement.tagName !== 'INPUT') {
        if (userPrompt) {
            console.log('user prompt: ' + userPrompt);
            userPrompt = null;
        }
    }

    renderer.render(scene, camera);
}
