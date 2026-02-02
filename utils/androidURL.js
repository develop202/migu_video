import { getStringMD5 } from "./EncryUtils.js";
import { getddCalcuURL, getddCalcuURL720p } from "./ddCalcuURL.js";
import { printDebug, printGreen, printRed, printYellow } from "./colorOut.js";
import { fetchUrl } from "./net.js";
import { enableH265, enableHDR } from "../config.js";

/**
 * @typedef {object} SaltSign
 * @property {string} salt 盐值
 * @property {string} sign 签名
 */

/**
 * @param {string} md5 - md5字符串
 * @returns {SaltSign} - 
 */
function getSaltAndSign(md5) {

  const salt = 1230024
  const suffix = "3ce941cc3cbc40528bfd1c64f9fdf6c0migu0123"
  const sign = getStringMD5(md5 + suffix)
  return {
    salt: salt,
    sign: sign
  }
}

/**
 * @param {string} userId - 用户ID
 * @param {string} token - 用户token
 * @param {string} pid - 节目ID
 * @param {number} rateType - 清晰度
 * @returns {} - 
 */
async function getAndroidURL(userId, token, pid, rateType) {

  if (rateType <= 1) {
    return {
      url: "",
      rateType: 0,
      content: null
    }
  }
  // 获取url
  const timestramp = Date.now()
  const appVersion = "26000370"
  let headers = {
    AppVersion: 2600037000,
    TerminalId: "android",
    "X-UP-CLIENT-CHANNEL-ID": "2600037000-99000-200300220100002",
  }
  // cctv5和5+开启flv后不能回放
  if (pid != "641886683" && pid != "641886773") {
    headers["appCode"] = "miguvideo_default_android"
  }

  if (rateType != 2 && userId != "" && token != "") {
    headers.UserId = userId
    headers.UserToken = token
  }
  // console.log(headers)
  const str = timestramp + pid + appVersion
  const md5 = getStringMD5(str)
  const result = getSaltAndSign(md5)

  let enableHDRStr = ""
  if (enableHDR != "false") {
    enableHDRStr = "&4kvivid=true&2Kvivid=true&vivid=2"
  }
  let enableH265Str = ""
  if (enableH265 != "false") {
    enableH265Str = "&h265N=true"
  }
  // 请求
  const baseURL = "https://play.miguvideo.com/playurl/v1/play/playurl"
  let params = "?sign=" + result.sign + "&rateType=" + rateType
    + "&contId=" + pid + "&timestamp=" + timestramp + "&salt=" + result.salt
    + "&flvEnable=true&super4k=true" + (rateType == 9 ? "&ott=true" : "") + enableH265Str + enableHDRStr
  printDebug(`请求链接: ${baseURL + params}`)
  let respData = await fetchUrl(baseURL + params, {
    headers: headers
  })

  printDebug(respData)

  if (respData.rid == 'TIPS_NEED_MEMBER') {
    printYellow("该账号没有会员 正在降低画质")
    let respRateType = parseInt(respData.body.urlInfo?.rateType) > 4 ? 4 : 3
    params = "?sign=" + result.sign + "&rateType=" + respRateType
      + "&contId=" + pid + "&timestamp=" + timestramp + "&salt=" + result.salt
      + "&flvEnable=true&super4k=true" + enableH265Str + enableHDRStr
    printDebug(`请求链接: ${baseURL + params}`)
    respData = await fetchUrl(baseURL + params, {
      headers: headers
    })

    if (respData.rid == 'TIPS_NEED_MEMBER') {
      printYellow("账号非钻石会员 降低画质")

      params = "?sign=" + result.sign + "&rateType=3"
        + "&contId=" + pid + "&timestamp=" + timestramp + "&salt=" + result.salt
        + "&flvEnable=true&super4k=true" + enableH265Str + enableHDRStr
      printDebug(`请求链接: ${baseURL + params}`)
      respData = await fetchUrl(baseURL + params, {
        headers: headers
      })
    }
  }

  printDebug(respData)
  // console.log(respData)
  const url = respData.body.urlInfo?.url
  // console.log(rateType)
  // console.log(url)
  if (!url) {
    return {
      url: "",
      rateType: 0,
      content: respData
    }
  }
  pid = respData.body.content.contId

  // 将URL加密
  const resURL = getddCalcuURL(url, pid, "android", rateType, userId)

  rateType = respData.body.urlInfo?.rateType
  // console.log("清晰度" + rateType)
  return {
    url: resURL,
    rateType: parseInt(rateType),
    content: respData
  }

}


