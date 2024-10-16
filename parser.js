const axios = require('axios');
const puppeteer = require('puppeteer');
const moment = require('moment');
const cheerio = require('cheerio');

async function extractCinemaData(page) {
    const result = {};


    let datesData = await page.$$eval(
        'body > div.mob_fix_container.mob_fix_container-cinema > div.cinema_schedule_films > div > div',
        divs => divs.map(div => div.getAttribute('data-date'))
    );

    datesData = datesData.slice(1);


    for (let i = 0; i < datesData.length; i++) {
        const dateRaw = datesData[i];
        const dateFormatted = moment(dateRaw, 'DDMMYYYY').format('DD.MM.YYYY');
        result[dateFormatted] = {};


        const movies = await page.$$eval(
            `body > div.mob_fix_container.mob_fix_container-cinema > div.cinema_schedule_films > div > div:nth-child(${i + 2}) > div > a`,
            links => links.map(link => ({
                title: link.getAttribute('title').trim(),
                href: link.getAttribute('href')
            }))
        );


        for (let movieIndex = 0; movieIndex < movies.length; movieIndex++) {
            const { title, href: movieHref } = movies[movieIndex];
            result[dateFormatted][title] = [];


            let sessionSelector = '';
            let sessions = [];
        

            let sessionIndex = 1;
            while (true) {
                sessionSelector = `body > div.mob_fix_container.mob_fix_container-cinema > div.cinema_schedule_films > div > div:nth-child(${i + 2}) > div:nth-child(${movieIndex + 1}) > div > div.sessions > a:nth-child(${sessionIndex}) > p.time > span`;

                try {
                    const session = await page.$eval(sessionSelector, span => span.textContent.trim());
                    if (session) {
                        sessions.push(session);
                        sessionIndex++;
                    }
                } catch (e) {
                    break;
                }
            }


            const movieUrl = `https://multiplex.ua${movieHref}`;
            const moviePageResponse = await axios.get(movieUrl);
            const moviePageHTML = moviePageResponse.data;


            const $ = cheerio.load(moviePageHTML);
            const movieDuration = $('li:contains("Тривалість") .val').text().trim() || '00:00'; 


            const [hours, minutes] = movieDuration.split(':').map(Number);
            const durationInMinutes = (hours || 0) * 60 + (minutes || 0);


            for (let sessionStart of sessions) {
                const sessionStartTime = `${dateFormatted} ${sessionStart}`;
                const sessionEndTime = moment(sessionStartTime, 'DD.MM.YYYY HH:mm')
                    .add(durationInMinutes, 'minutes')
                    .format('DD.MM.YYYY HH:mm');

                result[dateFormatted][title].push([sessionStartTime, sessionEndTime]);
            }
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
