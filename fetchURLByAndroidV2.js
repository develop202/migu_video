import { dataList } from "./utils/fetchList.js"
import { getAndroidURL } from "./utils/androidURL.js"
import refreshToken from "./utils/refreshToken.js"
import { appendFile, writeFile } from "./utils/fileUtil.js"
import { updatePlaybackData } from "./utils/playback.js"

async function fetchURLByAndroid() {

  const userId = process.env.USERID
  const token = process.env.MIGU_TOKEN

  const date = new Date()
  const start = date.getTime()

  // 必须绝对路径
  const path = process.cwd() + '/interface.txt'
  // 创建写入空内容
  writeFile(path, "")

  // 获取数据
  const datas = await dataList()

  // 回放
  const playbackFile = process.cwd() + '/playback.xml'
  writeFile(playbackFile,
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<tv generator-info-name="Tak" generator-info-url="https://github.com/sunricloud/migu_video/">\n`)

  if (!date.getHours()) {
    // 0点刷新token
    await refreshToken(userId, token) ? console.log("token刷新成功") : console.log("token刷新失败")
  }

  // 写入开头
  // appendFile(aptvPath, `#EXTM3U x-tvg-url="https://gitee.com/dream-deve/migu_video/raw/main/playback.xml" catchup="append" catchup-source="&playbackbegin=\${(b)yyyyMMddHHmmss}&playbackend=\${(e)yyyyMMddHHmmss}"\n`)
  appendFile(path, `#EXTM3U x-tvg-url="https://develop202.github.io/migu_video/playback.xml,https://raw.githubusercontent.com/sunricloud/migu_video/refs/heads/main/playback.xml,https://gh-proxy.com/https://raw.githubusercontent.com/develop202/migu_video/refs/heads/main/playback.xml" catchup="append" catchup-source="&playbackbegin=\${(b)yyyyMMddHHmmss}&playbackend=\${(e)yyyyMMddHHmmss}"\n`)

  // 分类列表
  for (let i = 0; i < datas.length; i++) {
    console.log(`分类###:${datas[i].name}`)

    const data = datas[i].dataList
    // 写入节目
    for (let j = 0; j < data.length; j++) {
      const res = await updatePlaybackData(data[j], playbackFile)
      if (!res) {
        console.log(`playback.xml更新失败`)
      }

      // 获取链接
      const resObj = await getAndroidURL(userId, token, data[j].pID, 999)
      if (resObj.url == "") {
        console.log(`${data[j].name}：节目调整，暂不提供服务`)
        continue
      }
      console.log(`正在写入节目:${data[j].name}`)

      // 写入节目
      appendFile(path, `#EXTINF:-1 svg-id="${data[j].name}" svg-name="${data[j].name}" tvg-logo="${data[j].pics.highResolutionH}" group-title="${datas[i].name}",${data[j].name}\n${resObj.url}\n`)
    }
  }

  appendFile(playbackFile, `</tv>\n`)
  const end = Date.now()
  console.log(`本次耗时:${(end - start) / 1000}秒`)
}

fetchURLByAndroid()
