import { Client } from "twitter-api-sdk";
import { searchStream, TwitterResponse } from "twitter-api-sdk/dist/types";
import yargs from "yargs";

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

const checkEligibility = (address: string, authorId: string) => {
    return true;
}

const handleTweet = (tweet: TwitterResponse<searchStream>) => {
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

    const isEligible = checkEligibility(address, authorId);
    if (!isEligible) {
        console.log("Tweet ignored, Twitter user and/or address has already been used", tweet.data.id)
    }

    console.log("Sending SDOGE to", address);
}

const connectToSearchStream = async (client: Client) => {
    const searchStream = client.tweets.searchStream({ expansions: ["author_id"] });
    console.log("Awaiting tweets...")
    for await (const tweet of searchStream) {
        handleTweet(tweet);
    }
}

const run = async () => {
    const argv = await yargs(process.argv.slice(2))
        .alias("t", "token")
        .describe("t", "Your app's Twitter API bearer token")
        .demandOption(["t"])
        .argv;

    console.log(argv.t);

    const twitterClient = new Client(argv.t as string);
    await validateStreamRules(twitterClient);
    await connectToSearchStream(twitterClient);
}

run();
