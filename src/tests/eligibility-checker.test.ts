import fs from "fs-extra";
import os from "os";
import path from "path";
import { EligibilityChecker } from "../eligibility-checker";

describe(EligibilityChecker, () => {
    const testDir = path.join(os.tmpdir(), Math.random().toString().slice(2));
    let checker: EligibilityChecker;

    beforeEach(async () => {
        checker = new EligibilityChecker(testDir);
        await checker.init();
    })

    afterEach(() => {
        checker?.dispose();

        if (testDir != undefined) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    test("allows unique requests", async () => {
        const validity1 = await checker.checkValidity("1", "1");
        const validity2 = await checker.checkValidity("2", "2");
        const validity3 = await checker.checkValidity("3", "3");
        expect(validity1).toBe(true);
        expect(validity2).toBe(true);
        expect(validity3).toBe(true);
    });

    test("forbids requests with unique address but same twitter handle", async () => {
        const validity1 = await checker.checkValidity("1", "1");
        const validity2 = await checker.checkValidity("2", "1");
        const validity3 = await checker.checkValidity("3", "3");
        expect(validity1).toBe(true);
        expect(validity2).toBe(false);
        expect(validity3).toBe(true);
    });

    test("forbids requests with same address but unique twitter handle", async () => {
        const validity1 = await checker.checkValidity("1", "1");
        const validity2 = await checker.checkValidity("1", "2");
        const validity3 = await checker.checkValidity("3", "3");
        expect(validity1).toBe(true);
        expect(validity2).toBe(false);
        expect(validity3).toBe(true);
    });

    test("forbids requests with same address and twitter handle", async () => {
        const validity1 = await checker.checkValidity("1", "1");
        const validity2 = await checker.checkValidity("2", "2");
        const validity3 = await checker.checkValidity("1", "1");
        expect(validity1).toBe(true);
        expect(validity2).toBe(true);
        expect(validity3).toBe(false);
    });

    test("validates requests correctly after restart", async () => {
        let checker = new EligibilityChecker(testDir);
        await checker.init();

        const validity1 = await checker.checkValidity("1", "1");
        const validity2 = await checker.checkValidity("2", "2");
        const validity3 = await checker.checkValidity("3", "3");

        checker.dispose();

        checker = new EligibilityChecker(testDir);
        await checker.init();

        const validity4 = await checker.checkValidity("1", "1");
        const validity5 = await checker.checkValidity("4", "4");
        const validity6 = await checker.checkValidity("4", "4");
        const validity7 = await checker.checkValidity("5", "5");

        checker.dispose();

        checker = new EligibilityChecker(testDir);
        await checker.init();

        const validity8 = await checker.checkValidity("1", "1");
        const validity9 = await checker.checkValidity("3", "6");
        const validity10 = await checker.checkValidity("7", "4");
        const validity11 = await checker.checkValidity("8", "8");

        checker.dispose();

        expect(validity1).toBe(true);
        expect(validity2).toBe(true);
        expect(validity3).toBe(true);
        expect(validity4).toBe(false);
        expect(validity5).toBe(true);
        expect(validity6).toBe(false);
        expect(validity7).toBe(true);
        expect(validity8).toBe(false);
        expect(validity9).toBe(false);
        expect(validity10).toBe(false);
        expect(validity11).toBe(true);
    });
})