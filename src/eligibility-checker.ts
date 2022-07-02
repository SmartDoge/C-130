import fs from "fs-extra";
import path from "path";

const addressesFile = "seen-addresses";
const authorIdsFile = "seen-author-ids";
const encoding = "utf8";

export class EligibilityChecker {
    private addresses: Set<string> | undefined;
    private authorIds: Set<string> | undefined;
    private addressesDescriptor: number | undefined;
    private authorIdsDescriptor: number | undefined;

    constructor(private readonly saveLocation: string) { }

    async init() {
        this.addresses = await this.initSeen(addressesFile);
        this.authorIds = await this.initSeen(authorIdsFile);

        this.addressesDescriptor = await this.getAppendableDescriptor(addressesFile);
        this.authorIdsDescriptor = await this.getAppendableDescriptor(authorIdsFile);
    }

    async checkValidity(address: string, authorId: string) {
        if (this.addresses!.has(address)) {
            return false;
        }

        if (this.authorIds!.has(authorId)) {
            return false;
        }

        await this.writeLineToStream(address, this.addressesDescriptor!);
        this.addresses!.add(address);

        await this.writeLineToStream(authorId, this.authorIdsDescriptor!);
        this.authorIds!.add(authorId);

        return true;
    }

    private async initSeen(fileName: string) {
        const filePath = path.resolve(this.saveLocation, fileName);
        const text = await fs.readFile(filePath, encoding);
        const split = text.split("\n");
        return new Set(split);
    }

    private async getAppendableDescriptor(fileName: string) {
        const filePath = path.resolve(this.saveLocation, fileName);
        return await fs.open(filePath, "a+");
    }

    private async writeLineToStream(line: string, descriptor: number) {
        fs.appendFile(descriptor, line, { encoding });
        fs.appendFile("\n", line, { encoding });
        await fs.fdatasync(descriptor);
    }
}