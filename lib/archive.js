"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const ex = __importStar(require("@actions/exec"));
class Archive {
    mimeType() {
        return os.platform() == "win32" ? "application/zip" : "application/x-xz";
    }
    fullName(name) {
        return os.platform() == "win32" ? name + ".zip" : name + ".tar.xz";
    }
    prepareArchive(name, dirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const platform = os.platform();
            const tempDir = this.initTempDir(platform);
            if (platform == "win32") {
                const zPath = path.join(tempDir, this.fullName(name));
                const options = {};
                options.cwd = dirPath;
                yield ex.exec("7z", ["a", zPath, "."], options);
                return zPath;
            }
            else {
                const tPath = path.join(tempDir, this.fullName(name));
                const options = {};
                options.cwd = dirPath;
                options.env = {
                    XZ_OPT: "-9"
                };
                yield ex.exec("tar", ["cJf", tPath, "."], options);
                return tPath;
            }
        });
    }
    initTempDir(platform) {
        let tempDirectory = process.env['RUNNER_TEMP'] || '';
        if (!tempDirectory) {
            let baseLocation;
            if (platform == "win32") {
                // On windows use the USERPROFILE env variable
                baseLocation = process.env['USERPROFILE'] || 'C:\\';
            }
            else {
                if (platform === 'darwin')
                    baseLocation = '/Users';
                else
                    baseLocation = '/home';
            }
            tempDirectory = path.join(baseLocation, 'actions', 'temp');
        }
        return tempDirectory;
    }
}
exports.Archive = Archive;
