import DocumentIntelligence, { getLongRunningPoller, isUnexpected } from "@azure-rest/ai-document-intelligence";
import fs from "node:fs";
import { config } from "dotenv";
config();

const MODEL_ID = 'prebuilt-layout';

const FILE_PATH = 'test.pdf';

const API_ENDPOINT = process.env.ENDPOINT || "";
const API_KEY = process.env.API_KEY || "";

const client = DocumentIntelligence(API_ENDPOINT, {
    key: API_KEY,
});

interface Config {
    response: AnalyzeResponse;
    responseId: string;
}

interface AnalyzeResponse {
    analyzeResult?: {
        figures?: Figure[];
    };
}

interface Figure {
    id?: string;
}

async function fetchFigure(responseId: string, figureId: string): Promise<void | null> {
    console.log(`modelId: ${MODEL_ID}, responseId: ${responseId}, figureId: ${figureId}`);
    const response = await client
        .path(`/documentModels/{modelId}/analyzeResults/{resultId}/figures/{figureId}`, MODEL_ID, responseId, figureId)
        .get();

    console.log(response.headers["content-type"]);
    console.log(response);
    const { body } = response;

    if (typeof body !== 'string') {
        return null;
    }

    // await fs.promises.writeFile(`./figures/${figureId}.png`, body);

    fs.writeFile(`./figures/${figureId}.png`, body, (err: NodeJS.ErrnoException | null) => {
        if (err) {
            console.error('Error saving image:', err);
        } else {
            console.log('Image saved successfully');
        }
    })

    // const buffer = Buffer.from(body, 'binary');

    // await fs.promises.writeFile(`./figures/${figureId}.png`, buffer, 'binary'); // When I open this file, it says it's corrupted.
}

async function analyze() {
    const base64Source = fs.readFileSync(FILE_PATH, { encoding: 'base64' });
    await fs.promises.rm(`./figures`, { recursive: true }).catch(() => { });
    await fs.promises.mkdir(`./figures`);

    const initialResponse = await client.path(`/documentModels/{modelId}:analyze`, MODEL_ID).post({
        contentType: 'application/json',
        body: { base64Source },
        queryParameters: {
            output: ['figures'],
        },
    });

    const poller = await getLongRunningPoller(client, initialResponse);

    const response = await poller.pollUntilDone();

    if (isUnexpected(response)) {
        throw new Error("The response was unexpected.");
    }

    const figures = (response.body as AnalyzeResponse).analyzeResult?.figures || [];

    for (const figure of figures) {
        if (figure.id) {
            await fetchFigure(poller.getOperationId(), figure.id);
        }
    };

}

analyze();
