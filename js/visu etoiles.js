let song;
let fft;
let starImg;

// --- PARAMETERS ---
let numStars = 24;          // How many stars in the circle
let circleRadius = 300;     // Radius of the ring
let rotSpeed = 0.003;       // Speed of auto-rotation
let minSize = 30;           // Resting size of the star
let maxSize = 110;          // Maximum size at full volume
let sensitivity = 1.0;      // Multiplier for audio reactivity

function preload() {
    // 1. Load Audio
    song = loadSound('sound/LOVESOSA.mp3');
    
    // 2. Load Image
    // Ensure 'star2.png' is in your img folder
    starImg = loadImage('img/star2.svg');
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    angleMode(RADIANS);
    
    // --- AUDIO SETUP ---
    fft = new p5.FFT(0.8, 1024); // Smoothing 0.8, 1024 bins
    fft.setInput(song);
}

function draw() {
    background(255); // Dark background to make stars pop

    // --- CONTROLS ---
    orbitControl();
    rotateY(frameCount * rotSpeed); // Slow auto-rotation

    // --- AUDIO ANALYSIS ---
    let spectrum = fft.analyze(); 
    // spectrum is an array of 1024 values (0 to 255)
    
    // --- DRAW CIRCLE OF STARS ---
    // We calculate the step size to sample the spectrum evenly
    // We ignore the very high treble (top 20%) as it's often empty
    let usableSpectrumSize = spectrum.length * 0.8; 
    let binStep = floor(usableSpectrumSize / numStars);

    for (let i = 0; i < numStars; i++) {
        // 1. Calculate Position on Circle
        let theta = map(i, 0, numStars, 0, TWO_PI);
        let x = circleRadius * cos(theta);
        let z = circleRadius * sin(theta);
        let y = 0;

        // 2. Get Audio Value for this Star
        // We grab a value from the spectrum array based on the star's index
        let spectrumIndex = i * binStep;
        let intensity = spectrum[spectrumIndex]; 
        
        // 3. Map Intensity to Size (Height)
        // Map 0-255 (audio volume) to minSize-maxSize
        let size = map(intensity * sensitivity, 0, 255, minSize, maxSize);

        push();
        translate(x, y, z);

        // 4. Orientation
        // Rotate so the star faces outward from the center
        // - theta rotates it around Y to face the angle of the circle
        // - PI/2 adjustment might be needed depending on the image plane
        rotateY(-theta - PI/2); 

        // 5. Render Star
        // Using a textured plane ensures it handles 3D space correctly
        noStroke();
        texture(starImg);
        // plane(width, height) - we vary height based on audio
        plane(size, size); 
        pop();
    }
}

// --- INTERACTION ---
function mouseReleased() {
    if (song.isPlaying()) {
        song.pause();
    } else {
        song.loop();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}