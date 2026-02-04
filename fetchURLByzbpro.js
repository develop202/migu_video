import { printGreen, printMagenta, printRed } from "./utils/colorOut.js"
import { appendFileSync, renameFileSync } from "./utils/fileUtil.js"
import { updatePlaybackData } from "./utils/playback.js"
import { writeFileSync } from "node:fs"
import { dataList } from "./utils/fetchList.js"
import updateChannels from "./utils/zbpro.js"

const start = new Date()
printMagenta("开始更新...")


printMagenta("开始更新接口文件...")
let updateResult = 2
for (let i = 0; i < 3; i++) {
  try {
    updateResult = await updateChannels()
    break
  } catch (error) {
    printRed("接口更新出现问题，正在重试...")
  }
}

switch (updateResult) {
  case 1:
    printGreen(`接口数据已是最新，无需更新`)
    // process.exit(0)
    break
  case 2:
    printRed(`接口请求失败`)
    process.exit(1)
  default:
    printGreen("接口文件更新完成！")
    break;
}

// 6小时更新节目单
if (!(start.getHours() % 6)) {
  // 获取数据
  const datas = await dataList()
  printGreen("数据获取成功！")

  try {
    const playbackFile = `${process.cwd()}/playback.xml.bak`

    writeFileSync(playbackFile, `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<tv generator-info-name="Tak" generator-info-url="https://github.com/develop202/migu_video">\n`)
    printMagenta("开始更新回放文件...")
    for (const data of datas) {
      for (const dataList of data?.dataList) {
        await updatePlaybackData(dataList, playbackFile, 10000, 8 * 60 * 60 * 1000)
      }
    }

    appendFileSync(playbackFile, `</tv>\n`)
    renameFileSync(playbackFile, playbackFile.replace(".bak", ""))

    printGreen("回放文件更新完成！")
  } catch (error) {
    printRed("回放文件更新失败！")
  }
}

printGreen(`用时 ${(Date.now() - start.getTime()) / 1000}秒`)

