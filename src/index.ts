import os from "os";
import path from "path";
import { Client } from "twitter-api-sdk";
import { searchStream, TwitterResponse } from "twitter-api-sdk/dist/types";
import yargs from "yargs";
import { EligibilityChecker } from "./eligibility-checker";
import { Sender } from "./sender";

type AddRule = {
    tag?: string | undefined;
    value: string;
};

const ruleTag = "airdrop";
const ruleValue = "@FreeSmartDoge";
const addressRegexp = new RegExp("0x[a-fA-F0-9]{40}");

const validateStreamRules = async (client: Client) => {
    const rules = await client.tweets.getRules();
    const toDelete: string[] = rules.data?.filter(x => x.tag != ruleTag)?.map(x => x.id)?.filter(x => x != undefined) as string[] ?? [];
    const toAdd: AddRule[] = [];
    const hasAirdrop = rules.data?.some(x => x.tag === ruleTag) === true;
    if (!hasAirdrop) {
        toAdd.push({
            tag: ruleTag,
            value: ruleValue
        })
    }

    if (toDelete.length > 0) {
        const response = await client.tweets.addOrDeleteRules({ delete: { ids: toDelete } });
        console.log("Deleted stream rules:", response.data);
    }

    if (toAdd.length > 0) {
        const response = await client.tweets.addOrDeleteRules({ add: toAdd });
        console.log("Added stream rules:", response.data);
    }

    if (toAdd.length === 0 && toDelete.length === 0) {
        console.log("Stream rules OK");
    }
}

const handleTweet = async (tweet: TwitterResponse<searchStream>, eligibilityChecker: EligibilityChecker, sender: Sender) => {
    console.log("received tweet", tweet);
    if (tweet.data == undefined) {
        console.log("Tweet ignored, missing data field")
        return;
    }

    const text = tweet.data.text;
    const result = addressRegexp.exec(text);
    const address = result?.[0];
    if (address == undefined) {
        console.log("Tweet ignored, missing address", tweet.data.id);
        return;
    }

    const authorId = tweet.data.author_id;
    if (authorId == undefined) {
        console.log("Tweet ignored, missing author ID", tweet.data.id);
        return;
    }

    const isEligible = await eligibilityChecker.checkValidity(address, authorId);
    if (!isEligible) {
        console.log("Tweet ignored, user and/or address has already been airdropped", tweet.data.id)
        return;
    }

    console.log("Sending to", address);

    await sender.send(address);
}

const connectToSearchStream = async (client: Client, eligibilityChecker: EligibilityChecker, sender: Sender) => {
    const searchStream = client.tweets.searchStream({ expansions: ["author_id"] });
    console.log("Awaiting tweets...")
    for await (const tweet of searchStream) {
        await handleTweet(tweet, eligibilityChecker, sender);
    }
}

const run = async () => {
    const argv = await yargs(process.argv.slice(2))
        .alias("t", "token")
        .describe("t", "Your app's Twitter API bearer token")

        .alias("n", "network")
        .describe("n", "The address of the EVM-compatible network to which to connect")

        .alias("k", "private-key")
        .describe("k", "The private key of the account from which to airdrop")

        .alias("a", "amount")
        .describe("a", "The amount of currency to airdrop per request")
        .default("a", "1")

        .demandOption(["t", "k", "n"])
        .argv;

    let key = argv.k as string;
    key = key.startsWith("0x") ? key.slice(2) : key;

    const twitterClient = new Client(argv.t as string);

    const eligibilityChecker = new EligibilityChecker(path.resolve(os.homedir(), ".c-130"));
    await eligibilityChecker.init();

    const sender = new Sender(argv.n as string, key, argv.a);

    await validateStreamRules(twitterClient);
    await connectToSearchStream(twitterClient, eligibilityChecker, sender);
}

void run();
