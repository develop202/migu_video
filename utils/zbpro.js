import { printGreen, printMagenta, printRed } from "./colorOut.js"
import crypto from "node:crypto"
import { writeFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import { debug } from "../config.js"
import { domainWhiteList, repoLinkUpdateTimestamp } from "./datas.js"
import { readFileSync } from "./fileUtil.js"

const KEY_ARRAY = [121, 111, 117, 33, 106, 101, 64, 49, 57, 114, 114, 36, 50, 48, 121, 35]
const IV_ARRAY = [65, 114, 101, 121, 111, 117, 124, 62, 127, 110, 54, 38, 13, 97, 110, 63]

/**
 * AES 解密
 */
function AESdecrypt(baseData, keyArray = KEY_ARRAY, ivArray = IV_ARRAY) {
  let key = Buffer.from(keyArray)
  let iv = Buffer.from(ivArray)
  const data = Buffer.from(baseData, "base64")

  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv)
  decipher.setAutoPadding(true)
  const dest = Buffer.concat([decipher.update(data), decipher.final()])
  return dest.toString()
}

/**
 * @param {Array<String>} whiteList - 域名白名单
 * @param {String} item - 域名
 * @returns {Boolean} - 是否在白名单
 */
function isInWhiteList(whiteList, item) {
  for (const white of whiteList) {
    if (item == white) {
      return true
    }
  }
  return false
}

async function getAllURL() {
  const channelsURLM3U = []
  const channelsURLTXT = []
  const domains = {}
  let sumChannel = 0
  let status = 0
  const headers = { Referer: "http://pro.fengcaizb.com" }
  await fetch("http://pro.fengcaizb.com/channels/pro.gz", {
    headers: headers
  }).then(async pro_gz => {
    // await fetch("http://ds.fengcaizb.com/channels/dszb3.gz").then(async pro_gz => {
    if (!pro_gz?.ok) {
      printRed("请求失败")
      status = 2
      return 2
    }
    const bufferArray = await pro_gz.arrayBuffer()
    const buffer = Buffer.from(bufferArray)

    printMagenta("开始解压缩...")
    const decompressed = gunzipSync(buffer)
    printMagenta(`解压缩完成: ${buffer.length}字节 -> ${decompressed.length}字节`)
    const resultJSON = decompressed.toString()
    // console.log(result)
    // console.log(pro_gz)
    const result = JSON.parse(resultJSON)
    if (result.timestamp == repoLinkUpdateTimestamp) {
      status = 1
      return 1
    }

    const data_jsPath = `${process.cwd()}/utils/datas.js`
    const datas_js = readFileSync(data_jsPath)
    // console.log(datas_js.toString())
    writeFileSync(data_jsPath, datas_js.toString().replace(repoLinkUpdateTimestamp, result.timestamp))

    channelsURLM3U.push(`#EXTM3U x-tvg-url="https://gh-proxy.com/https://raw.githubusercontent.com/develop202/migu_video/refs/heads/main/playback.xml,https://hk.gh-proxy.org/raw.githubusercontent.com/develop202/migu_video/refs/heads/main/playback.xml,https://develop202.github.io/migu_video/playback.xml,https://raw.githubusercontents.com/develop202/migu_video/refs/heads/main/playback.xml" catchup="append" catchup-source="&playbackbegin=\${(b)yyyyMMddHHmmss}&playbackend=\${(e)yyyyMMddHHmmss}"`)
    let i = 0
    let lastChannelCate = ""
    for (const channel of result?.data) {
      // 过滤广告频道
      if (channel?.ct) {
        // printYellow(`${channel?.title} 广告频道, 过滤`)
        continue
      }
      channel.title = channel.title.replace("-", "");


      if (channel?.province != lastChannelCate) {
        channelsURLTXT.push(`${channel?.province},#genre#`)
        lastChannelCate = channel?.province
      }
      for (const url of channel?.urls) {
        i += 1
        let decryptURL = AESdecrypt(url)
        if (decryptURL.startsWith("sys_http")) {
          decryptURL = decryptURL.replace("sys_", "")
        }
        if (!decryptURL.startsWith("http")) {
          // printYellow(`${i} ${channel?.title} 格式错误, 过滤`)
          continue
        }
        if (decryptURL.indexOf("$") != -1) {
          // printYellow(`${i} ${channel?.title} 存在特殊字符, 过滤`)
          // continue
          decryptURL = decryptURL.split("$")[0]
        }
        const domain = decryptURL.split("/")[2]
        // 不在域名白名单
        if (!isInWhiteList(domainWhiteList, domain)) {
          // 超时
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort()
            // console.log("请求超时")
          }, 300);
          const test = await fetch(decryptURL, {
            signal: controller.signal
          })
            .catch(_ => {
              // console.log(err)
              clearTimeout(timeoutId);
            })
          clearTimeout(timeoutId);

          if (!test?.ok) {
            // let msg = test == undefined ? "请求超时" : "无法播放"
            // printYellow(`${i} ${channel?.title} ${msg}, 过滤`)
            continue
          }
          if (debug) {
            if (domains[domain]) {
              domains[domain].times += 1
            } else {
              domains[domain] = {
                value: domain,
                times: 1
              }
            }
            // console.log(domain)
          }
        }
        const channelURLM3U = `#EXTINF:-1 tvg-id="${channel?.title}" tvg-name="${channel?.title}" tvg-logo="" group-title="${channel?.province}",${channel.title}\n${decryptURL}`
        const channelURLTXT = `${channel?.title},${decryptURL}`
        if (sumChannel == 0) {
          // 更新时间
          const updateTime = new Date(result?.timestamp + (8 * 60 * 60 * 1000))
          const updateTimeStr = `更新日期: ${updateTime.getFullYear()}-${updateTime.getMonth() + 1}-${updateTime.getDate()} ${String(updateTime.getHours()).padStart(2, "0")}:${String(updateTime.getMinutes()).padStart(2, "0")}:${String(updateTime.getSeconds()).padStart(2, "0")}`
          channelsURLM3U.push(`#EXTINF:-1 tvg-id="${channel?.title}" tvg-name="${channel?.title}" tvg-logo="" group-title="${channel?.province}",${updateTimeStr}\n${decryptURL}`)
          channelsURLTXT.push(`更新日期: ${updateTimeStr},${decryptURL}`)
        }
        channelsURLM3U.push(channelURLM3U)
        channelsURLTXT.push(channelURLTXT)
        sumChannel += 1
        printGreen(`${i} ${sumChannel} ${channel?.title} 添加成功！`)
      }
    }

    const updateTime = new Date(result?.timestamp + (8 * 60 * 60 * 1000))
    console.log(`文件日期: ${updateTime.getFullYear()}-${updateTime.getMonth() + 1}-${updateTime.getDate()} ${String(updateTime.getHours()).padStart(2, "0")}:${String(updateTime.getMinutes()).padStart(2, "0")}:${String(updateTime.getSeconds()).padStart(2, "0")}`)
  })
  if (status != 0) {
    return status
  }
  const m3u = channelsURLM3U.join("\n")
  const txt = channelsURLTXT.join("\n")


  printGreen(`本次共更新${sumChannel}个`)
  if (debug) {
    Object.entries(domains)
      .sort((a, b) => b[1].times - a[1].times)
      .forEach(([_, item]) => {
        console.log(`"${item.value}",次数: ${item.times}`)
      })
  }
  return {
    m3u: m3u,
    txt: txt
  }
}

async function updateChannels() {
  const m3uFilePath = `${process.cwd()}/interface.txt`
  const txtFilePath = `${process.cwd()}/interfaceTXT.txt`
  const allURL = await getAllURL()
  if (allURL > 0) {
    return allURL
  }
  writeFileSync(m3uFilePath, allURL.m3u)
  writeFileSync(txtFilePath, allURL.txt)
  return 0
}

export default updateChannels
