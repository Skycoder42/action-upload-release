import * as os from 'os'
import * as path from 'path'

import * as ex from '@actions/exec'
import * as io from '@actions/io'

export class Archive {
  mimeType(): string {
    return os.platform() == 'win32' ? 'application/zip' : 'application/x-xz'
  }

  fullName(name: string): string {
    return os.platform() == 'win32' ? name + '.zip' : name + '.tar.xz'
  }

  async preparePlatformDirs(
    directory: string,
    platform: string
  ): Promise<string> {
    switch (platform) {
      case 'examples':
      case 'doc':
        return path.join(directory, platform)
      default:
        await io.rmRF(path.join(directory, 'examples'))
        await io.rmRF(path.join(directory, 'doc'))
        await io.rmRF(path.join(directory, 'Tools'))
        const newDir = path.join(directory, '..', 'qt-install')
        await io.mkdirP(newDir)
        await io.mv(directory, path.join(newDir, platform))
        return newDir
    }
  }

  async prepareArchive(name: string, dirPath: string): Promise<string> {
    const platform = os.platform()
    const tempDir = this.initTempDir(platform)
    if (platform == 'win32') {
      const zPath = path.join(tempDir, this.fullName(name))
      const options: ex.ExecOptions = {}
      options.cwd = dirPath
      await ex.exec('7z', ['a', zPath, '.'], options)
      return zPath
    } else {
      const tPath = path.join(tempDir, this.fullName(name))
      const options: ex.ExecOptions = {}
      options.cwd = dirPath
      options.env = {
        XZ_OPT: '-9'
      }
      await ex.exec('tar', ['cJf', tPath, '.'], options)
      return tPath
    }
  }

  private initTempDir(platform: string): string {
    let tempDirectory: string = process.env['RUNNER_TEMP'] || ''
    if (!tempDirectory) {
      let baseLocation: string
      if (platform == 'win32') {
        // On windows use the USERPROFILE env variable
        baseLocation = process.env['USERPROFILE'] || 'C:\\'
      } else {
        if (platform === 'darwin') baseLocation = '/Users'
        else baseLocation = '/home'
      }
      tempDirectory = path.join(baseLocation, 'actions', 'temp')
    }
    return tempDirectory
  }
}
