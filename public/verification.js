let mainCanvas = document.getElementById("canvas");
let logs = document.getElementById("logs");

let aspectRatio = 4/3;
let maxCaptures = 5;
let videoWidth = mainCanvas.getBoundingClientRect().width-8;

let canvas;
let video;
let detectionInterval;
let faceMatcher;

let detections = [];

const detectionOptions = new faceapi.TinyFaceDetectorOptions()

function addToLogs(text,error) {
	let textElt = document.createElement("span");
	textElt.innerHTML = text;
	textElt.className = "line";
	
	if (error) textElt.style.color = "red";
	
	logs.appendChild(textElt);
}

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

async function addToCurrentRecord(name) {
	let pad = (n) => n.toString().padStart(2,"0");
	
	let now = new Date();
	let year = now.getFullYear();
	let month = pad(now.getMonth()+1);
	let day = pad(now.getDate());
	
	let hours = pad(now.getHours());
	let minutes = pad(now.getMinutes());
	let seconds = pad(now.getSeconds());
	
	let formattedDate = `${year}-${month}-${day}`;
	let formattedTime = `${hours}:${minutes}:${seconds}`;
	
	if (name != "unknown") {
		await fetch("/",{
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				action: "add to current record",
				message: {
					"name": name,
					"date": formattedDate,
					"time": formattedTime
				}
			})
		});
	}
}

async function setup() {    
	videoWidth = mainCanvas.getBoundingClientRect().width-8;
	
	canvas = createCanvas(videoWidth,videoWidth);
	
	video = createCapture(VIDEO);
	video.size(width,height);
	video.hide();
		
	try {
		const path = "./models";
		
		Promise.all([
			faceapi.nets.tinyFaceDetector.loadFromUri(path),
			faceapi.nets.faceLandmark68Net.loadFromUri(path),
			faceapi.nets.faceRecognitionNet.loadFromUri(path),
			faceapi.nets.faceExpressionNet.loadFromUri(path)
		]);

		addToLogs("Loaded models",false);
		
		const labeledImages = await loadLabeledImages();
		
		if (labeledImages.length > 0) {
			faceMatcher = new faceapi.FaceMatcher(labeledImages,.6);
			addToLogs("Loaded FaceMatcher",false);
		} else {
			throw new Error("No labeled images found");
		}
	} catch (err) {
		addToLogs(err,true);
	}
}

async function draw() {
	clear();
	
	videoWidth = Math.max(0,Math.min(mainCanvas.getBoundingClientRect().width-8,300));
	resizeCanvas(videoWidth,videoWidth/aspectRatio);
	video.size(width,height);
	
	image(video,0,0);
	
	if (detections) {
		detections.forEach((detection)=>{
			const box = detection.detection.detection.box;
			const match = detection.bestMatch.toString();
			
			stroke(0,0,255);
			strokeWeight(2);
			noFill();
			rect(box.x,box.y,box.width,box.height);
			
			fill(255,255,255);
			stroke(0);
			strokeWeight(2);
			textSize(16);
			text(match,box.x,box.y-10);
			
			addToCurrentRecord(detection.bestMatch.label);
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
