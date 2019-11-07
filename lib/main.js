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
const fs = __importStar(require("fs"));
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const archive_1 = require("./archive");
function get_release_by_tag(tag, octokit, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            core.debug(`Getting release by tag ${tag}.`);
            return yield octokit.repos.getReleaseByTag(Object.assign({}, context.repo, { tag: tag }));
        }
        catch (error) {
            // If this returns 404, we need to create the release first.
            if (error.status === 404) {
                core.debug(`Release for tag ${tag} doesn't exist yet so we'll create it now.`);
                return yield octokit.repos.createRelease(Object.assign({}, context.repo, { tag_name: tag }));
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
        const assets = yield octokit.repos.listAssetsForRelease(Object.assign({}, context.repo, { release_id: release.data.id }));
        const duplicate_asset = assets.data.find(a => a.name === asset_name);
        if (duplicate_asset !== undefined) {
            if (overwrite === "true") {
                core.debug(`An asset called ${asset_name} already exists in release ${tag} so we'll overwrite it.`);
                yield octokit.repos.deleteReleaseAsset(Object.assign({}, context.repo, { asset_id: duplicate_asset.id }));
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
                "content-length": file_size
            },
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput('repo_token', { required: true });
            const directory = core.getInput('directory', { required: true });
            const asset_name = core.getInput('asset_name', { required: true });
            const tag = core.getInput('tag', { required: true }).replace("refs/tags/", "");
            const overwrite = core.getInput('overwrite');
            if (!fs.existsSync(directory)) {
                core.setFailed(`Directory ${directory} wasn't found.`);
            }
            const octokit = new github.GitHub(token);
            const context = github.context;
            const archive = new archive_1.Archive();
            const aPath = yield archive.prepareArchive(asset_name, directory);
            const release = yield get_release_by_tag(tag, octokit, context);
            yield upload_to_release(release, aPath, archive.mimeType(), archive.fullName(asset_name), tag, overwrite, octokit, context);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
