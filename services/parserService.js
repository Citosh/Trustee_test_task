const axios = require('axios');
const puppeteer = require('puppeteer');
const moment = require('moment');
const cheerio = require('cheerio');

const MAX_FILM_SESSIONS_QUANTITY = 50; // To avoid recursion and a potentially endless cycle.
const movieDurationsCache = {}; // Object to store unique movie durations

async function fetchDatesData(page) {
    return await page.$$eval(
        'body > div.mob_fix_container.mob_fix_container-cinema > div.cinema_schedule_films > div > div',
        divs => divs.map(div => div.getAttribute('data-date'))
    );
}

async function fetchMovies(page, dateIndex) {
    return await page.$$eval(
        `body > div.mob_fix_container.mob_fix_container-cinema > div.cinema_schedule_films > div > div:nth-child(${dateIndex + 2}) > div > a`,
        links => links.map(link => ({
            title: link.getAttribute('title').trim(),
            href: link.getAttribute('href')
        }))
    );
}

async function fetchSessions(page, dateIndex, movieIndex) {
    const sessions = [];

    for (let sessionIndex = 1; sessionIndex <= MAX_FILM_SESSIONS_QUANTITY; sessionIndex++) {
        const sessionSelector = `body > div.mob_fix_container.mob_fix_container-cinema > div.cinema_schedule_films > div > div:nth-child(${dateIndex + 2}) > div:nth-child(${movieIndex + 1}) > div > div.sessions > a:nth-child(${sessionIndex}) > p.time > span`;

        try {
            const session = await page.$eval(sessionSelector, span => span.textContent.trim());
            if (session) {
                sessions.push(session);
            }
        } catch (e) {
            break;
        }
    }

    return sessions;
}

async function fetchMovieDuration(movieTitle, movieUrl) {

    if (movieDurationsCache[movieTitle]) {
        return movieDurationsCache[movieTitle];
    }

    const moviePageResponse = await axios.get(movieUrl);
    const moviePageHTML = moviePageResponse.data;
    const $ = cheerio.load(moviePageHTML);
    const movieDuration = $('li:contains("Тривалість") .val').text().trim() || '00:00';

    movieDurationsCache[movieTitle] = movieDuration;

    return movieDuration;
}

function calculateDurationInMinutes(movieDuration) {
    const [hours, minutes] = movieDuration.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
}

function formatSessionTimes(dateFormatted, sessions, durationInMinutes) {
    const formattedSessions = [];

    for (let sessionStart of sessions) {
        const sessionStartTime = `${dateFormatted} ${sessionStart}`;
        const sessionEndTime = moment(sessionStartTime, 'DD.MM.YYYY HH:mm')
            .add(durationInMinutes, 'minutes')
            .format('DD.MM.YYYY HH:mm');

        formattedSessions.push([sessionStartTime, sessionEndTime]);
    }

    return formattedSessions;
}

async function extractCinemaData(page) {
    const result = {};
    let datesData = await fetchDatesData(page);
    datesData = datesData.slice(1);

    for (let i = 0; i < datesData.length; i++) {
        const dateRaw = datesData[i];
        const dateFormatted = moment(dateRaw, 'DDMMYYYY').format('DD.MM.YYYY');
        result[dateFormatted] = {};

        const movies = await fetchMovies(page, i);

        for (let movieIndex = 0; movieIndex < movies.length; movieIndex++) {
            const { title, href: movieHref } = movies[movieIndex];
            result[dateFormatted][title] = [];

            const sessions = await fetchSessions(page, i, movieIndex);
            const movieUrl = `https://multiplex.ua${movieHref}`;
            const movieDuration = await fetchMovieDuration(title, movieUrl);
            const durationInMinutes = calculateDurationInMinutes(movieDuration);
            const formattedSessions = formatSessionTimes(dateFormatted, sessions, durationInMinutes);

            result[dateFormatted][title] = formattedSessions;
        }
    }

    return result;
}

async function scrapeMultiplex() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://multiplex.ua/cinema/kyiv/lavina');

    const cinemaData = await extractCinemaData(page);
    await browser.close();
    return cinemaData;
}

module.exports = {
    scrapeMultiplex,
};
