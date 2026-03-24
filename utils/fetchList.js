import { customMergeCategory, mergeTVCategory } from "../config.js"
import { fetchUrl } from "./net.js"

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}


// cates 大致结构
// [
//   {
//     name: '央视',
//     vomsID: '',
//     fitArea: ['10000'],
//     dataList: [
//       {
//         name: 'CCTV1综合',
//         pID: '6'
//       }
//     ]
//   }
// ]
// 合并分类
function mergeCategory(cates) {
  const processCategory = []
  const otherCategory = {
    name: '其他',
    vomsID: '',
    fitArea: ['10000'],
    dataList: []
  }
  if (mergeTVCategory !== "false") {

    for (const cate of cates) {
      if (cate.dataList.length <= 11) {
        for (const data of cate.dataList) {
          otherCategory.dataList.push(data)
        }

      } else {
        processCategory.push(cate)

      }
    }
    processCategory.push(otherCategory)
  } else if (customMergeCategory !== null) {
    const customMergeCategorySet = new Set()

    if (customMergeCategory.indexOf(",") !== -1) {
      const customMergeCategorySplit = customMergeCategory.split(",")
      for (const categoryString of customMergeCategorySplit) {
        if (categoryString != "") {
          if (!customMergeCategorySet.has(categoryString)) {
            customMergeCategorySet.add(categoryString)
          }
        }
      }
    } else if (customMergeCategory.indexOf("，") !== -1) {
      const customMergeCategorySplit = customMergeCategory.split("，")
      for (const categoryString of customMergeCategorySplit) {
        if (categoryString != "") {
          if (!customMergeCategorySet.has(categoryString)) {
            customMergeCategorySet.add(categoryString)
          }
        }
      }
    } else {
      customMergeCategorySet.add(customMergeCategory)
    }

    for (const cate of cates) {
      if (customMergeCategorySet.has(cate.name)) {
        for (const data of cate.dataList) {
          otherCategory.dataList.push(data)
        }

      } else {
        processCategory.push(cate)

      }
    }
    processCategory.push(otherCategory)
  }
  if (processCategory.length === 0) {
    return cates
  }
  return processCategory
}

// 获取分类集合
async function cateList() {
  const resp = await fetchUrl("https://program-sc.miguvideo.com/live/v2/tv-data/1ff892f2b5ab4a79be6e25b69d2f5d05")
  let liveList = resp.body.liveList
  // 热门内容重复
  liveList = liveList.filter(item => {
    return item.name != "热门"
  })

  // 央视作为首个分类
  liveList.sort((a, b) => {
    if (a.name === "央视") return -1;
    if (b.name === "央视") return 1
    return 0
  })

  return liveList
}

// 所有数据
async function dataList() {
  let cates = await cateList()

  for (let cate in cates) {
    try {
      const resp = await fetchUrl("https://program-sc.miguvideo.com/live/v2/tv-data/" + cates[cate].vomsID)
      cates[cate].dataList = resp.body.dataList
    } catch (error) {
      cates[cate].dataList = [];
    }
  }

  // 去除重复节目
  cates = uniqueData(cates)
  // 合并分类
  if (!mergeTVCategory !== "false") {
    cates = mergeCategory(cates)
  }
  // console.dir(cates, { depth: null })
  // console.log(cates)
  return cates
}

// 对data的dataList去重
function uniqueData(liveList) {

  const allItems = []
  // 提取全部dataList
  liveList.forEach(category => {
    category.dataList.forEach(program => {

      allItems.push({
        ...program,
        categoryName: category.name
      })
    })

  })

  // 使用set确保唯一
  const set = new Set()
  // 保存唯一的数据
  const uniqueItem = []

  allItems.forEach(item => {
    // set用来确定已经出现过
    if (!set.has(item.name)) {
      set.add(item.name)
      uniqueItem.push(item)
    }
  })

  const categoryMap = []

  // 清空原dataList内容
  liveList.forEach(live => {
    live.dataList = []
    categoryMap[live.name] = []
  })

  // 去除添加字段，根据分类填充内容
  uniqueItem.forEach(item => {
    const { categoryName, ...program } = item
    categoryMap[categoryName].push(program)
  })

  // liveList赋值
  liveList.forEach(live => {
    live.dataList = categoryMap[live.name]
  })

  return liveList
}

export { cateList, dataList, delay }
