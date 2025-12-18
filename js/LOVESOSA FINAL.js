// --- CONFIGURATION & ASSETS ---
let gogglesModel, starObj;                  // Visual 1
let starCircleObj;                          // Visual 2
let baseObj, skeletonObj;                   // Visual 3
let flagImg;                                // Visual 4
let videoTexture, maskStarImg;
let song, fft;
let myFont;
let chiefkeefFont;

// --- TYPING GAME STATE ---
const TARGET_WORDS = [
    { text: "LOVE SOSA",   visualId: 1, typed: "" },
    { text: "O BLOCK",   visualId: 3, typed: "" },
    { text: "NEVER SOBER", visualId: 2, typed: "" },
    { text: "CHIRAQ",      visualId: 4, typed: "" } 
];

let activeVisuals = {
    1: false, // Goggles Only (Mask Removed)
    2: false, // Star Circle
    3: false, // Skeleton & Base
    4: false  // Flag Noise Points
};

// --- GLOBAL SETTINGS ---
let textLineSpacing = 22; 
let pulsingScale = 3;
let friction = 0.92; 
let interactionMode = 'CAMERA'; 
let lastMouseX = 0, lastMouseY = 0;
let audioStarted = false; 

// --- RED TEXT PARAMETERS ---
let redText = "Chief Keef";
let redTextSize = 30;
let redTextX = 0; 
let redTextY = -75;

// --- VISUAL 1 PARAMETERS (Goggles) ---
let v1_rot = { x: 0, y: 0 };
let v1_vel = { x: 0, y: 0 };
let v1_autoSpeed = -0.005;
let v1_scale = 2000;
let areaMultiplier = 1; 
let starSizeManual = 0.4; 

// --- VISUAL 2 PARAMETERS (Star Circle) ---
let v2_rot = { x: 0, y: 0 };
let v2_vel = { x: 0, y: 0 };
let v2_autoSpeed = 0.003;
let numStars = 16;          
let circleRadius = 300;     
let sensitivity = 1.5; 
let circleStarBaseScale = 0.5;  
let minScale = 0.8 ;           
let maxScale = 2.3; 

// --- VISUAL 3 PARAMETERS (Skeleton/Base) ---
let v3_rotY = 0; 
let v3_velY = 0; 
let v3_autoSpeed = -0.004;          
let v3_skeletonScale = 0.956;
let v3_baseScale = 1;
let glassColor = [210, 0, 0, 150]; 
let v3_baseOpacity = 150; 
let currentBaseAlpha = 150; 

// --- VISUAL 4 PARAMETERS (Flag Points) ---
let v4_points = [];         // Holds {x, y, color, isStar}
let v4_gridDensity = 12;     // Density of points
let v4_baseScale = 0.4;     // Scale of the flag layer
let v4_noiseScale = 0.08;   // Texture of the noise

function preload() {
    // 1. Load Font & Audio
    myFont = loadFont('fonts/typewriter.otf');  
    chiefkeefFont = loadFont('fonts/chandia.otf'); 
    song = loadSound('sound/LOVESOSA.mp3');
    
    // 2. Load Models (Mask Removed)
    gogglesModel = loadModel('3d/goggles.obj'); 
    starObj = loadModel('3d/star.obj', true); 
    starCircleObj = loadModel('3d/star2.obj', true); 
    baseObj = loadModel('3d/base.obj', true);          
    skeletonObj = loadModel('3d/skeleton.obj', true);
    
    // 3. Load Images/Video
    videoTexture = createVideo(['img/sosavideo.mp4']);
    videoTexture.loop();
    videoTexture.hide();
    maskStarImg = loadImage('img/star.png');
    flagImg = loadImage('img/flag.png'); 
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    angleMode(RADIANS); 
    strokeCap(ROUND); 
    
    textFont(myFont);
    textSize(20);
    textAlign(CENTER, CENTER);

    fft = new p5.FFT(0.8, 1024); 
    song.setVolume(0.7);
    fft.setInput(song);

    // --- GENERATE VISUAL 4 POINTS ---
    if (flagImg) {
        flagImg.loadPixels();
        let w = flagImg.width;
        let h = flagImg.height;
        let xOff = -w / 2;
        let yOff = -h / 2;

        for (let y = 0; y < h; y += v4_gridDensity) {
            for (let x = 0; x < w; x += v4_gridDensity) {
                let i = (x + y * w) * 4;
                let r = flagImg.pixels[i];
                let g = flagImg.pixels[i+1];
                let b = flagImg.pixels[i+2];

                let isBlue = (b > r + 20 && b > g - 30 && b > 80);
                let isRed = (r > 150 && r > g + 40 && r > b + 40);

                if (isBlue) {
                    v4_points.push({
                        x: (x + xOff) * 1.5, 
                        y: (y + yOff) * 1.5,
                        c: color(r, g, b, 200), // Original blue
                        isStar: false
                    });
                } else if (isRed) {
                    v4_points.push({
                        x: (x + xOff) * 1.5,
                        y: (y + yOff) * 1.5,
                        c: color(255, 0, 0, 255), // Explicit RED for stars
                        isStar: true
                    });
                }
            }
        }
    }
}

