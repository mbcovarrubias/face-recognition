# face-recognition
Currently WIP, some features may not work yet.

Purpose of creation of this repository is for the following reasons:
* Compliance for research subjects
* Installing and testing the application from different devices
  
## Libraries used
* face-api.js by vladmandic https://github.com/vladmandic/face-api
* p5.js
* ml5.js
## Prerequisites
* Node.js
* XAMPP
* Git (optional)
## Installation
The codes below are meant to be typed in any command line programs (cmd, powershell, etc.)
### With Git
1. Clone this repository:
```bash
git clone https://github.com/mbcovarrubias/face-recognition.git
```
2. Change directory:
```bash
cd face-recognition
```
### Without Git
1. Install repository as a .zip file
2. In the .zip file, navigate to directory where package.json is located
3. Open any command line program (cmd, powershell, etc.) and change directory
```bash
...
cd face-recognition
```
## Setup
* Start the MySQL module in the XAMPP control panel
* Create .env file in the cloned repository. See "For .env file" below for what to put there.
* Install dependencies:
```bash
npm install
```
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
```
