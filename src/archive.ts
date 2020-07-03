import * as os from 'os'
import * as path from 'path'

import * as ex from '@actions/exec'

export class Archive {
  mimeType(): string {
    return os.platform() == 'win32' ? 'application/zip' : 'application/x-xz'
  }

  fullName(name: string): string {
    return os.platform() == 'win32' ? name + '.zip' : name + '.tar.xz'
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