function draw() {
    background(255); 
    noStroke(); 

    updatePhysics();

    // --- LIGHTING ---
    ambientLight(180); 
    pointLight(255, 255, 255, 0, 0, 500);
    directionalLight(220, 220, 220, 0, 0, -1);

    // --- AUDIO ANALYSIS ---
    let spectrum = fft.analyze(); 
    let trebleEnergy = fft.getEnergy("treble"); 
    let bassEnergy = fft.getEnergy("bass");
    
    let targetScale = map(trebleEnergy, 0, 255, 1.0, 1.8); 
    pulsingScale = lerp(pulsingScale, targetScale, 0.1);
    
    let targetAlpha = map(bassEnergy, 0, 255, 0, v3_baseOpacity);
    currentBaseAlpha = lerp(currentBaseAlpha, targetAlpha, 0.15); 

    drawLeftInterface();
    drawRightVisuals(spectrum, trebleEnergy);
}

// =========================================================
// LEFT SIDE: TEXT
// =========================================================
function drawLeftInterface() {
    push();
    translate(-width/4, 0, 0); 
    fill(0);
    textSize(20);
    textFont(myFont);
    
    let startY = -((TARGET_WORDS.length - 1) * textLineSpacing) / 2;

    for (let i = 0; i < TARGET_WORDS.length; i++) {
        let item = TARGET_WORDS[i];
        let y = startY + (i * textLineSpacing);

        fill(200);
        text(item.text, 0, y);

        if (item.typed.length > 0) {
            fill(0);
            let fullW = textWidth(item.text);
            let typedW = textWidth(item.typed);
            text(item.typed, -fullW/2 + typedW/2, y);
        }
    }
    
    fill(255, 0, 0);
    textFont(chiefkeefFont);
    textSize(redTextSize);
    text(redText, redTextX, redTextY);
    pop();
}

// =========================================================
// RIGHT SIDE: VISUALS
// =========================================================
function drawRightVisuals(spectrum, trebleEnergy) {
    push();
    translate(width/5, 0, 0); 

    // --- VISUAL 4 (Flag Points) ---
    if (activeVisuals[4]) {
        push();
        translate(0, -350, 0);
        drawVisual4_FlagPoints(trebleEnergy);
        pop();
        
        push();
        translate(0, 350, 0);
        drawVisual4_FlagPoints(trebleEnergy);
        pop();
    }

    if (interactionMode === 'CAMERA') {
        orbitControl();
    }

    // 2. SKELETON & BASE
    if (activeVisuals[3]) {
        drawVisual3_SkeletonBase();
    }

    // 3. GOGGLES (Visual 1)
    if (activeVisuals[1]) {
        drawVisual1_Goggles();
    }

    // 4. STAR CIRCLE
    if (activeVisuals[2]) {
        drawVisual2_StarCircle(spectrum);
    }

    pop();
}

// --- VISUAL 1: Goggles Only ---
function drawVisual1_Goggles() {
    if (!gogglesModel) return;
    push();
    rotateY(v1_rot.y);
    rotateX(v1_rot.x);
    translate(0, 0, 0); 
    rotateX(HALF_PI); 
    rotateZ(PI);      
    scale(v1_scale); 
    
    // Draw Goggles Stars
    push();
    texture(maskStarImg); 
    for (let i = 0; i < gogglesModel.faces.length; i++) {
        let f = gogglesModel.faces[i];
        let v1 = gogglesModel.vertices[f[0]];
        let v2 = gogglesModel.vertices[f[1]];
        let v3 = gogglesModel.vertices[f[2]];
        let cx = (v1.x+v2.x+v3.x)/3; let cy = (v1.y+v2.y+v3.y)/3; let cz = (v1.z+v2.z+v3.z)/3;
        
        let ax = v2.x-v1.x; let ay = v2.y-v1.y; let az = v2.z-v1.z;
        let bx = v3.x-v1.x; let by = v3.y-v1.y; let bz = v3.z-v1.z;
        let area = sqrt(pow(ay*bz-az*by,2) + pow(az*bx-ax*bz,2) + pow(ax*by-ay*bx,2)) * 0.5;

        push(); 
        translate(cx, cy, cz);
        scale(area * areaMultiplier * starSizeManual * pulsingScale); 
        rotateX(HALF_PI); rotateY(HALF_PI); 
        model(starObj); 
        pop();
    }
    pop(); 
    pop();
}

// --- VISUAL 2: Star Circle ---
function drawVisual2_StarCircle(spectrum) {
    push();
    rotateY(v2_rot.y);
    rotateX(v2_rot.x);

    let binStep = floor((spectrum.length) / numStars);
    for (let i = 0; i < numStars; i++) {
        let theta = map(i, 0, numStars, 0, TWO_PI);
        let x = circleRadius * cos(theta);
        let z = circleRadius * sin(theta);
        let scaleZ = map(spectrum[i * binStep] * sensitivity/2, 0, 255, minScale, maxScale+1);

        push();
        translate(x, 0, z);
        rotateY(-theta - HALF_PI); 
        ambientMaterial(255, 0, 0); 
        scale(circleStarBaseScale, circleStarBaseScale, scaleZ * circleStarBaseScale); 
        rotateX(HALF_PI); 
        model(starCircleObj);
        pop();
    }
    pop();
}

// --- VISUAL 3: Skeleton ---
function drawVisual3_SkeletonBase() {
    push();
    rotateY(v3_rotY); 
    rotateX(PI); 

    if (skeletonObj) {
        push();
        scale(v3_skeletonScale);
        specularMaterial(0, 0, 0); 
        shininess(100);
        model(skeletonObj);
        pop();
    }
    if (baseObj) {
        push();
        scale(v3_baseScale);
        fill(glassColor[0], glassColor[1], glassColor[2], currentBaseAlpha);
        shininess(100);
        model(baseObj);
        pop();
    }
    pop();
}

// --- VISUAL 4: Flag Points (STATIC POSITION, DYNAMIC SIZE) ---
function drawVisual4_FlagPoints(trebleVal) {
    push();
    translate(0, 0, 0); 
    scale(v4_baseScale);
    
    // Map treble energy to maximum point size
    let sizeMag = map(trebleVal, 0, 255, 2, 18); 
    let time = frameCount * 0.05;

    for (let i = 0; i < v4_points.length; i++) {
        let p = v4_points[i];
        
        let n = noise(p.x * v4_noiseScale, p.y * v4_noiseScale, time);
        
        let pointSize = map(n, 0.2, 0.8, 0.5, sizeMag);
        if (pointSize < 0) pointSize = 0;

        stroke(p.c);
        strokeWeight(pointSize);
        point(p.x, p.y, 0); 
    }
    
    pop();
}

// =========================================================
// INPUT & LOGIC
// =========================================================

function startAudio() {
    if (!audioStarted) {
        song.loop();
        audioStarted = true;
    }
}

function keyTyped() {
    startAudio();
    
    let char = key.toUpperCase();
    if (char.length !== 1) return;

    for (let item of TARGET_WORDS) {
        if (item.typed !== item.text) {
            let nextCharIndex = item.typed.length;
            let expectedChar = item.text.charAt(nextCharIndex);

            if (char === expectedChar) {
                item.typed += char;
                if (item.typed === item.text) {
                    activeVisuals[item.visualId] = true;
                }
            } else {
                if (item.typed.length > 0) {
                     item.typed = ""; 
                }
            }
        }
    }
}

function updatePhysics() {
    if (activeVisuals[1] && interactionMode !== 'VISUAL1') {
        v1_rot.y += v1_autoSpeed + v1_vel.y;
        v1_rot.x += v1_vel.x;
        v1_vel.y *= friction; v1_vel.x *= friction;
    }
    
    if (activeVisuals[2] && interactionMode !== 'VISUAL2') {
        v2_rot.y += v2_autoSpeed + v2_vel.y;
        v2_rot.x += v2_vel.x;
        v2_vel.y *= friction; v2_vel.x *= friction;
    }
    
    if (activeVisuals[3] && interactionMode !== 'VISUAL3') {
        v3_rotY += v3_autoSpeed + v3_velY;
        v3_velY *= friction;
    }
}

function mousePressed() {
    startAudio();
    
    let centerX = width * 3/4;
    let centerY = height / 2;
    let d = dist(mouseX, mouseY, centerX, centerY);
    
    // ZONE 1: Center (Goggles)
    if (d < 100 && activeVisuals[1]) {
        interactionMode = 'VISUAL1';
        v1_vel = {x:0, y:0};
    } 
    // ZONE 2: Middle (Skeleton)
    else if (d >= 100 && d < 280 && activeVisuals[3]) {
        interactionMode = 'VISUAL3';
        v3_velY = 0;
    } 
    // ZONE 3: Outer (Stars)
    else if (d >= 280 && d < 450 && activeVisuals[2]) {
        interactionMode = 'VISUAL2';
        v2_vel = {x:0, y:0};
    } 
    else {
        interactionMode = 'CAMERA';
    }

    lastMouseX = mouseX;
    lastMouseY = mouseY;
}

function mouseDragged() {
    let dx = (mouseX - lastMouseX) * 0.01;
    let dy = (mouseY - lastMouseY) * 0.01;

    if (interactionMode === 'VISUAL1') {
        v1_rot.y += dx; v1_rot.x += dy;
        v1_vel = {x: dy, y: dx};
    } else if (interactionMode === 'VISUAL2') {
        v2_rot.y += dx; v2_rot.x += dy;
        v2_vel = {x: dy, y: dx};
    } else if (interactionMode === 'VISUAL3') {
        v3_rotY += dx;
        v3_velY = dx;
    } 
    
    lastMouseX = mouseX;
    lastMouseY = mouseY;
}

function mouseReleased() {
    interactionMode = 'CAMERA'; 
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }