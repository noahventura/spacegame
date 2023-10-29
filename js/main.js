import * as THREE from 'three';

let lasers = [];
const laserSpeed=0.2;

let lastShotTime =0;
const laserCooldown =500;

let laserSoundBuffer;

//initialize audioContext and gainNode to control volume
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioContext.createGain();
gainNode.connect(audioContext.destination);
gainNode.gain.value = 0.5;

//fetch the shooting sound
fetch('sounds/blast.mp3')
    .then(response => response.arrayBuffer())
    .then(data => audioContext.decodeAudioData(data))
    .then(buffer => {
        laserSoundBuffer = buffer;
    })
    .catch(e => {
        console.error("Error with decoding audio data" + e.err);
    });

//create scene and perspective(cam)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
//create renderer
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Load background texture and add it to a plane scaled to screen dimensions
const backgroundTextureLoader = new THREE.TextureLoader();
backgroundTextureLoader.load('images/bg.png', function(bgTexture) {
    const bgAspect = bgTexture.image.width / bgTexture.image.height;
    const planeGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerWidth / bgAspect);
    const planeMaterial = new THREE.MeshBasicMaterial({ map: bgTexture, transparent: true });
    const backgroundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    backgroundPlane.position.z = -10; // Push it behind other objects
    scene.add(backgroundPlane);
});

//load laser texture
const laserTextureLoader = new THREE.TextureLoader();
let laserTexture;
laserTextureLoader.load('laser.png', function(texture) {
    laserTexture = texture;
});

//load spaceship texture
const textureLoader = new THREE.TextureLoader();
textureLoader.load('images/spaceship.png', function(texture) {
    const geometry = new THREE.PlaneGeometry(0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const spaceship = new THREE.Mesh(geometry, material);
    scene.add(spaceship);

    camera.position.z = 5;

    //prepare spaceship to be moved
    const spaceshipVelocity = new THREE.Vector3(0, 0, 0);
    const moveSpeed = 0.05;  // Slower movement speed
    
    //update screen
    function animate() {
        requestAnimationFrame(animate);

        // Update position with velocity
        spaceship.position.add(spaceshipVelocity);

        // Constrain spaceship within screen bounds
        const maxPos = getBounds(0.25);
        spaceship.position.x = THREE.MathUtils.clamp(spaceship.position.x, -maxPos.x, maxPos.x);
        spaceship.position.y = THREE.MathUtils.clamp(spaceship.position.y, -maxPos.y, maxPos.y);


        //update lasers
        for (let i=0;i< lasers.length; i++){
            lasers[i].position.x += laserSpeed;
            if(lasers[i].position.x > window.innerWidth){
                scene.remove(lasers[i]);
                lasers.splice(i,1);
                i--
            }
        }
        renderer.render(scene, camera);
    }
    //keep spaceship on screen
    function getBounds(halfSize) {
        const aspectRatio = window.innerWidth / window.innerHeight;
        const vFov = camera.fov * Math.PI / 180;
        const distance = camera.position.z - spaceship.position.z;
        const height = 2 * Math.tan(vFov / 2) * distance;
        const width = height * aspectRatio;

        return {
            x: (width / 2) - halfSize,
            y: (height / 2) - halfSize
        };
    }

    document.addEventListener('keydown', onDocumentKeyDown, false);
    document.addEventListener('keyup', onDocumentKeyUp, false);

    function onDocumentKeyDown(event) {
        const keyCode = event.which;
    
        if (keyCode == 38 || keyCode == 87) { // Up or W
            spaceshipVelocity.y = moveSpeed;
            spaceship.scale.x = 1;  // Reset the spaceship to original orientation
        } else if (keyCode == 40 || keyCode == 83) { // Down or S
            spaceshipVelocity.y = -moveSpeed;
            spaceship.scale.x = 1;  // Reset the spaceship to original orientation
        } else if (keyCode == 37 || keyCode == 65) { // Left or A
            spaceshipVelocity.x = -moveSpeed;
            spaceship.scale.x = -1;  // Flip the spaceship horizontally
        } else if (keyCode == 39 || keyCode == 68) { // Right or D
            spaceshipVelocity.x = moveSpeed;
            spaceship.scale.x = 1;  // Reset the spaceship to original orientation
        }
        //spacebar - check for delay to see whether laser can be fired
        if (keyCode ==32){
            const currentTime = new Date().getTime();
            if (currentTime - lastShotTime > laserCooldown) {
                shootLaser();
                playLaserSound();
                lastShotTime = currentTime;
            }
        }
    }
    
    function onDocumentKeyUp(event) {
        const keyCode = event.which;
    
        if (keyCode == 38 || keyCode == 87 || keyCode == 40 || keyCode == 83) {
            spaceshipVelocity.y = 0;
        } else if (keyCode == 37 || keyCode == 65 || keyCode == 39 || keyCode == 68) {
            spaceshipVelocity.x = 0;
            if (spaceship.scale.x == -1) {
                spaceship.scale.x = 1;  // Reset the spaceship to original orientation when the key is released
            }
        }
    }
    
    //playsound
    function playLaserSound() {
        if (!laserSoundBuffer) return;  // If the sound buffer isn't loaded yet, do nothing
    
        const soundSource = audioContext.createBufferSource();
        soundSource.buffer = laserSoundBuffer;
        soundSource.connect(gainNode);
        soundSource.start(0);
    }
    //generate laser
    function shootLaser() {
        const laserGeometry = new THREE.PlaneGeometry(0.1, 0.01);
        const laserMaterial = new THREE.MeshBasicMaterial({ map: laserTexture, transparent: true });
        const laser = new THREE.Mesh(laserGeometry, laserMaterial);
        laser.position.set(spaceship.position.x + spaceship.geometry.parameters.width / 2 + 0.1, spaceship.position.y, spaceship.position.z); // Adjusting spawn position
        scene.add(laser);
        lasers.push(laser);
    
        playLaserSound();  // Play the laser sound
    }
    //update screen
    animate();
});
