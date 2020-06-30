import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as github from "@actions/github";
import { Archive } from "./archive";

async function get_release_by_tag(
  tag: string,
  octokit: any,
  context: any
): Promise<any> {
  try {
    core.debug(`Getting release by tag ${tag}.`);
    return await octokit.repos.getReleaseByTag({
      ...context.repo,
      tag: tag,
    });
  } catch (error) {
    // If this returns 404, we need to create the release first.
    if (error.status === 404) {
      core.debug(
        `Release for tag ${tag} doesn't exist yet so we'll create it now.`
      );
      return await octokit.repos.createRelease({
        ...context.repo,
        tag_name: tag,
      });
    } else {
      throw error;
    }
  }
}

async function upload_to_release(
  release: any,
  file: string,
  content_type: string,
  asset_name: string,
  tag: string,
  overwrite: string,
  octokit: any,
  context: any
) {
  const file_size = fs.statSync(file).size;
  const file_bytes = fs.readFileSync(file);

  // Check for duplicates.
  const assets = await octokit.repos.listAssetsForRelease({
    ...context.repo,
    release_id: release.data.id,
  });
  const duplicate_asset = assets.data.find((a) => a.name === asset_name);
  if (duplicate_asset !== undefined) {
    if (overwrite === "true") {
      core.debug(
        `An asset called ${asset_name} already exists in release ${tag} so we'll overwrite it.`
      );
      await octokit.repos.deleteReleaseAsset({
        ...context.repo,
        asset_id: duplicate_asset.id,
      });
    } else {
      core.setFailed(`An asset called ${asset_name} already exists.`);
      return;
    }
  } else {
    core.debug(
      `No pre-existing asset called ${asset_name} found in release ${tag}. All good.`
    );
  }

  core.debug(`Uploading ${file} to ${asset_name} in release ${tag}.`);
  await octokit.repos.uploadReleaseAsset({
    url: release.data.upload_url,
    name: asset_name,
    file: file_bytes,
    headers: {
      "content-type": content_type,
      "content-length": file_size,
    },
  });
}

async function run() {
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
          await io.rmRF(path.join(directory, "examples"));
          await io.rmRF(path.join(directory, "doc"));
          await io.rmRF(path.join(directory, "Tools"));
          const newDir = path.join(directory, "..", "qt-install");
          await io.mkdirP(newDir);
          await io.mv(directory, path.join(newDir, platform));
          directory = newDir;
          break;
      }
    }

    const octokit = github.getOctokit(token);
    const context = github.context;

    const archive = new Archive();
    const aPath = await archive.prepareArchive(asset_name, directory);

    const release = await get_release_by_tag(tag, octokit, context);
    await upload_to_release(
      release,
      aPath,
      archive.mimeType(),
      archive.fullName(asset_name),
      tag,
      overwrite,
      octokit,
      context
    );
  } catch (error) {
    console.error(error);
    core.setFailed(error.message);
  }
}

run();