/**
 * 旧版高清画质
 * @param {string} pid - 节目ID
 * @returns {} - 
 */
async function getAndroidURL720p(pid) {
  // 获取url
  const timestramp = Math.round(Date.now()).toString()
  const appVersion = "2600034600"
  const appVersionID = appVersion + "-99000-201600010010028"
  let headers = {
    AppVersion: `${appVersion}`,
    TerminalId: "android",
    "X-UP-CLIENT-CHANNEL-ID": `${appVersionID}`,
  }
  // cctv5和5+开启flv后不能回放
  if (pid != "641886683" && pid != "641886773") {
    headers["appCode"] = "miguvideo_default_android"
  }
  // console.log(headers)
  const str = timestramp + pid + appVersion.substring(0, 8)
  const md5 = getStringMD5(str)

  const salt = String(Math.floor(Math.random() * 1000000)).padStart(6, '0') + '25'
  const suffix = "2cac4f2c6c3346a5b34e085725ef7e33migu" + salt.substring(0, 4)
  const sign = getStringMD5(md5 + suffix)

  let rateType = 3
  let enableHDRStr = ""
  if (enableHDR != "false") {
    enableHDRStr = "&4kvivid=true&2Kvivid=true&vivid=2"
  }
  let enableH265Str = ""
  if (enableH265 != "false") {
    enableH265Str = "&h265N=true"
  }
  // 请求
  const baseURL = "https://play.miguvideo.com/playurl/v1/play/playurl"
  const params = "?sign=" + sign + "&rateType=" + rateType
    + "&contId=" + pid + "&timestamp=" + timestramp + "&salt=" + salt
    + "&flvEnable=true&super4k=true" + enableH265Str + enableHDRStr
  printDebug(`请求链接: ${baseURL + params}`)
  const respData = await fetchUrl(baseURL + params, {
    headers: headers
  })

  printDebug(respData)
  // console.dir(respData, { depth: null })
  const url = respData.body.urlInfo?.url
  // console.log(rateType)
  // console.log(url)
  if (!url) {
    return {
      url: "",
      rateType: 0,
      content: respData
    }
  }

  rateType = respData.body.urlInfo?.rateType
  pid = respData.body.content.contId

  // 将URL加密
  const resURL = getddCalcuURL720p(url, pid)

  return {
    url: resURL,
    rateType: parseInt(rateType),
    content: respData
  }

}

async function get302URL(resObj) {
  try {
    let z = 1
    while (z <= 6) {
      if (z >= 2) {
        printYellow(`获取失败,正在第${z - 1}次重试`)
      }
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        printRed("请求超时")
      }, 6000);
      const obj = await fetch(`${resObj.url}`, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal
      }).catch(err => {
        clearTimeout(timeoutId);
        console.log(err)
      })
      clearTimeout(timeoutId);
      const location = obj.headers.get("Location")

      if (location != "" && location != undefined && location != null) {
        if (!location.startsWith("http://bofang")) {
          return location
        }
      }
      if (z != 6) {
        await delay(150)
      }
      z++
    }
  } catch (error) {
    console.log(error)
  }
  printRed(`获取失败,返回原链接`)
  return ""
}

function printLoginInfo(resObj) {
  if (resObj.content.body?.auth?.logined) {
    printGreen("登录认证成功")
    if (resObj.content.body.auth.authResult == "FAIL") {
      printRed(`认证失败 视频内容不完整 可能缺少相关VIP: ${resObj.content.body.auth.resultDesc}`)
    }
  } else {
    printYellow("未登录")
  }
}

export { getAndroidURL, getAndroidURL720p, get302URL, printLoginInfo }
