const moment = require('moment');
require('moment/locale/uk'); // Ensure Ukrainian locale is loaded
const axios = require('axios');
const cheerio = require('cheerio'); 

async function extractDates($, year) {
    const result = {};

    // Extract dates
    $('body > div.mob_fix_container.mob_fix_container-cinema > div.cinema_schedule_header > div > div > a').each((index, element) => {
        const dateText = $(element).find('p.dateval > span.is-desktop').text().trim(); // Extract date from span
        if (dateText) { // If dateText is not empty
            const fullDateText = `${dateText} ${year}`; // Append the year
            const date = moment(fullDateText, 'D MMMM YYYY', 'uk').format('DD.MM.YYYY');
            result[date] = {}; // Initialize result object for this date
        }
    });

    return result;
}

async function extractTitleSessions($) {
    const sessionsMap = [];
    // Select all movie title elements in the cinema schedule
    await Promise.all($('body > div.mob_fix_container.mob_fix_container-cinema > div.cinema_schedule_films > div > div:nth-child(2) > div > div > a').map(async (index, element) => {
        const titleElement = $(element); // Wrap the element with Cheerio
        const title = titleElement.attr('title').trim(); // Extract movie title
        const sessions = [];

        // Get the closest filmElement to this titleElement
        const filmElement = titleElement.closest('div'); // Get the closest div containing the title
        filmElement.find('div.sessions.showmore > a.ns.locked > p.time > span').each((i, timeElement) => {
            const startTime = $(timeElement).text().trim(); // e.g., "10:10"
            sessions.push([startTime, null]); // Placeholder for end time
        });

        // Store title and sessions for later processing
        sessionsMap.push({ title, sessions, titleElement }); // titleElement is already a Cheerio object
    }).get()); // Await all async map items

    return sessionsMap;
}

async function extractMovieDuration(titleElement) {
    const movieLink = titleElement.attr('href');
    const movieResponse = await axios.get(`https://multiplex.ua${movieLink}`);
    const moviePage = cheerio.load(movieResponse.data);
    const durationText = moviePage('body > div.mob_fix_container > div > div > div > div.column2 > ul > li:nth-child(10) > p.val').text().trim();
    return moment.duration(durationText);
}

function calculateEndTimes(sessions, duration, date) {
    return sessions.map(session => {
        const startMoment = moment(`${date} ${session[0]}`, 'DD.MM.YYYY HH:mm');
        const endMoment = startMoment.clone().add(duration);
        return [startMoment.format('DD.MM.YYYY HH:mm'), endMoment.format('DD.MM.YYYY HH:mm')];
    });
}

async function scrapeMultiplex() {
    const baseUrl = 'https://multiplex.ua/cinema/kyiv/lavina'; // Base URL
    const year = 2024; // Define the year explicitly

    // Set moment to use Ukrainian locale
    moment.locale('uk');

    // First, extract the initial page to get the dates
    const initialResponse = await axios.get(baseUrl);
    const $ = cheerio.load(initialResponse.data);
    let result = await extractDates($, year); // Get dates

    // Loop through each date to modify the URL and scrape the sessions
    for (const date in result) {
        const formattedDate = date.split('.').join(''); 
        const urlWithDate = `${baseUrl}#${formattedDate}`; // Construct the new URL

        const dateResponse = await axios.get(urlWithDate);
        const $datePage = cheerio.load(dateResponse.data);
        // Extract movie titles and sessions for the specific date
        const sessionsMap = await extractTitleSessions($datePage);

        // Extract movie durations and calculate end times
        await Promise.all(sessionsMap.map(async ({ title, sessions, titleElement }) => {
            const duration = await extractMovieDuration(titleElement);

            // Calculate end times for the date
            const updatedSessions = calculateEndTimes(sessions, duration, date);
            result[date][title] = updatedSessions;
        }));
    }

    return result;
}

module.exports = {
    scrapeMultiplex,
}
