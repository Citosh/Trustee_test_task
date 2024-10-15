const moment = require('moment');
require('moment/locale/uk'); // Ensure Ukrainian locale is loaded
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require("cheerio");

async function extractDates(page) {
    const result = {};
    const hrefMap = {}; // Store href separately

    // Extract dates
    const dateSelectionLinks = await page.$$eval('.date_selection a.date', links =>
        links.map(link => ({
            href: link.getAttribute('href'),
            dateText: link.querySelector('p.dateval span.is-desktop')?.textContent.trim()
        }))
    );

    // Extract year from page content or assume the current year
    const year = moment().year();

    dateSelectionLinks.forEach(({ href, dateText }) => {
        if (dateText) {
            const fullDateText = `${dateText} ${year}`;
            const date = moment(fullDateText, 'D MMMM YYYY', 'uk').format('DD.MM.YYYY');
            result[date] = {}; // Initialize as an empty object for movies and sessions
            hrefMap[date] = href; // Store the href in a separate map
        }
    });

    return { result, hrefMap }; // Return both result and hrefMap
}

async function extractTitleSessions(page) {
    const sessionsMap = [];

    // Extract movie titles and sessions
    const movies = await page.$$eval(
        'body > div.mob_fix_container.mob_fix_container-cinema > div.cinema_schedule_films > div > div:nth-child(3) > div > div > a',
        movieLinks =>
            movieLinks.map(link => ({
                title: link.getAttribute('title') ? link.getAttribute('title').trim() : '', // Parse movie title
                sessions: Array.from(link.closest('div').querySelectorAll('div.sessions.showmore > a.ns.locked > p.time > span')).map(
                    timeElement => timeElement ? timeElement.textContent.trim() : '' // Handle potential null for session times
                )
            }))
    );

    return movies; // No href needed here
}

async function extractMovieDuration(movieHref) {
    const movieResponse = await axios.get(`https://multiplex.ua${movieHref}`);
    const moviePage = cheerio.load(movieResponse.data);
    const durationText = moviePage('body > div.mob_fix_container > div > div > div > div.column2 > ul > li:nth-child(10) > p.val').text().trim();
    return moment.duration(durationText); // Return duration in a moment.js format
}

function calculateEndTimes(sessions, duration, date) {
    return sessions.map(startTime => {
        const startMoment = moment(`${date} ${startTime}`, 'DD.MM.YYYY HH:mm');
        const endMoment = startMoment.clone().add(duration);
        return [startMoment.format('HH:mm'), endMoment.format('HH:mm')]; // Return start and end times
    });
}

async function scrapeMultiplex() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const baseUrl = 'https://multiplex.ua/cinema/kyiv/lavina';

    // Set moment to use Ukrainian locale
    moment.locale('uk');

    // Navigate to the base URL
    await page.goto(baseUrl);

    // Extract dates and hrefs separately
    const { result, hrefMap } = await extractDates(page);

    // Loop through each date, click the link, and scrape the session data
    for (const date in hrefMap) {
        const href = hrefMap[date];

        const previousContent = await page.content(); // Отримуємо HTML контент сторінки

        await page.click(`a[href="${href}"]`); // Click the link for the specific date

        await page.waitForFunction(
            (previousContent) => document.body.innerHTML !== previousContent,
            { timeout: 60000 },
            previousContent
        );

        // Alternative to wait for navigation: wait for specific element to ensure page has changed
        await new Promise(resolve => setTimeout(resolve, 3000));

        await page.waitForSelector('div.sessions.showmore', { timeout: 60000 }); // Increase timeout if necessary

        // Extract movie titles and sessions for this specific date
        const sessionsMap = await extractTitleSessions(page);

        // Loop through each movie to get its duration and calculate session times
        await Promise.all(sessionsMap.map(async ({ title, sessions }) => {
            const duration = await extractMovieDuration(href); // Get movie duration

            // Calculate end times for the sessions
            const updatedSessions = calculateEndTimes(sessions, duration, date);

            // Store the movie title and session times under the specific date
            result[date][title] = updatedSessions;
        }));
    }

    await browser.close();

    return result; // Final result structure without hrefs
}

module.exports = {
    scrapeMultiplex,
};
