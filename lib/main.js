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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const github = __importStar(require("@actions/github"));
const archive_1 = require("./archive");
function get_release_by_tag(tag, octokit, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            core.debug(`Getting release by tag ${tag}.`);
            return yield octokit.repos.getReleaseByTag(Object.assign(Object.assign({}, context.repo), { tag: tag }));
        }
        catch (error) {
            // If this returns 404, we need to create the release first.
            if (error.status === 404) {
                core.debug(`Release for tag ${tag} doesn't exist yet so we'll create it now.`);
                return yield octokit.repos.createRelease(Object.assign(Object.assign({}, context.repo), { tag_name: tag }));
            }
            else {
                throw error;
            }
        }
    });
}
function upload_to_release(release, file, content_type, asset_name, tag, overwrite, octokit, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const file_size = fs.statSync(file).size;
        const file_bytes = fs.readFileSync(file);
        // Check for duplicates.
        const assets = yield octokit.repos.listAssetsForRelease(Object.assign(Object.assign({}, context.repo), { release_id: release.data.id }));
        const duplicate_asset = assets.data.find((a) => a.name === asset_name);
        if (duplicate_asset !== undefined) {
            if (overwrite === "true") {
                core.debug(`An asset called ${asset_name} already exists in release ${tag} so we'll overwrite it.`);
                yield octokit.repos.deleteReleaseAsset(Object.assign(Object.assign({}, context.repo), { asset_id: duplicate_asset.id }));
            }
            else {
                core.setFailed(`An asset called ${asset_name} already exists.`);
                return;
            }
        }
        else {
            core.debug(`No pre-existing asset called ${asset_name} found in release ${tag}. All good.`);
        }
        core.debug(`Uploading ${file} to ${asset_name} in release ${tag}.`);
        yield octokit.repos.uploadReleaseAsset({
            url: release.data.upload_url,
            name: asset_name,
            file: file_bytes,
            headers: {
                "content-type": content_type,
                "content-length": file_size,
            },
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput("repo_token", { required: true });
            let directory = core.getInput("directory", { required: true });
            const asset_name = core.getInput("asset_name", { required: true });
            const tag = core
                .getInput("tag", { required: true })
                .replace("refs/tags/", "");
            const platform = core.getInput("platform");
            const overwrite = core.getInput("overwrite");
            if (!fs.existsSync(directory)) {
                throw new Error(`Directory ${directory} wasn't found.`);
            }
            if (platform !== "") {
                switch (platform) {
                    case "examples":
                    case "doc":
                        directory = path.join(directory, platform);
                        break;
                    default:
                        yield io.rmRF(path.join(directory, "examples"));
                        yield io.rmRF(path.join(directory, "doc"));
                        yield io.rmRF(path.join(directory, "Tools"));
                        const newDir = path.join(directory, "..", "qt-install");
                        yield io.mkdirP(newDir);
                        yield io.mv(directory, path.join(newDir, platform));
                        directory = newDir;
                        break;
                }
            }
            const octokit = github.getOctokit(token);
            const context = github.context;
            const archive = new archive_1.Archive();
            const aPath = yield archive.prepareArchive(asset_name, directory);
            const release = yield get_release_by_tag(tag, octokit, context);
            yield upload_to_release(release, aPath, archive.mimeType(), archive.fullName(asset_name), tag, overwrite, octokit, context);
        }
        catch (error) {
            console.error(error);
            core.setFailed(error.message);
        }
    });
}
run();
