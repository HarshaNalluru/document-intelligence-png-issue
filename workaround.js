const fs = require("fs");
const https = require("https");


async function fetchData() {
  try {
    const operationID = "98816098-c1b1-4b14-b001-c9433603c988";
    const figureID = "3.2";
    const modelId = "prebuilt-layout";
    const response = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: process.env.DOCUMENT_INTELLIGENCE_HOSTNAME,
        path: `/documentintelligence/documentModels/${modelId}/analyzeResults/${operationID}/figures/${figureID}?api-version=2024-07-31-preview`,
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.DOCUMENT_INTELLIGENCE_API_KEY
        }
      }, (res) => {
        let data = [];

        res.on('data', (chunk) => {
          data.push(chunk);
        });

        res.on('end', () => {
          resolve(Buffer.concat(data));
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.end();
    });

    await fs.promises.rm(`./figures`, { recursive: true }).catch(() => { });
    await fs.promises.mkdir(`./figures`);
    await fs.promises.writeFile(`./figures/1.png`, response);
    console.log(response);
  } catch (error) {
    console.error(error);
  }
}

fetchData();