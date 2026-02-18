let mainCanvas = document.getElementById("canvas");

let targetVideoWidth = 480;
let videoWidth = mainCanvas.getBoundingClientRect().width-8;

let aspectRatio;
let canvas;
let video;

function videoReady() {
	let stream = video.elt.srcObject;
	let track = stream.getVideoTracks()[0].getSettings();
	let vWidth = track.width;
	let vHeight = track.height;
	
	aspectRatio = vWidth/vHeight;
}

// main p5 functions

function preload() {
	let modelsPath = "./models/face-api";
	
	Promise.all([
		faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
		faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
		faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
		faceapi.nets.faceExpressionNet.loadFromUri(modelsPath)
	]).then(()=>console.log("Loaded models"));
}

function setup() {
	videoWidth = mainCanvas.getBoundingClientRect().width-8;
	
	canvas = createCanvas(videoWidth,videoWidth/aspectRatio);
	
	video = createCapture(VIDEO,videoReady);
	video.size(width,height);
	video.hide();
}

function draw() {
	if (video && aspectRatio) {
		clear();
	
		videoWidth = Math.max(0,Math.min(mainCanvas.getBoundingClientRect().width-8,targetVideoWidth));
		resizeCanvas(videoWidth,videoWidth/aspectRatio);
		video.size(width,height);
		
		image(video,0,0);
	}
}