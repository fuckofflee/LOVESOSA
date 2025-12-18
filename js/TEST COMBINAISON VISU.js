// --- ASSETS ---
let maskModel, gogglesModel, starObj;       // Visual 1
let starCircleObj;                          // Visual 2
let baseObj, skeletonObj;                   // Visual 3
let videoTexture, maskStarImg;
let song, fft;

// --- GLOBAL SETTINGS ---
let pulsingScale = 1;
let interactionMode = 'CAMERA'; 
let lastMouseX = 0, lastMouseY = 0;
let friction = 0.95; // 0.9 = fast stop, 0.99 = slow glide

// ==========================================
// --- VISUAL 1: MASK & GOGGLES (CENTER) ---
// ==========================================
// Using logic from sketch2.js
let v1_posX = 0, v1_posY = 0;       
let v1_scale = 1300;                
let v1_rotY = 0, v1_rotX = 0;      
let v1_velY = 0, v1_velX = 0;      
let v1_autoSpeed = -0.005;             

// Parameters from sketch2.js
let modelYOffset = 0;     
let videoFlipY = false;    
let videoFlipX = true;   
let areaMultiplier = 1; 
let starSizeManual = 0.32; 
let videoTransparency = 0;

// ==========================================
// --- VISUAL 2: STAR CIRCLE (OUTER) ---
// ==========================================
let v2_posX = 0, v2_posY = 0;
let v2_rotY = 0, v2_rotX = 0;
let v2_velY = 0, v2_velX = 0;
let v2_autoSpeed = 0.003;           

let numStars = 16;          
let circleRadius = 200;     
let sensitivity = 1.0; 
let circleStarBaseScale = 0.55;  
let minScale = 0.5;           
let maxScale = 0.9;  

// ==========================================
// --- VISUAL 3: BASE & SKELETON (MIDDLE) ---
// ==========================================
let v3_posX = 0, v3_posY = 0;
let v3_rotY = 0; 
let v3_velY = 0; 
let v3_autoSpeed = -0.002;          

// INDEPENDENT SCALES
let v3_skeletonScale = 0.95;
let v3_baseScale = 1;

let glassColor = [210, 0, 0, 150]; 

function preload() {
    maskModel = loadModel('3d/screenmask.obj'); 
    gogglesModel = loadModel('3d/goggles.obj'); 
    starObj = loadModel('3d/star.obj', true); 
    starCircleObj = loadModel('3d/star2.obj', true); 
    baseObj = loadModel('3d/base.obj', true);          
    skeletonObj = loadModel('3d/skeleton.obj', true);  
    
    videoTexture = createVideo(['img/sosavideo.mp4']);
    videoTexture.loop();
    videoTexture.hide();
    maskStarImg = loadImage('img/star.png');      
    
    song = loadSound('sound/LOVESOSA.mp3');
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    angleMode(RADIANS); 
    
    fft = new p5.FFT(0.8, 64); 
    fft.setInput(song);

    // --- MASK UV MAPPING (From sketch2.js) ---
    // This logic ensures the texture is placed correctly
    if (maskModel) {
        maskModel.uvs = []; 
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (let i = 0; i < maskModel.vertices.length; i++) {
            let v = maskModel.vertices[i];
            if (v.x < minX) minX = v.x;
            if (v.x > maxX) maxX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.y > maxY) maxY = v.y;
        }

        for (let i = 0; i < maskModel.vertices.length; i++) {
            let v = maskModel.vertices[i];
            let u = videoFlipX ? map(v.x, minX, maxX, 1, 0) : map(v.x, minX, maxX, 0, 1);
            let vCoord = videoFlipY ? map(v.y, minY, maxY, 1, 0) : map(v.y, minY, maxY, 0, 1);
            maskModel.uvs.push(u);
            maskModel.uvs.push(vCoord);
        }
    }
}

function draw() {
    background(255); 
    noStroke(); 

    updatePhysics(); 

    if (!mouseIsPressed || interactionMode === 'CAMERA') {
        orbitControl(); 
    }

    ambientLight(100); 
    pointLight(255, 255, 255, 0, 0, 600); 
    directionalLight(255, 255, 255, 1, 1, -1);

    let spectrum = fft.analyze(); 
    let trebleEnergy = fft.getEnergy("treble");
    let targetScale = map(trebleEnergy, 0, 255, 1.0, 1.8); 
    pulsingScale = lerp(pulsingScale, targetScale, 0.1);

    // --- DRAWING ---
    
    // Visual 3: Background/Middle
    drawVisual3_SkeletonBase();
    
    // Visual 1: Center Mask (Restored sketch2 logic)
    drawVisual1_MaskGoggles();
    
    // Visual 2: Outer Ring
    drawVisual2_StarCircle(spectrum);
}

function updatePhysics() {
    // Visual 1
    if (!mouseIsPressed || interactionMode !== 'VISUAL1') {
        v1_rotY += v1_autoSpeed + v1_velY;
        v1_rotX += v1_velX;
        v1_velY *= friction; v1_velX *= friction;
    }
    // Visual 2
    if (!mouseIsPressed || interactionMode !== 'VISUAL2') {
        v2_rotY += v2_autoSpeed + v2_velY;
        v2_rotX += v2_velX;
        v2_velY *= friction; v2_velX *= friction;
    }
    // Visual 3
    if (!mouseIsPressed || interactionMode !== 'VISUAL3') {
        v3_rotY += v3_autoSpeed + v3_velY;
        v3_velY *= friction;
    }
}

