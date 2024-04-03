import puppeteer from "puppeteer";
import fs from "fs";
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const csvFilePath = 'data.csv';

if (!fs.existsSync(csvFilePath)) {
    fs.writeFileSync(csvFilePath, 'nomi,numeri,url\n');
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
                const divs = await rowHandle.$$('.Nv2PK.tH5CWc.THOPZb ');
                for (const divHandle of divs) {
                    try {
                        const ariaLabel = await divHandle.$eval('a', el => el.getAttribute('aria-label'));
                        let classValue;
                        try {
                            classValue = await divHandle.$eval('.UsdlK', el => el.textContent);
                        } catch (error) {
                            classValue = '';
                        }
                        let url = '';
                        const urlElement = await divHandle.$('.lcr4fd.S9kvJb');
                        if (urlElement) {
                            url = await urlElement.evaluate(a => a.getAttribute('href'));
                        } else {
                            url = 'URL not present';
                        }

                        fs.appendFileSync(csvFilePath, `"${ariaLabel}","${classValue}","${url}"\n`);
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
