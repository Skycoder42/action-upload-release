"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Archive = void 0;
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
