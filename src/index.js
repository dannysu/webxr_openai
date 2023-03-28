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

let room;

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x505050);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
    camera.position.set(0, 1.6, 3);

    room = new THREE.LineSegments(
        new BoxLineGeometry(6, 6, 6, 10, 10, 10),
        new THREE.LineBasicMaterial({ color: 0x808080 })
    );
    room.geometry.translate(0, 3, 0);
    scene.add(room);

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

    window.addEventListener('resize', onWindowResize);

    //

    let functionCount = 0;
    textinput.oninput = async function(value) {
        const completion = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: `// a Three.js function named "func${functionCount}" that creates and returns ${value}`,
            max_tokens: 3000,
        });
        functionCount++;
        const code = completion.data.choices[0].text;
        eval(code);
        const objName = `obj${functionCount}`;
        eval(`
            const ${objName} = func${functionCount}();
            scene.add(${objName});

            // Put the object at a random place

            ${objName}.position.set(1, 1, 1);
        `);
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
    renderer.render(scene, camera);
}
