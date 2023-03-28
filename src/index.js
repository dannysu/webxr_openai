import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import { BoxLineGeometry } from 'three/addons/geometries/BoxLineGeometry.js';
import { Configuration, OpenAIApi } from 'openai';

const THUMBSTICK_X_AXIS = 2;
const THUMBSTICK_Y_AXIS = 3;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

window.THREE = THREE;

const apiKey = window.location.hash.substring(1);
const configuration = new Configuration({
  apiKey: apiKey,
});
delete configuration.baseOptions.headers['User-Agent'];
const openai = new OpenAIApi(configuration);

const textinput = document.getElementById('openai_prompt');

let camera, scene, renderer;
let viewerTransform;

const clock = new THREE.Clock();

let controller1, controller2;
let leftGamepad, rightGamepad;

init();
animate();

const userPrompts = [];

function getMessage(prompts) {
    let list = '';
    let i = 1;
    for (const prompt of prompts) {
        list += `${i}. ${prompt}\n`;
        i++;
    }
    console.log(list);
    const codeBlock = "```";
    const content = `
    I have the following code:
    ${codeBlock}
    let scene, camera, renderer;
    init();
    animate();
    function init() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
      renderer = new THREE.WebGLRenderer();
      initByOpenAI();
    }
    function animate() {
      renderer.setAnimationLoop(render);
    }
    function render(time) {
      renderByOpenAI(time);
      renderer.render(scene, camera);
    }
    function initByOpenAI() {
    }
    function renderByOpenAI(time) {
    }
    ${codeBlock}
    Fill in the initByOpenAI function and the renderByOpenAI function that does the following:
    ${list}
    Give me the code for the new initByOpenAI and renderByOpenAI functions.
    `;
    return {
        role: 'user',
        content: content,
    };
}

function getFunctionCode(code, name) {
    let funcCode = '';
    const initStart = code.indexOf(`function ${name}(`);
    if (initStart >= 0) {
        let level = 0;
        for (let i = initStart; i < code.length; i++) {
            const c = code[i];
            funcCode += c;
            if (c === '{') {
                level++;
            } else if (c === '}') {
                level--;
                if (level === 0) {
                    return funcCode;
                }
            }
        }
        console.log(`couldn't find the end of "function ${name}()"`);
        return null;
    }
    console.log(`couldn't find the start of "function ${name}()"`);
    return null;
}

let renderFuncCodeGood = true;
async function processPrompt(prompt) {
    userPrompts.push(prompt);
    try {
        const completion = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [
                getMessage(userPrompts),
            ],
        });
        const result = completion.data.choices[0].message.content;
        let code = result;
        console.log('result:');
        console.log(result);
        let matches = code.match(/```([\s\S]*)```/);
        if (matches) {
            code = matches[1];
        }

        let initFuncCode = getFunctionCode(code, 'initByOpenAI');
        let renderFuncCode = getFunctionCode(code, 'renderByOpenAI');

        if (initFuncCode && renderFuncCode) {
            initFuncCode = "window.initByOpenAI = " + initFuncCode + "\ntrue;";
            console.log(initFuncCode);
            renderFuncCode = "window.renderByOpenAI = " + renderFuncCode + "\ntrue;";
            console.log(renderFuncCode);
            let evalResult;
                evalResult = eval(initFuncCode);
                if (evalResult) {
                    evalResult = eval(renderFuncCode);
                    if (evalResult) {
                        renderFuncCodeGood = true;
                        console.log('remove all objects and re-init');
                        scene.remove.apply(scene, scene.children);
                        try {
                            window.initByOpenAI();
                        } catch(e) {
                            renderFuncCodeGood = false;
                            console.log(e);
                        }
                        scene.add(viewerTransform);
                    }
                }
        }
    } catch(e) {
        userPrompts.pop();
        console.log(e);
    }
}
window.processPrompt = processPrompt;

let userPrompt;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x505050);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 10);

    viewerTransform = new THREE.Group();
    viewerTransform.add(camera);
    scene.add(viewerTransform);
    viewerTransform.position.set(0, 0, 10);

    //

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local');
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
    controller1.addEventListener('connected', function(event) {
        if (event.data.handedness === 'right') {
            rightGamepad = event.data.gamepad;
        } else {
            leftGamepad = event.data.gamepad;
        }
    });
    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectend', onSelect);
    controller2.addEventListener('connected', function(event) {
        if (event.data.handedness === 'right') {
            rightGamepad = event.data.gamepad;
        } else {
            leftGamepad = event.data.gamepad;
        }
    });

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

function moveLeftRight(xDelta, deltaTime) {
    const speed = 1;
    viewerTransform.translateOnAxis(X_AXIS, xDelta * speed * deltaTime);
}

function moveForwardBack(yDelta, deltaTime) {
    const speed = 1;
    viewerTransform.translateOnAxis(Z_AXIS, yDelta * speed * deltaTime);
}

function rotateLeftRight(xDelta, deltaTime) {
    const speed = 20;
    viewerTransform.rotateOnAxis(Y_AXIS, xDelta * speed * deltaTime * Math.PI / 180);
}

function moveUpDown(yDelta, deltaTime) {
    const speed = 1;
    viewerTransform.translateOnAxis(Y_AXIS, yDelta * speed * deltaTime);
}

function render(time) {
    if (document.activeElement.tagName !== 'INPUT') {
        if (userPrompt) {
            processPrompt(userPrompt);
            userPrompt = null;
        }
    }

    if (renderer.xr.isPresenting) {
        const deltaTime = clock.getDelta();
        if (leftGamepad) {
            if (leftGamepad.axes[THUMBSTICK_X_AXIS] !== 0) {
                const xDelta = leftGamepad.axes[THUMBSTICK_X_AXIS];
                moveLeftRight(xDelta, deltaTime);
            }
            if (leftGamepad.axes[THUMBSTICK_Y_AXIS] !== 0) {
                const yDelta = leftGamepad.axes[THUMBSTICK_Y_AXIS];
                moveForwardBack(yDelta, deltaTime);
            }
        }
        if (rightGamepad) {
            if (rightGamepad.axes[THUMBSTICK_X_AXIS] !== 0) {
                const xDelta = rightGamepad.axes[THUMBSTICK_X_AXIS];
                rotateLeftRight(-xDelta, deltaTime);
            }
            if (rightGamepad.axes[THUMBSTICK_Y_AXIS] !== 0) {
                const yDelta = rightGamepad.axes[THUMBSTICK_Y_AXIS];
                moveUpDown(-yDelta, deltaTime);
            }
        }
    }

    if (window.renderByOpenAI && renderFuncCodeGood) {
        try {
            window.renderByOpenAI(time);
        } catch(e) {
            renderFuncCodeGood = false;
            console.log(e);
        }
    }
    renderer.render(scene, camera);
}
