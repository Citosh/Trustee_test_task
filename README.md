
# Trustee Test Task
This project is a web application that integrates with the Google Calendar API to display film sessions based on the user's calendar events. The application fetches movie session data from a multiplex and filters these sessions based on the user's Google Calendar events.


The application includes a controller that handles OAuth2 authentication with Google, fetches calendar events, and retrieves film session data.
### 1. Clone the repository:
```bash
git clone https://github.com/Citosh/Trustee_test_task.git
```
### 2. Install dependencies:
```bash
npm i
```
### 3. Set up Google Calendar API keys:
Before launching, you need to obtain Google Calendar API keys and set them up in the .env file. Refer to the .env.dist file for the required environment variables.
### 4. Launch the app:
```bash
npm run dev 
```
### 5. Complete OAuth
Go to the following link to complete the OAuth process:
http://localhost:3000/
### 6. Load events:
Once OAuth is complete, go to the following link to load event data from the parser (this usually take 7-5 seconds)
http://localhost:3000/events

## Controller Overview

### Key Features

- **OAuth2 Authentication**: Redirects users to the Google OAuth2 consent screen and handles token exchange.
- **Event Listing**: Fetches events from the user's Google Calendar and filters movie sessions based on overlapping times.
- **Data Rendering**: Displays the filtered movie sessions in a structured HTML table format.

## Endpoints

### 1. GET `/`

- **Description**: Initiates the Google OAuth2 flow by redirecting users to the Google consent screen to allow access to their calendar data.

### 2. GET `/redirect`

- **Description**: Handles the callback from Google after the user has authorized access. It exchanges the authorization code for tokens and sets the credentials for the Google API client. Responds with a success message upon successful login.

### 3. GET `/events`

- **Description**: Fetches film session data from a multiplex and the user's calendar events. It filters the film sessions based on the user's Google Calendar events and renders them in an HTML table format.
- **Query Parameters**:



