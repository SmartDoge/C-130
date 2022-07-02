import * as ethers from "ethers";

export class Sender {
    private readonly wallet: ethers.Wallet;
    private readonly sendAmount: ethers.BigNumber;

    constructor(network: string, privateKey: string, amount: string) {
        const provider = ethers.getDefaultProvider(network);
        this.wallet = new ethers.Wallet(privateKey, provider);
        this.sendAmount = ethers.utils.parseEther(amount);
    }

    async send(to: string) {
        try {
            await this.wallet.sendTransaction({ to, value: this.sendAmount })
        } catch (e) {
            console.error("Error sending transaction", to, e);
        }
    }
}