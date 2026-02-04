// 爆款模板数据
export const HOT_TEMPLATES = [
  // 美妆护肤
  {
    id: '1',
    name: '平价护肤好物',
    contentType: 'zhongcao',
    category: 'beauty',
    titleTemplate: '💰学生党必入！{product}平价替代，{效果}效果绝了',
    contentTemplate: `姐妹们！今天必须给你们安利这个{product}！

🌟 使用感受
{使用体验描述}

💡 适合人群
{适合肤质/人群}

📝 使用方法
{具体用法}

💰 价格：{价格}
真的是白菜价好物！

用了{时间}，效果真的肉眼可见！
快冲！`,
    isHot: true,
  },
  {
    id: '2',
    name: '护肤步骤教程',
    contentType: 'tutorial',
    category: 'beauty',
    titleTemplate: '🔥护肤小白必看！{n}步搞定{肤质}护肤，{效果}',
    contentTemplate: `救命！这套护肤流程真的太有效了！

作为{肤质}，我摸索了很久终于找到适合自己的护肤步骤👇

🧴 第一步：{步骤1}
{详细说明}

🧴 第二步：{步骤2}
{详细说明}

🧴 第三步：{步骤3}
{详细说明}

坚持{时间}，皮肤状态肉眼可见变好！

姐妹们快试试！`,
    isHot: true,
  },
  // 美食探店
  {
    id: '3',
    name: '探店美食推荐',
    contentType: 'zhongcao',
    category: 'food',
    titleTemplate: '📍{城市}探店｜这家{店名}绝了！{特色}',
    contentTemplate: `终于吃到这家超火的{店名}了！

📍 地址：{地址}
💰 人均：{价格}
⏰ 营业时间：{时间}

🍽️ 必点推荐：
1️⃣ {菜品1}：{描述}
2️⃣ {菜品2}：{描述}
3️⃣ {菜品3}：{描述}

环境{环境描述}，出片率超高！

⚠️ Tips：
{注意事项}

强烈推荐！`,
    isHot: true,
  },
  {
    id: '4',
    name: '美食教程',
    contentType: 'tutorial',
    category: 'food',
    titleTemplate: '🍳{难度}教程｜{菜品名}这样做，{效果}',
    contentTemplate: `今天教大家做{菜品名}！

零失败！小白也能轻松上手👩‍🍳

📝 食材准备：
{食材列表}

👨‍🍳 制作步骤：
1️⃣ {步骤1}
2️⃣ {步骤2}
3️⃣ {步骤3}
4️⃣ {步骤4}

💡 小Tips：
{注意事项}

做出来真的太香了！家人都夸！`,
    isHot: true,
  },
  // 穿搭时尚
  {
    id: '5',
    name: '日常穿搭分享',
    contentType: 'life',
    category: 'fashion',
    titleTemplate: '👗{风格}穿搭｜{身材}女生这样穿，{效果}',
    contentTemplate: `今日穿搭分享💃

🎀 整体风格：{风格}

👚 上衣：{品牌/店铺} {价格}
👖 下装：{品牌/店铺} {价格}
👟 鞋子：{品牌/店铺} {价格}
👜 包包：{品牌/店铺} {价格}

💡 穿搭心得：
{搭配技巧}

这套真的很显{效果}！
{身材}姐妹可以直接抄作业！`,
    isHot: true,
  },
  // 旅行出游
  {
    id: '6',
    name: '旅行攻略',
    contentType: 'tutorial',
    category: 'travel',
    titleTemplate: '✈️{目的地}旅行攻略｜{天数}天{人均}玩转{景点}',
    contentTemplate: `{目的地}旅行归来！整理了这份超详细攻略📝

🗓️ 行程安排：
Day1：{行程1}
Day2：{行程2}
Day3：{行程3}

🏨 住宿推荐：
{住宿信息}

🍜 美食推荐：
{美食推荐}

💰 费用明细：
交通：{费用}
住宿：{费用}
餐饮：{费用}
门票：{费用}
合计：{总费用}

📸 拍照打卡点：
{打卡点}

⚠️ 注意事项：
{注意事项}

这趟旅行真的太值了！`,
    isHot: true,
  },
  // 健身运动
  {
    id: '7',
    name: '健身打卡',
    contentType: 'life',
    category: 'fitness',
    titleTemplate: '💪健身{时间}｜{效果}，附{部位}训练计划',
    contentTemplate: `健身打卡Day{n}💪

今天练的是{部位}！

🏋️ 训练内容：
1️⃣ {动作1} x {组数}组 x {次数}次
2️⃣ {动作2} x {组数}组 x {次数}次
3️⃣ {动作3} x {组数}组 x {次数}次
4️⃣ {动作4} x {组数}组 x {次数}次

⏱️ 训练时长：{时长}
🔥 消耗热量：约{卡路里}kcal

💡 今日感受：
{训练感受}

坚持就是胜利！一起加油！`,
    isHot: false,
  },
  // 数码科技
  {
    id: '8',
    name: '数码产品测评',
    contentType: 'zhongcao',
    category: 'tech',
    titleTemplate: '📱{产品}深度测评｜用了{时间}，{结论}',
    contentTemplate: `{产品}使用{时间}真实测评！

📦 开箱体验：
{开箱描述}

⭐ 优点：
✅ {优点1}
✅ {优点2}
✅ {优点3}

❌ 缺点：
{缺点1}
{缺点2}

💰 购买渠道：{渠道}
💵 入手价格：{价格}

🎯 适合人群：
{适合人群}

总结：{总体评价}

有问题评论区问我！`,
    isHot: true,
  },
]

// 根据类型和分类获取模板
export function getTemplates(contentType?: string, category?: string) {
  return HOT_TEMPLATES.filter((t) => {
    if (contentType && t.contentType !== contentType) return false
    if (category && t.category !== category) return false
    return true
  })
}

// 获取热门模板
export function getHotTemplates() {
  return HOT_TEMPLATES.filter((t) => t.isHot)
}
