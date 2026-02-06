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
These are the keys used in the .env file:
* PORT - default is 3000
* DB_HOST - using "localhost"
* DB_NAME - using "face-recognition"
* DB_USER - using "root"
* DB_PASSWORD - using ""
* CONNECTION_LIMIT - default is 40
* AUTH_USER - your email
* AUTH_PASS - your app password
* GH_PAT - your github PAT
* GH_BASE_URL - using "https://api.github.com/repos/mbcovarrubias/face-recognition/contents/"

Placeholder .env file code (replace "placeholder" with your desired settings):
```
# server
PORT = "placeholder"

# sql connection
DB_HOST = "placeholder"
DB_NAME = "placeholder"
DB_USER = "placeholder"
DB_PASSWORD = "placeholder"
CONNECTION_LIMIT = "placeholder"

# nodemailer transporter
AUTH_USER = "placeholder"
AUTH_PASS = "placeholder"

# github api for updating facial recognition system application
GH_PAT = "placeholder"
GH_BASE_URL = "placeholder"

```
