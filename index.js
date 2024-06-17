import puppeteer from "puppeteer";
import fs from "fs";
import readline from 'readline';
import path from 'path';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const dataFolderPath = './data/';
const allValuesFilePath = path.join(dataFolderPath, 'allValues.csv');
const numeriFissiFilePath = path.join(dataFolderPath, 'numeriFissi.csv');
const numeriMobiliFilePath = path.join(dataFolderPath, 'numeriMobili.csv');

// Clean up existing CSV files
cleanUpCSV(allValuesFilePath);
cleanUpCSV(numeriFissiFilePath);
cleanUpCSV(numeriMobiliFilePath);

// Function to clean up CSV files
function cleanUpCSV(filePath) {
    try {
        fs.truncateSync(filePath, 0);
        console.log(`Cleaned up ${filePath}`);
    } catch (error) {
        console.error(`Error cleaning up ${filePath}:`, error);
    }
}

rl.question('Inserisci la stringa = ', async (stringToSearch) => {
    try {
        const browser = await puppeteer.launch({ headless: false, defaultViewport: false });
        const page = await browser.newPage();

        const url = `https://www.google.com/maps/search/${encodeURIComponent(stringToSearch)}`;
        await page.goto(url);

        await page.waitForSelector(".CxJub > .VtwTSb");

        try {
            await page.evaluate(() => {
                const wrapper = document.querySelector(".CxJub > .VtwTSb");
                const forms = wrapper.querySelectorAll("form");
                if (forms.length > 0) {
                    forms[0].submit();
                }
            });
        } catch (error) {
            console.error("Error occurred during page evaluation:", error);
        }

        await page.waitForNavigation();

        const wrapperHandle = await page.waitForSelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd', { visible: true });
        await wrapperHandle.scrollIntoView();

        while (true) {
            const wrapper = await page.$$('.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd > .m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd.QjC7t');

            for (const rowHandle of wrapper) {
                const divs = await rowHandle.$$('.Nv2PK.tH5CWc.THOPZb, .Nv2PK.Q2HXcd.THOPZb, .Nv2PK.THOPZb.CpccDe');
                for (const divHandle of divs) {
                    try {
                        const ariaLabel = await divHandle.$eval('a', el => el.getAttribute('aria-label'));


                        // Get aria-label attribute value of element with id 'searchbox'
                        // Get the text content of the <title> tag
                        // Get the page title
                        const pageTitle = await page.title();

                        const mainTitle = pageTitle.split(' - ')[0];

                        const words = mainTitle.split(' ');

                        const lastWord = words.pop();
                        const nameCity = lastWord.charAt(0).toUpperCase() + lastWord.slice(1);

                        console.log(pageTitle);
                        console.log(nameCity);



                        let classValue;
                        try {
                            classValue = (await divHandle.$eval('.UsdlK', el => el.textContent)).replace(/\s/g, '');
                        } catch (error) {
                            classValue = '';
                        }


                        let url = '';
                        const urlElement = await divHandle.$('.lcr4fd.S9kvJb');
                        if (urlElement) {
                            url = await urlElement.evaluate(a => a.getAttribute('href'));
                        }
                        else {
                            const hfpxzcElement = await divHandle.$('.Nv2PK.THOPZb.CpccDe .hfpxzc');
                            if (hfpxzcElement) {
                                const href = await hfpxzcElement.evaluate(a => a.getAttribute('href'));
                                const newPage = await browser.newPage();
                                await newPage.goto(href);
                                const elementExists = await newPage.$('.m6QErb .rogA2c.ITvuef .Io6YTe.fontBodyMedium.kR99db');
                                if (elementExists) {
                                    url = await newPage.$eval('.m6QErb .rogA2c.ITvuef .Io6YTe.fontBodyMedium.kR99db', el => el.textContent.trim());
                                } else {
                                    url = '';
                                }
                                await newPage.close();
                            }
                            else {
                                url = ''
                            }
                        }




                        fs.appendFileSync(allValuesFilePath, `"${ariaLabel}","${nameCity}","${classValue}","${url}"\n`);

                        // Check if classValue starts with '0' or '3' and save to respective files
                        if (classValue.startsWith('3')) {
                            fs.appendFileSync(numeriMobiliFilePath, `"${ariaLabel}","${nameCity}","${classValue}","${url}"\n`);
                        } else {
                            fs.appendFileSync(numeriFissiFilePath, `"${ariaLabel}","${nameCity}","${classValue}","${url}"\n`);
                        }
                    } catch (error) {
                        continue;
                    }
                }
            }

            const answer = await askQuestion("Press Enter to continue scraping or type 'stop' to stop: ----------------------------------------------------------");
            if (answer === 'stop') {
                break;
            }
        }

        await browser.close();
        rl.close();
    } catch (error) {
        console.error("An error occurred:", error);
        rl.close();
    }
});

async function askQuestion(question) {
    return new Promise((resolve, reject) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}
