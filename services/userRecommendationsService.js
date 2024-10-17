
const moment = require('moment');

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


  return (meetingStart < sessionEnd && meetingEnd > sessionStart);
}


function filterFilmSessions(filmsData, meetings) {
  const filteredFilmsData = {};

  for (const [date, films] of Object.entries(filmsData)) {
      filteredFilmsData[date] = {};

      for (const [filmName, sessions] of Object.entries(films)) {

          const filteredSessions = sessions.filter(session => {

              return !meetings.some(meeting => isOverlapping(meeting, session));
          });

          if (filteredSessions.length > 0) {
              filteredFilmsData[date][filmName] = filteredSessions;
          }
      }
  }

  return filteredFilmsData;
}

module.exports = {
  reduceGoogleEvents,
  filterFilmSessions
};