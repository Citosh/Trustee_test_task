// Load environment variables from a .env file
require('dotenv').config();
const {scrapeMultiplex} = require('./parser.js')
// Import required modules
const express = require('express');
const { google } = require('googleapis');
const moment = require('moment');

// Initialize Express app
const app = express();

// Set up Google OAuth2 client with credentials from environment variables
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT
);


// Route to initiate Google OAuth2 flow
app.get('/', (req, res) => {
  // Generate the Google authentication URL
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request offline access to receive a refresh token
    scope: 'https://www.googleapis.com/auth/calendar.readonly' // Scope for read-only access to the calendar
  });
  // Redirect the user to Google's OAuth 2.0 server
  res.redirect(url);
});

// Route to handle the OAuth2 callback
app.get('/redirect', (req, res) => {
  // Extract the code from the query parameter
  const code = req.query.code;
  
  // Exchange the code for tokens
  oauth2Client.getToken(code, (err, tokens) => {
    if (err) {
      // Handle error if token exchange fails
      console.error('Couldn\'t get token', err);
      res.send('Error');
      return;
    }
    // Set the credentials for the Google API client
    oauth2Client.setCredentials(tokens);
    // Notify the user of a successful login
    res.send('Successfully logged in');
  });
});

// Route to list all calendars
app.get('/calendars', (req, res) => {
  // Create a Google Calendar API client
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  // List all calendars
  calendar.calendarList.list({}, (err, response) => {
    if (err) {
      // Handle error if the API request fails
      console.error('Error fetching calendars', err);
      res.end('Error!');
      return;
    }
    // Send the list of calendars as JSON
    const calendars = response.data.items;
    res.json(calendars);
  });
});


function reduceGoogleEvents(events) {
  return events.reduce((acc, event) => {
      const startDateTime = moment(event.start.dateTime).format('DD.MM.YYYY HH:mm');
      const endDateTime = moment(event.end.dateTime).format('DD.MM.YYYY HH:mm');
      acc.push([startDateTime, endDateTime]);
      return acc;
  }, []);
}


function isOverlapping(meeting, session) {
  const [meetingStart, meetingEnd] = meeting;
  const [sessionStart, sessionEnd] = session;

  // Перетин відбувається, якщо один з часів початку або закінчення одного проміжку потрапляє в інший
  return (meetingStart < sessionEnd && meetingEnd > sessionStart);
}

// Основна функція для очищення кіносеансів
function filterFilmSessions(filmsData, meetings) {
  const filteredFilmsData = {};

  for (const [date, films] of Object.entries(filmsData)) {
      filteredFilmsData[date] = {};

      for (const [filmName, sessions] of Object.entries(films)) {
          // Фільтруємо сеанси для кожного фільму
          const filteredSessions = sessions.filter(session => {
              // Перевіряємо, чи не перетинається сеанс з мітингами
              return !meetings.some(meeting => isOverlapping(meeting, session));
          });

          // Додаємо фільм до нового об'єкту тільки якщо у нього залишилися сеанси
          if (filteredSessions.length > 0) {
              filteredFilmsData[date][filmName] = filteredSessions;
          }
      }
  }

  return filteredFilmsData;
}




// Route to list events from a specified calendar
app.get('/events', async (req, res) => {

  const filmsData = await scrapeMultiplex();
  const calendarId = req.query.calendar ?? 'primary';

  const [day, month, year] = Object.keys(filmsData).pop().split('.');
  const timeMax = new Date(`${year}-${month}-${day}T24:00:00+03:00`);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  calendar.events.list({
    calendarId,
    timeMin: (new Date()).toISOString(),
    timeMax: timeMax,
    maxResults: 15,
    singleEvents: true, 
    orderBy: 'startTime'
  }, (err, response) => {
    if (err) {
      console.error('Can\'t fetch events');
      res.send('Error');
      return;
    }

    const meetings = response.data.items;
    //filterSessions(events, filmsData)
    const userMeetings = reduceGoogleEvents(meetings);
    const filteredSessions = filterFilmSessions(filmsData, userMeetings) 
    res.json(filteredSessions);

  });
});


app.listen(3000, () => console.log('Server running at 3000'));




// filmsData = 
// {
//   "17.10.2024": {
//     "Гладіатор": [
//       ["13:30", "15:00"],
//       ["13:30", "15:00"],
//     ],
//     "Гладіатор 2": [
//       ["13:30", "15:00"],
//       ["13:30", "15:00"],
//     ]
//   },
//   "18.10.2024": {
//     "Гладіатор": [
//       ["13:30", "15:00"],
//       ["13:30", "15:00"],
//     ],
//     "Гладіатор 2": [
//       ["13:30", "15:00"],
//       ["13:30", "15:00"],
//     ]
//   },
// }





// [
//   {
//     "kind": "calendar#event",
//     "etag": "\"3458309416740000\"",
//     "id": "7o9g5hrc4l193pt60ge7e63emo",
//     "status": "confirmed",
//     "htmlLink": "https://www.google.com/calendar/event?eid=N285ZzVocmM0bDE5M3B0NjBnZTdlNjNlbW8gY2hhcGxpbnNreWFydGVtQG0",
//     "created": "2024-10-17T08:45:08.000Z",
//     "updated": "2024-10-17T08:45:08.370Z",
//     "summary": "test event 1",
//     "creator": {
//       "email": "chaplinskyartem@gmail.com",
//       "self": true
//     },
//     "organizer": {
//       "email": "chaplinskyartem@gmail.com",
//       "self": true
//     },
//     "start": {
//       "dateTime": "2024-10-18T09:00:00+03:00",
//       "timeZone": "Europe/Kiev"
//     },
//     "end": {
//       "dateTime": "2024-10-18T21:00:00+03:00",
//       "timeZone": "Europe/Kiev"
//     },
//     "iCalUID": "7o9g5hrc4l193pt60ge7e63emo@google.com",
//     "sequence": 0,
//     "reminders": {
//       "useDefault": true
//     },
//     "eventType": "default"
//   },
//   {
//     "kind": "calendar#event",
//     "etag": "\"3458312230604000\"",
//     "id": "4b5cs2r54it3e8107clvk0g9ka",
//     "status": "confirmed",
//     "htmlLink": "https://www.google.com/calendar/event?eid=NGI1Y3MycjU0aXQzZTgxMDdjbHZrMGc5a2EgY2hhcGxpbnNreWFydGVtQG0",
//     "created": "2024-10-17T09:08:35.000Z",
//     "updated": "2024-10-17T09:08:35.302Z",
//     "summary": "test events i can see",
//     "creator": {
//       "email": "chaplinskyartem@gmail.com",
//       "self": true
//     },
//     "organizer": {
//       "email": "chaplinskyartem@gmail.com",
//       "self": true
//     },
//     "start": {
//       "dateTime": "2024-11-13T10:00:00+02:00",
//       "timeZone": "Europe/Kiev"
//     },
//     "end": {
//       "dateTime": "2024-11-13T11:00:00+02:00",
//       "timeZone": "Europe/Kiev"
//     },
//     "iCalUID": "4b5cs2r54it3e8107clvk0g9ka@google.com",
//     "sequence": 0,
//     "reminders": {
//       "useDefault": true
//     },
//     "eventType": "default"
//   }
// ]