function drawVisual1_MaskGoggles() {
    if (!maskModel || !gogglesModel) return;

    push();
    translate(v1_posX, v1_posY, 0);
    rotateY(v1_rotY);
    rotateX(v1_rotX);

    // --- MASTER TRANSFORM (Matches sketch2.js exactly) ---
    // Note: using RADIANS mode in setup, so 90 deg = HALF_PI, 180 = PI
    translate(0, modelYOffset, 0); 
    rotateX(HALF_PI); // 90 degrees
    rotateZ(PI);      // 180 degrees
    scale(v1_scale); 
    
    // 1. Render Mask
        push();
        translate(0, modelYOffset, 0); 
        let actualAlpha = 255 - videoTransparency;
        tint(255, actualAlpha);
        texture(videoTexture); 
        model(maskModel);
        pop();
        
    
    // 2. Render Goggles (Stars)
    push();
    texture(maskStarImg); 
    for (let i = 0; i < gogglesModel.faces.length; i++) {
        let f = gogglesModel.faces[i];
        let v1 = gogglesModel.vertices[f[0]];
        let v2 = gogglesModel.vertices[f[1]];
        let v3 = gogglesModel.vertices[f[2]];

        let cx = (v1.x + v2.x + v3.x) / 3;
        let cy = (v1.y + v2.y + v3.y) / 3;
        let cz = (v1.z + v2.z + v3.z) / 3;

        let ax = v2.x - v1.x; let ay = v2.y - v1.y; let az = v2.z - v1.z;
        let bx = v3.x - v1.x; let by = v3.y - v1.y; let bz = v3.z - v1.z;
        // Cross product for area
        let cpx = ay * bz - az * by;
        let cpy = az * bx - ax * bz;
        let cpz = ax * by - ay * bx;
        let area = sqrt(cpx*cpx + cpy*cpy + cpz*cpz) * 0.5;
        
        push(); 
        translate(cx, cy, cz);
        let s = area * areaMultiplier * starSizeManual * pulsingScale;
        scale(s); 
        rotateX(HALF_PI); // 90 deg
        rotateY(HALF_PI); // 90 deg
        model(starObj); 
        pop();
    }
    pop(); 
    
    pop(); // End Master
}

function drawVisual2_StarCircle(spectrum) {
    push();
    translate(v2_posX, v2_posY, 0);
    rotateY(v2_rotY);
    rotateX(v2_rotX);

    let binStep = floor((spectrum.length * 0.8) / numStars);
    for (let i = 0; i < numStars; i++) {
        let theta = map(i, 0, numStars, 0, TWO_PI);
        let x = circleRadius * cos(theta);
        let z = circleRadius * sin(theta);
        let scaleFactor = map(spectrum[i * binStep] * sensitivity, 0, 255, minScale, maxScale);

        push();
        translate(x, 0, z);
        rotateY(-theta - HALF_PI); 
        ambientMaterial(255, 0, 0); 
        scale(scaleFactor * circleStarBaseScale); 
        rotateX(HALF_PI); 
        model(starCircleObj);
        pop();
    }
    pop();
}

function drawVisual3_SkeletonBase() {
    push();
    translate(v3_posX, v3_posY, 0);
    rotateY(v3_rotY); // Horizontal spin only

    // Orientation Fix:
    // Previously rotateX(HALF_PI) made it lie flat. 
    // rotateX(PI) usually flips it upright if Y is inverted.
    rotateX(PI); 

    // A. Skeleton
    if (skeletonObj) {
        push();
        scale(v3_skeletonScale);
        specularMaterial(0, 0, 0); 
        shininess(100);
        model(skeletonObj);
        pop();
    }

    // B. Base
    if (baseObj) {
        push();
        scale(v3_baseScale);
        fill(glassColor[0], glassColor[1], glassColor[2], glassColor[3]);
        shininess(100);
        model(baseObj);
        pop();
    }
    pop();
}

function mousePressed() {
    let d = dist(mouseX, mouseY, width/2, height/2);
    // Zone Check
    if (d < 100) {
        interactionMode = 'VISUAL1';
        v1_velX = 0; v1_velY = 0;
    } else if (d < 280) {
        interactionMode = 'VISUAL3';
        v3_velY = 0;
    } else if (d < 450) {
        interactionMode = 'VISUAL2';
        v2_velX = 0; v2_velY = 0;
    } else {
        interactionMode = 'CAMERA';
    }
    lastMouseX = mouseX;
    lastMouseY = mouseY;
}

function mouseDragged() {
    let dx = (mouseX - lastMouseX) * 0.01;
    let dy = (mouseY - lastMouseY) * 0.01;

    if (interactionMode === 'VISUAL1') {
        v1_rotY += dx; v1_rotX += dy;
        v1_velY = dx; v1_velX = dy;
    } else if (interactionMode === 'VISUAL2') {
        v2_rotY += dx; v2_rotX += dy;
        v2_velY = dx; v2_velX = dy;
    } else if (interactionMode === 'VISUAL3') {
        v3_rotY += dx;
        v3_velY = dx;
    }
    lastMouseX = mouseX;
    lastMouseY = mouseY;
}

function mouseReleased() {
    // Play/Pause toggle on click (minimal movement)
    if (dist(mouseX, mouseY, lastMouseX, lastMouseY) < 2) { 
        if (song.isPlaying()) { song.pause(); videoTexture.pause(); }
        else { song.loop(); videoTexture.loop(); }
    }
    interactionMode = 'CAMERA'; 
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }