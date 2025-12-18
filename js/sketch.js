// --- CONFIGURATION ---
const WORD_LINES = [
    { text: "AUDIO WAVE", color: [255, 0, 0], type: "simple" },   
    { text: "BASS KICK", color: [0, 255, 0], type: "simple" },    
    { text: "HIGH FREQ", color: [0, 0, 255], type: "simple" },    
    { text: "LOVE SOSA", color: null,        type: "complex" }, // SPECIAL TRIGGER
    { text: "DARK MODE", color: [255, 0, 255], type: "simple" }   
];

// --- SETTINGS ---
const FONT_SIZE = 20;
const LINE_SPACING = 20; 

// --- GLOBAL VARIABLES ---
let W, H;
let inputElement;
let myFont;      
let bgMusic;        
let activeVisualType = null; // 'simple' or 'complex'
let activeSimpleColor = null;

// --- 3D COMPLEX VISUAL VARS (SOSA) ---
let maskModel, gogglesModel, starObj, starImg, videoTexture;
let fft;
let pulsingScale = 1; 
let modelScale = 10000; 
let modelYOffset = 0;    
let areaMultiplier = 1; 
let starSizeManual = 0.32; 
let videoTransparency = 50;

// State tracking
let lineStates = [];

function preload() {
    // 1. Load Base Assets
    myFont = loadFont('fonts/typewriter.otf'); 
    bgMusic = loadSound('sound/LOVESOSA.mp3');   

    // 2. Load Complex 3D Assets (SOSA)
    maskModel = loadModel('3d/screenmask.obj'); 
    gogglesModel = loadModel('3d/goggles.obj'); 
    starObj = loadModel('3d/star.obj', true); 
    starImg = loadImage('img/star.png'); 
    
    // Load Video (Note: Video loading is partly handled in setup for p5 compatibility)
    // We create the element here but configure it in setup
}

function setup() {
    W = windowWidth;
    H = windowHeight;
    createCanvas(W, H, WEBGL);
    angleMode(DEGREES); // Switch to Degrees for the complex model

    // --- FONT SETUP ---
    textFont(myFont);
    textSize(FONT_SIZE);
    textAlign(CENTER, CENTER);

    // --- MUSIC SETUP ---
    if (bgMusic.isLoaded()) {
        bgMusic.loop();
    }

    // --- VIDEO TEXTURE SETUP ---
    videoTexture = createVideo(['img/sosavideo.mp4']);
    videoTexture.hide(); // Hide HTML element, use as texture
    videoTexture.loop(); // Loop immediately (or pause if you prefer)
    videoTexture.volume(0); // Mute video so it doesn't clash with bgMusic

    // --- FFT SETUP (Linked to Music, not video) ---
    fft = new p5.FFT(0.8); 
    fft.setInput(bgMusic);

    // --- MASK UV MAPPING SETUP (From your provided code) ---
    if (maskModel) {
        maskModel.uvs = []; 
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (let v of maskModel.vertices) {
            if (v.x < minX) minX = v.x;
            if (v.x > maxX) maxX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.y > maxY) maxY = v.y;
        }

        // Apply UV mapping based on bounding box
        for (let v of maskModel.vertices) {
            // Hardcoded FlipX=true, FlipY=true logic from your snippet
            let u = map(v.x, minX, maxX, 1, 0); 
            let vCoord = map(v.y, minY, maxY, 1, 0);
            maskModel.uvs.push(u);
            maskModel.uvs.push(vCoord);
        }
    }

    // --- LOGIC INITIALIZATION ---
    lineStates = WORD_LINES.map(item => ({
        text: item.text,
        color: item.color,
        type: item.type,
        typedPart: "" 
    }));

    // --- INPUT SETUP ---
    inputElement = select('#wordInput');
    if (inputElement) {
        inputElement.elt.focus();
        inputElement.input(handleTyping);
    }
}

function handleTyping() {
    let currentInput = inputElement.value().toUpperCase();

    for (let state of lineStates) {
        if (state.text.startsWith(currentInput)) {
            state.typedPart = currentInput;

            if (state.typedPart === state.text) {
                // WORD COMPLETED!
                
                // 1. Set Visual Type
                activeVisualType = state.type; // 'simple' or 'complex'
                
                if (state.type === 'simple') {
                    activeSimpleColor = state.color;
                } 
                // If complex, the draw loop handles the rest automatically

                // 2. Reset Input
                inputElement.value(''); 
                state.typedPart = "";   
                break;
            }
        } else {
            state.typedPart = ""; 
        }
    }
}

function draw() {
    background(255); 
    orbitControl(); // Allow user to rotate the view
    
    // --- LIGHTING ---
    ambientLight(150);
    directionalLight(255, 255, 255, 1, 1, -1);

    // --- LEFT SIDE: TEXT ---
    drawLeftText();

    // --- RIGHT SIDE: VISUALS ---
    drawRightVisuals();

    // --- DIVIDER ---
    stroke(0); strokeWeight(2);
    line(0, -H/2, 0, H/2);
}

function drawLeftText() {
    push();
    translate(-W / 4, 0, 0); 
    // We must reset rotation because orbitControl affects everything
    // But since we want text to stay flat, we usually don't want it rotating with the camera.
    // However, in WEBGL orbitControl usually rotates the whole world.
    // For now, let's just place it.

    let totalHeight = (lineStates.length - 1) * LINE_SPACING;
    let startY = -totalHeight / 2;

    for (let i = 0; i < lineStates.length; i++) {
        let state = lineStates[i];
        let yPos = startY + (i * LINE_SPACING);

        // Gray Base
        fill(200); noStroke();
        text(state.text, 0, yPos);

        // Black Overlay
        if (state.typedPart.length > 0) {
            fill(0); 
            let fullWidth = textWidth(state.text);
            let startX = -fullWidth / 2;
            textAlign(LEFT, CENTER);
            text(state.typedPart, startX, yPos);
            textAlign(CENTER, CENTER);
        }
    }
    pop();
}

function drawRightVisuals() {
    push();
    translate(W / 4, 0, 0); // Move to Right Center

    if (activeVisualType === 'simple' && activeSimpleColor) {
        // --- DRAW SIMPLE SPHERE ---
        fill(activeSimpleColor);
        noStroke();
        rotateX(frameCount * 0.5); // Simple rotation
        rotateY(frameCount * 0.5);
        sphere(50);

    } else if (activeVisualType === 'complex') {
        // --- DRAW SOSA COMPLEX MODEL ---
        drawSosaModel();
    }
    pop();
}

function drawSosaModel() {
    // --- AUDIO ANALYSIS ---
    fft.analyze();
    let trebleEnergy = fft.getEnergy("treble");
    let targetScale = map(trebleEnergy, 0, 255, 1.0, 1.8); 
    pulsingScale = lerp(pulsingScale, targetScale, 0.1);

    // Scale down the whole model group to fit in the right pane
    // The original code used scale(1000), which might be huge. 
    // We adjust it relative to the window width.
    let displayScale = (W / 4) * 0.05; // Dynamic sizing
    scale(displayScale); 

    // --- MASTER TRANSFORM (From your code) ---
    push();
    rotateX(90); 
    rotateZ(180);
    
    // 1. Render Mask
    if (maskModel) {
        push();
        translate(0, 0.042, 0); 
        rotateX(90);
        
        let actualAlpha = 255 - videoTransparency;
        noStroke();
        tint(255, actualAlpha);
        texture(videoTexture); 
        model(maskModel);
        pop();
    }
    
    // 2. Render Goggles (Stars)
    if (gogglesModel && starObj) {
        push();
        texture(starImg); 
        noStroke();
        
        // Loop through goggle faces to place stars
        for (let i = 0; i < gogglesModel.faces.length; i++) {
            let f = gogglesModel.faces[i];
            let v1 = gogglesModel.vertices[f[0]];
            let v2 = gogglesModel.vertices[f[1]];
            let v3 = gogglesModel.vertices[f[2]];

            let cx = (v1.x + v2.x + v3.x) / 3;
            let cy = (v1.y + v2.y + v3.y) / 3;
            let cz = (v1.z + v2.z + v3.z) / 3;

            // Calculate Area for sizing
            let ax = v2.x - v1.x; let ay = v2.y - v1.y; let az = v2.z - v1.z;
            let bx = v3.x - v1.x; let by = v3.y - v1.y; let bz = v3.z - v1.z;
            let cpx = ay * bz - az * by;
            let cpy = az * bx - ax * bz;
            let cpz = ax * by - ay * bx;
            let area = sqrt(cpx*cpx + cpy*cpy + cpz*cpz) * 0.5;
            
            push(); 
            translate(cx, cy, cz);
            
            let s = area * areaMultiplier * starSizeManual * pulsingScale;
            
            // Safety check for NaN or infinite scales
            if (s > 0 && isFinite(s)) {
                scale(s); 
                rotateX(90); 
                rotateY(90); 
                model(starObj); 
            }
            pop();
        }
        pop(); 
    }
    pop(); // End Master Transform
}

function mouseReleased() {
    // Ensure video plays on interaction
    if (videoTexture && videoTexture.elt.paused) {
        videoTexture.loop();
    }
}

function windowResized() {
    W = windowWidth;
    H = windowHeight;
    resizeCanvas(W, H);
}