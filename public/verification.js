let mainCanvas = document.getElementById("canvas");

let aspectRatio = 4/3;
let maxCaptures = 5;
let videoWidth = mainCanvas.getBoundingClientRect().width-8;

let canvas;
let video;
let detectionInterval;
let faceMatcher;

let detections = [];

const detectionOptions = new faceapi.TinyFaceDetectorOptions()

async function loadLabeledImages() {
	const response = await fetch("/",{
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			action: "get registered users",
			message: {}
		})
	});
	
	const labels = await response.json();
	return Promise.all(
		labels.map(async (label) => {
			const descriptors = [];
			for (let i = 0; i < 5; i++) {
				const img = await faceapi.fetchImage(`/images/${label}_${i}.jpg`);
				const singleFaceDescription = await faceapi.detectSingleFace(img, detectionOptions).withFaceLandmarks().withFaceDescriptor();
				if (singleFaceDescription) {
					descriptors.push(singleFaceDescription.descriptor);
				}
			}
			return new faceapi.LabeledFaceDescriptors(label,descriptors);
		})
	)
}

async function setup() {    
	videoWidth = mainCanvas.getBoundingClientRect().width-8;
	
	canvas = createCanvas(videoWidth,videoWidth);
	
	video = createCapture(VIDEO);
	video.size(width,height);
	video.hide();
	
	const p = "./models";
		
	Promise.all([
		faceapi.nets.tinyFaceDetector.loadFromUri(p),
		faceapi.nets.faceLandmark68Net.loadFromUri(p),
		faceapi.nets.faceRecognitionNet.loadFromUri(p),
		faceapi.nets.faceExpressionNet.loadFromUri(p)
	]);
		
	document.getElementById("status").innerHTML = "Loaded models"
	
	const labeledImages = await loadLabeledImages();
	faceMatcher = new faceapi.FaceMatcher(labeledImages,.6);
	
	document.getElementById("status").innerHTML = "Loaded face matcher"
}

function draw() {
	clear();
	
	videoWidth = Math.max(0,Math.min(mainCanvas.getBoundingClientRect().width-8,300));
	resizeCanvas(videoWidth,videoWidth/aspectRatio);
	video.size(width,height);
	
	image(video,0,0);
	
	if (detections) {
		detections.forEach((detection)=>{
			const box = detection.detection.detection.box;
			const match = detection.bestMatch;
			
			stroke(0,0,255);
			strokeWeight(2);
			noFill();
			rect(box.x,box.y,box.width,box.height);
			
			fill(255,255,255);
			stroke(0);
			strokeWeight(2);
			textSize(16);
			text(match.toString(),box.x,box.y-10);
		});
	}
}

setInterval(async ()=>{
	if (video.loadedmetadata && faceMatcher) {
		let DWLM = await faceapi.detectAllFaces(video.elt,detectionOptions).withFaceLandmarks().withFaceDescriptors();
		DWLM = faceapi.resizeResults(DWLM,{ width: width, height: height });
		
		detections = DWLM.map((detection)=>{
			const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
			return {
				detection,
				bestMatch
			};
		});
	}
},200);