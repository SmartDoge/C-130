import fs from "fs-extra";
import os from "os";
import path from "path";
import { EligibilityChecker } from "../eligibility-checker";

const createTestDir = () => {
}

describe(EligibilityChecker, () => {
    let testDir: string | undefined;

    beforeAll(() => {
        testDir = path.join(os.tmpdir(), crypto.randomUUID());
    });

    afterAll(() => {
        if (testDir != undefined) {
            fs.rmdirSync(testDir);
        }
    });

    test("creates files on disk", () => {
        new EligibilityChecker()
    })
})