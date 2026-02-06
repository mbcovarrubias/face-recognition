# face-recognition
Currently WIP, some features may not work yet.

Purpose of creation of this repository is for the following reasons:
* Compliance for research subjects
* Installing and testing the application from different devices
  
## Libraries used
* face-api.js by justadudewhohacks https://github.com/justadudewhohacks/face-api.js
* p5.js
## Prerequisites
* Node.js
* XAMPP
* Git
## Installation
The codes below are meant to be typed in command line programs (cmd, powershell, etc.)
1. Clone this repository:
```bash
git clone https://github.com/mbcovarrubias/face-recognition.git
```
2. Change directory:
```bash
cd face-recognition
```
## Setup
* Start the MySQL module in the XAMPP control panel
* Create .env file in the cloned repository. See "For .env file" below for what to put there.
* Run hard reset command. This will create a new database and delete the old one.
```bash
npm run hr
```
* Start the server with the command below. A link will be provided that redirects to the application.
```bash
npm start
```

## For .env file
.env file code template (replace "placeholder" with your desired settings):
```
# server
PORT = 3000

# sql connection
DB_HOST = "localhost"
DB_NAME = "face-recognition"
DB_USER = "root"
DB_PASSWORD = ""
CONNECTION_LIMIT = 40

# nodemailer transporter
AUTH_USER = "placeholder" #email
AUTH_PASS = "placeholder" #app password

# github api for updating facial recognition system application
GH_PAT = "placeholder" #github PAT
GH_BASE_URL = "https://api.github.com/repos/mbcovarrubias/face-recognition/contents/"
```
