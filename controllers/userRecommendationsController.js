const express = require('express');
const { google } = require('googleapis');
const { scrapeMultiplex } = require('../services/parserService');
const { reduceGoogleEvents, filterFilmSessions } = require('../services/userRecommendationsService');
const moment = require('moment');


const router = express.Router();


const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT
);

router.get('/', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
  });
  res.redirect(url);
});


router.get('/redirect', (req, res) => {
  const code = req.query.code;

  oauth2Client.getToken(code, (err, tokens) => {
    if (err) {
      console.error('Couldn\'t get token', err);
      res.send('Error');
      return;
    }
    oauth2Client.setCredentials(tokens);
    res.send('Successfully logged in');
  });
});


router.get('/events', async (req, res) => {
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
    const userMeetings = reduceGoogleEvents(meetings);
    const filteredSessions = filterFilmSessions(filmsData, userMeetings);
    
    res.render('events', { filteredSessions });
  });
});

module.exports = router;
